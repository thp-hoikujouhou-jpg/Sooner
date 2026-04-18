import express from "express";
import type { Request, Response } from "express";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import { exec, execFile, spawn, ChildProcess } from "child_process";
import cors from "cors";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import * as esbuild from "esbuild";
import dotenv from "dotenv";
import http from "http";
import crypto from "crypto";
import admin from "firebase-admin";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Firebase Admin SDK Initialization ---
let firebaseStorage: admin.storage.Storage | null = null;
let firebaseAuth: admin.auth.Auth | null = null;
let firebaseDb: admin.firestore.Firestore | null = null;
const STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || "";

try {
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;

  let serviceAccount: any = null;
  if (serviceAccountBase64) {
    serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, "base64").toString("utf-8"));
  } else if (serviceAccountJson) {
    serviceAccount = JSON.parse(serviceAccountJson);
  } else if (serviceAccountPath) {
    const serviceAccountFull = path.resolve(process.cwd(), serviceAccountPath);
    serviceAccount = JSON.parse(await fs.readFile(serviceAccountFull, "utf-8"));
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: STORAGE_BUCKET,
    });
    firebaseStorage = admin.storage();
    firebaseAuth = admin.auth();
    firebaseDb = admin.firestore();
    console.log("Firebase Admin SDK initialized (Storage: " + STORAGE_BUCKET + ")");
  } else {
    console.log("Firebase Admin SDK not configured — running in local-only mode");
  }
} catch (e: any) {
  console.warn("Firebase Admin SDK init failed (running in local-only mode):", e.message);
}

// --- Storage Helper Functions ---
function storagePath(uid: string, projectName: string, filePath?: string): string {
  const base = `users/${uid}/projects/${projectName}`;
  return filePath ? `${base}/${filePath}` : base;
}

async function storageUpload(uid: string, project: string, filePath: string, content: string): Promise<void> {
  if (!firebaseStorage) return;
  const bucket = firebaseStorage.bucket();
  const file = bucket.file(storagePath(uid, project, filePath));
  await file.save(content, { contentType: "text/plain", metadata: { cacheControl: "no-cache" } });
}

async function storageDownload(uid: string, project: string, filePath: string): Promise<string | null> {
  if (!firebaseStorage) return null;
  try {
    const bucket = firebaseStorage.bucket();
    const file = bucket.file(storagePath(uid, project, filePath));
    const [buffer] = await file.download();
    return buffer.toString("utf-8");
  } catch {
    return null;
  }
}

async function storageDelete(uid: string, project: string, filePath?: string): Promise<void> {
  if (!firebaseStorage) return;
  const bucket = firebaseStorage.bucket();
  if (filePath) {
    try { await bucket.file(storagePath(uid, project, filePath)).delete(); } catch {}
  } else {
    const prefix = storagePath(uid, project) + "/";
    const [files] = await bucket.getFiles({ prefix });
    if (files.length > 0) {
      await Promise.all(files.map(f => f.delete().catch(() => {})));
    }
  }
}

async function storageListProjects(uid: string): Promise<string[]> {
  if (!firebaseStorage) return [];
  const bucket = firebaseStorage.bucket();
  const prefix = `users/${uid}/projects/`;
  const [files] = await bucket.getFiles({ prefix, delimiter: "/" });
  const prefixes = new Set<string>();
  // Files returned with prefix filtering — extract project names from file paths
  for (const file of files) {
    const rel = file.name.slice(prefix.length);
    const projectName = rel.split("/")[0];
    if (projectName) prefixes.add(projectName);
  }
  return Array.from(prefixes);
}

async function storageListFiles(uid: string, project: string): Promise<string[]> {
  if (!firebaseStorage) return [];
  const bucket = firebaseStorage.bucket();
  const prefix = storagePath(uid, project) + "/";
  const [files] = await bucket.getFiles({ prefix });
  return files.map(f => f.name.slice(prefix.length)).filter(Boolean);
}

// --- Auth Middleware ---
async function extractUid(req: express.Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ") || !firebaseAuth) return null;
  try {
    const token = authHeader.slice(7);
    const decoded = await firebaseAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

// Sync all files from Storage to local cache for a project
async function syncProjectToLocal(uid: string, project: string, localDir: string): Promise<void> {
  if (!firebaseStorage) return;
  const files = await storageListFiles(uid, project);
  for (const filePath of files) {
    const content = await storageDownload(uid, project, filePath);
    if (content !== null) {
      const fullPath = path.join(localDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, "utf-8");
    }
  }
}

function execGit(
  cwd: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    execFile("git", args, { cwd, maxBuffer: 10 * 1024 * 1024, timeout: 120000 }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout?.toString() ?? "",
        stderr: stderr?.toString() ?? "",
        code: error ? 1 : 0,
      });
    });
  });
}

function safePath(base: string, ...segments: string[]): string | null {
  const resolved = path.resolve(base, ...segments);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    return null;
  }
  return resolved;
}

function isValidName(name: string): boolean {
  if (!name || name.length > 255) return false;
  if (name.includes("..") || name.includes("/") || name.includes("\\") || name.includes("\0")) return false;
  if (name.startsWith(".") || name.trim() !== name) return false;
  return true;
}

/** Relative path under a project bucket (no leading slash, no `..`). */
function safeStorageRelPath(rel: string): boolean {
  if (typeof rel !== "string" || rel.length === 0 || rel.length > 2048) return false;
  const n = rel.replace(/\\/g, "/").replace(/^\/+/, "");
  if (n.includes("\0") || n.split("/").some((p) => p === "..")) return false;
  return true;
}

/** Delete all Storage objects under `relPrefix/` (folder). Returns count deleted (best effort). */
async function storageDeletePrefix(uid: string, project: string, relPrefix: string): Promise<number> {
  if (!firebaseStorage) return 0;
  const normalized = relPrefix.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
  if (!normalized || !safeStorageRelPath(normalized)) return 0;
  const bucket = firebaseStorage.bucket();
  const objectPrefix = `${storagePath(uid, project, normalized)}/`;
  const [files] = await bucket.getFiles({ prefix: objectPrefix });
  if (files.length === 0) return 0;
  const chunkSize = 80;
  let deleted = 0;
  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize);
    await Promise.all(chunk.map((f) => f.delete().catch(() => {})));
    deleted += chunk.length;
  }
  return deleted;
}

async function refreshLocalProjectFromCloud(uid: string, project: string, projectsRoot: string): Promise<void> {
  if (!firebaseStorage) return;
  const projectPath = safePath(projectsRoot, project);
  if (!projectPath) return;
  await fs.rm(projectPath, { recursive: true, force: true });
  await fs.mkdir(projectPath, { recursive: true });
  await syncProjectToLocal(uid, project, projectPath);
}

async function renameStorageEntry(uid: string, project: string, oldRel: string, newRel: string): Promise<void> {
  if (!firebaseStorage) throw new Error("Storage not configured");
  const o = oldRel.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
  const n = newRel.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
  if (!o || !n || !safeStorageRelPath(o) || !safeStorageRelPath(n)) throw new Error("Invalid path");
  if (o === ".sooner_project" || n === ".sooner_project") throw new Error("Reserved path");
  if (n === o) return;
  if (n.startsWith(`${o}/`) || o.startsWith(`${n}/`)) throw new Error("Invalid rename");
  const paths = await storageListFiles(uid, project);
  const affected = paths.filter((p) => p === o || p.startsWith(`${o}/`));
  if (affected.length === 0) throw new Error("Nothing to rename");
  affected.sort((a, b) => a.length - b.length);
  for (const p of affected) {
    const dest = n + (p.length === o.length ? "" : p.slice(o.length));
    const content = await storageDownload(uid, project, p);
    if (content !== null) await storageUpload(uid, project, dest, content);
  }
  affected.sort((a, b) => b.length - a.length);
  for (const p of affected) {
    await storageDelete(uid, project, p);
  }
}

/** Public base URL for links returned by the API (preview issuance). */
function publicServerOrigin(req: Request): string {
  const explicit = process.env.PUBLIC_PREVIEW_ORIGIN?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const xfProto = req.headers["x-forwarded-proto"];
  const proto =
    (typeof xfProto === "string" ? xfProto.split(",")[0] : Array.isArray(xfProto) ? xfProto[0] : undefined)?.trim() ||
    req.protocol;
  const xfHost = req.headers["x-forwarded-host"];
  const host =
    (typeof xfHost === "string" ? xfHost.split(",")[0] : Array.isArray(xfHost) ? xfHost[0] : undefined)?.trim() ||
    req.get("host") ||
    "localhost";
  return `${proto}://${host}`;
}

function cookieValue(req: Request, name: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

/** When set (16+ chars), `/preview/u/:uid/:id` requires a signed `?pt=` token or `spv` cookie. */
function previewUrlSecret(): string | null {
  const s = process.env.PREVIEW_URL_SECRET?.trim();
  return s && s.length >= 16 ? s : null;
}

function mintPreviewToken(uid: string, projectId: string, ttlSec: number): string {
  const secret = previewUrlSecret()!;
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = Buffer.from(JSON.stringify({ uid, pid: projectId, exp })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifyPreviewToken(
  token: string | null | undefined,
  projectId: string,
  urlUid?: string
): { uid: string } | null {
  const secret = previewUrlSecret();
  if (!secret || !token) return null;
  const last = token.lastIndexOf(".");
  if (last <= 0) return null;
  const payload = token.slice(0, last);
  const sig = token.slice(last + 1);
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  try {
    const a = Buffer.from(sig, "base64url");
    const b = Buffer.from(expected, "base64url");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      uid?: string;
      pid?: string;
      exp?: number;
    };
    if (data.pid !== projectId || typeof data.uid !== "string" || typeof data.exp !== "number") return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    if (urlUid && data.uid !== urlUid) return null;
    return { uid: data.uid };
  } catch {
    return null;
  }
}

function setSpvCookie(res: Response, ownerUid: string, projectId: string, token: string) {
  const ttlRaw = parseInt(process.env.PREVIEW_URL_TTL_SEC || "3600", 10);
  const maxAge = Number.isFinite(ttlRaw) ? Math.min(Math.max(ttlRaw, 60), 86400) : 3600;
  const p = `/preview/u/${encodeURIComponent(ownerUid)}/${encodeURIComponent(projectId)}`;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.append("Set-Cookie", `spv=${encodeURIComponent(token)}; Path=${p}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`);
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  const cmsImageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
  });

  const prodOrigins = [
    "https://sooner.sh",
    "https://www.sooner.sh",
    "https://lp.sooner.sh",
    "https://blog.sooner.sh",
    "https://cms.sooner.sh",
  ];
  const railwayHost = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (railwayHost) prodOrigins.push(`https://${railwayHost}`);

  app.use(cors({
    origin: process.env.NODE_ENV === "production" ? prodOrigins : true,
    credentials: true,
  }));
  app.use(bodyParser.json({ limit: "32mb" }));

  const PROJECTS_ROOT = path.resolve(process.cwd(), "projects");

  try {
    await fs.mkdir(PROJECTS_ROOT, { recursive: true });
  } catch (e) {
    console.error("Failed to create projects directory:", e);
    process.exit(1);
  }

  /** Firebase Auth uid — restrict to safe path segment (no traversal). */
  function sanitizeUidForFs(uid: string): string | null {
    if (!uid || uid.length > 128) return null;
    if (!/^[a-zA-Z0-9]+$/.test(uid)) return null;
    return uid;
  }

  /** Per-user workspace root: `projects/u/<uid>/`. */
  function userDirFromUid(uid: string): string | null {
    const s = sanitizeUidForFs(uid);
    if (!s) return null;
    const full = path.join(PROJECTS_ROOT, "u", s);
    const resolved = path.resolve(full);
    const rootResolved = path.resolve(PROJECTS_ROOT);
    if (!resolved.startsWith(rootResolved + path.sep)) return null;
    return resolved;
  }

  function projectFsPath(uid: string | null, projectId: string): string | null {
    if (!uid) return null;
    const base = userDirFromUid(uid);
    if (!base) return null;
    return safePath(base, projectId);
  }

  async function ensureUserSandbox(uid: string): Promise<boolean> {
    const base = userDirFromUid(uid);
    if (!base) return false;
    await fs.mkdir(base, { recursive: true });
    return true;
  }

  /** Dev servers keyed per Firebase user + project (avoids cross-account collisions). */
  function workspaceRunKey(uid: string, projectId: string): string {
    return `${uid}::${projectId}`;
  }

  /** Same URL shape as push/pull: embed token for HTTPS GitHub clone (OAuth + PAT). */
  function toGithubHttpsUrlWithToken(repoUrl: string, token: string): string | null {
    const u = repoUrl.trim();
    if (u.startsWith("https://github.com/")) {
      return u.replace("https://", `https://x-access-token:${token}@`);
    }
    if (u.startsWith("git@github.com:")) {
      const m = u.match(/^git@github\.com:([^/]+)\/(.+?)(\.git)?$/);
      if (m) {
        return `https://x-access-token:${token}@github.com/${m[1]}/${m[2].replace(/\.git$/, "")}.git`;
      }
    }
    return null;
  }

  async function ensureProjectPath(uid: string | null, id: string): Promise<string | null> {
    if (!uid) return null;
    await ensureUserSandbox(uid);
    const projectPath = projectFsPath(uid, id);
    if (!projectPath) return null;
    let existed = true;
    try {
      await fs.access(projectPath);
    } catch {
      existed = false;
      await fs.mkdir(projectPath, { recursive: true });
    }
    await syncProjectToLocal(uid, id, projectPath);
    return projectPath;
  }

  // --- API Routes ---

  // GitHub Clone (HTTPS URL with embedded token — same as git push/pull; Basic extraheader breaks OAuth tokens on many hosts)
  app.post("/api/projects/clone", async (req, res) => {
    const { repoUrl, name, token } = req.body;
    if (!repoUrl || !name) return res.status(400).json({ error: "Repo URL and name required" });

    if (!isValidName(name)) {
      return res.status(400).json({ error: "Invalid project name" });
    }

    const uid = await extractUid(req);
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    await ensureUserSandbox(uid);
    const projectPath = projectFsPath(uid, name);
    if (!projectPath) {
      return res.status(400).json({ error: "Invalid project name" });
    }

    let cloneUrl = String(repoUrl).trim();
    const tok = typeof token === "string" ? token.trim() : "";
    if (tok) {
      const authed = toGithubHttpsUrlWithToken(cloneUrl, tok);
      if (authed) cloneUrl = authed;
    }

    try {
      await fs.access(projectPath);
      await fs.rm(projectPath, { recursive: true, force: true });
    } catch {
      /* path did not exist */
    }

    const args = ["clone", "--", cloneUrl, projectPath];

    execFile("git", args, { timeout: 120000, maxBuffer: 10 * 1024 * 1024 }, async (error, stdout, stderr) => {
      if (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === "ENOENT") {
          return res.status(500).json({
            error: "Failed to clone repo",
            details: "git executable not found. Install git on the server (e.g. nixpacks aptPkgs: git).",
          });
        }
        const details = [stderr, stdout].filter(Boolean).join("\n").trim() || err.message || String(error);
        return res.status(500).json({ error: "Failed to clone repo", details });
      }
      // Sync cloned files to Storage
      if (uid) {
        try {
          const allFiles = await getAllFilesRecursive(projectPath);
          for (const rel of allFiles) {
            const content = await fs.readFile(path.join(projectPath, rel), "utf-8");
            await storageUpload(uid, name, rel, content);
          }
        } catch {}
      }
      res.json({ message: "Project cloned", name });
    });
  });

  // Recursively get all file paths relative to a directory
  async function getAllFilesRecursive(dir: string, base: string = ""): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const results: string[] = [];
    for (const entry of entries) {
      const rel = base ? `${base}/${entry.name}` : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      if (entry.isDirectory()) {
        results.push(...await getAllFilesRecursive(full, rel));
      } else {
        results.push(rel);
      }
    }
    return results;
  }

  // File Upload
  app.post("/api/projects/:id/upload", async (req, res) => {
    const { id } = req.params;
    const { fileName, content } = req.body;
    if (!fileName) return res.status(400).json({ error: "File name required" });

    const uid = await extractUid(req);
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const projRoot = projectFsPath(uid, id);
    const fullPath = projRoot ? safePath(projRoot, fileName) : null;
    if (!fullPath) {
      return res.status(400).json({ error: "Invalid file path" });
    }
    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, "utf-8");
      if (uid) await storageUpload(uid, id, fileName, content);
      res.json({ message: "File uploaded" });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // List projects — per-user local sandbox + cloud (never list other users' workspace dirs)
  app.get("/api/projects", async (req, res) => {
    try {
      const uid = await extractUid(req);
      if (!uid) {
        return res.json([]);
      }
      const cloudProjects = await storageListProjects(uid);
      let localProjects: string[] = [];
      const udir = userDirFromUid(uid);
      if (udir) {
        try {
          localProjects = await fs.readdir(udir);
        } catch {
          localProjects = [];
        }
      }
      const merged = new Set([...localProjects, ...cloudProjects]);
      return res.json(Array.from(merged));
    } catch (error) {
      res.status(500).json({ error: "Failed to list projects" });
    }
  });

  // Create project
  app.post("/api/projects", async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Project name required" });

    if (!isValidName(name)) {
      return res.status(400).json({ error: "Invalid project name" });
    }

    const uid = await extractUid(req);
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    await ensureUserSandbox(uid);
    const projectPath = projectFsPath(uid, name);
    if (!projectPath) {
      return res.status(400).json({ error: "Invalid project name" });
    }

    try {
      await fs.mkdir(projectPath, { recursive: true });
      // Create a marker file in Storage so the project appears in listings
      if (uid) await storageUpload(uid, name, ".sooner_project", JSON.stringify({ created: new Date().toISOString() }));
      res.json({ message: "Project created", name });
    } catch (error) {
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  // Delete project
  app.delete("/api/projects/:id", async (req, res) => {
    const { id } = req.params;
    const uid = await extractUid(req);
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const projectPath = projectFsPath(uid, id);
    if (!projectPath) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    try {
      await fs.rm(projectPath, { recursive: true, force: true });
      if (uid) await storageDelete(uid, id);
      res.json({ message: "Project deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Delete file
  app.delete("/api/projects/:id/file", async (req, res) => {
    const { id } = req.params;
    const { filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: "File path required" });
    if (!safeStorageRelPath(String(filePath))) {
      return res.status(400).json({ error: "Invalid file path" });
    }

    const uid = await extractUid(req);
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const projRoot = projectFsPath(uid, id);
    const fullPath = projRoot ? safePath(projRoot, filePath) : null;
    if (!fullPath) {
      return res.status(400).json({ error: "Invalid file path" });
    }

    try {
      try {
        await fs.unlink(fullPath);
      } catch {
        /* file may exist only in Storage */
      }
      await storageDelete(uid, id, filePath);
      res.json({ message: "File deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  /** Delete every object under a folder prefix in Storage (Admin). Faster than many client `deleteObject` calls. */
  app.post("/api/projects/:id/storage-delete-prefix", async (req, res) => {
    const { id } = req.params;
    const prefix = req.body?.prefix;
    if (!isValidName(id)) {
      return res.status(400).json({ error: "Invalid project id" });
    }
    if (typeof prefix !== "string" || !safeStorageRelPath(prefix)) {
      return res.status(400).json({ error: "Invalid prefix" });
    }
    const uid = await extractUid(req);
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!firebaseStorage) {
      return res.status(503).json({ error: "Storage not configured" });
    }
    try {
      const n = await storageDeletePrefix(uid, id, prefix);
      res.json({ deleted: n });
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  /** Fast flat file path list from Cloud Storage (Admin SDK). Avoids browser-side recursive `listAll`. */
  app.get("/api/projects/:id/storage-file-index", async (req, res) => {
    const { id } = req.params;
    if (!isValidName(id)) {
      return res.status(400).json({ error: "Invalid project id" });
    }
    const uid = await extractUid(req);
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!firebaseStorage) {
      return res.status(503).json({ error: "Storage not configured" });
    }
    try {
      let paths = await storageListFiles(uid, id);
      paths = paths.filter((p) => p && p !== ".sooner_project");
      res.json({ paths });
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  // List files in project — sync from cloud if local dir doesn't exist
  app.get("/api/projects/:id/files", async (req, res) => {
    const { id } = req.params;
    const uid = await extractUid(req);
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const projectPath = projectFsPath(uid, id);
    if (!projectPath) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    // If project doesn't exist locally but is in cloud, sync down
    try { await fs.access(projectPath); } catch {
      await fs.mkdir(projectPath, { recursive: true });
      await syncProjectToLocal(uid, id, projectPath);
    }

    async function getFiles(dir: string, base: string = ""): Promise<any[]> {
      let entries;
      try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return []; }
      const files = await Promise.all(entries.map(async (entry) => {
        const relativePath = base ? `${base}/${entry.name}` : entry.name;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === ".git") return null;
          return {
            name: entry.name,
            path: relativePath,
            type: "directory",
            children: await getFiles(fullPath, relativePath)
          };
        }
        return {
          name: entry.name,
          path: relativePath,
          type: "file"
        };
      }));
      return files.filter(Boolean);
    }

    try {
      const files = await getFiles(projectPath);
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to list files" });
    }
  });

  // Read file
  app.get("/api/projects/:id/file", async (req, res) => {
    const { id } = req.params;
    const { filePath } = req.query;
    if (typeof filePath !== "string") return res.status(400).json({ error: "File path required" });

    const uid = await extractUid(req);
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const projRoot = projectFsPath(uid, id);
    const fullPath = projRoot ? safePath(projRoot, filePath) : null;
    if (!fullPath) {
      return res.status(400).json({ error: "Invalid file path" });
    }

    try {
      const content = await fs.readFile(fullPath, "utf-8");
      res.json({ content });
    } catch {
      // Try cloud fallback
      if (uid) {
        const cloudContent = await storageDownload(uid, id, filePath);
        if (cloudContent !== null) {
          // Cache locally
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, cloudContent, "utf-8");
          return res.json({ content: cloudContent });
        }
      }
      res.status(500).json({ error: "Failed to read file" });
    }
  });

  // Write file — saves locally AND to Storage
  app.post("/api/projects/:id/file", async (req, res) => {
    const { id } = req.params;
    const { filePath, content } = req.body;
    if (!filePath) return res.status(400).json({ error: "File path required" });

    const uid = await extractUid(req);
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const projRoot = projectFsPath(uid, id);
    const fullPath = projRoot ? safePath(projRoot, filePath) : null;
    if (!fullPath) {
      return res.status(400).json({ error: "Invalid file path" });
    }

    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, "utf-8");
      // Async sync to cloud — don't block the response
      if (uid) storageUpload(uid, id, filePath, content).catch(() => {});
      res.json({ message: "File saved" });
    } catch (error) {
      res.status(500).json({ error: "Failed to write file" });
    }
  });

  /** Pull latest files from Firebase Storage into the server workspace (cross-device sync). */
  app.post("/api/projects/:id/sync-from-storage", async (req, res) => {
    const { id } = req.params;
    if (!isValidName(id)) {
      return res.status(400).json({ error: "Invalid project id" });
    }
    const uid = await extractUid(req);
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!firebaseStorage) {
      return res.status(503).json({ error: "Storage not configured" });
    }
    const projectPath = projectFsPath(uid, id);
    if (!projectPath) {
      return res.status(400).json({ error: "Invalid path" });
    }
    try {
      await fs.mkdir(projectPath, { recursive: true });
      await syncProjectToLocal(uid, id, projectPath);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  /** Issue the canonical preview URL for this project (optional signed `?pt=` when PREVIEW_URL_SECRET is set). */
  app.get("/api/projects/:id/preview-url", async (req, res) => {
    const { id } = req.params;
    if (!isValidName(id)) {
      return res.status(400).json({ error: "Invalid project id" });
    }
    const uid = await extractUid(req);
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let allowed = false;
    if (firebaseStorage) {
      const hasMarker = (await storageDownload(uid, id, ".sooner_project")) !== null;
      const files = await storageListFiles(uid, id);
      allowed = hasMarker || files.length > 0;
    } else {
      const projectPath = projectFsPath(uid, id);
      if (projectPath) {
        try {
          await fs.access(projectPath);
          allowed = true;
        } catch {
          allowed = false;
        }
      }
    }
    if (!allowed) {
      return res.status(404).json({ error: "Project not found for this account" });
    }

    const origin = publicServerOrigin(req);
    const base = `${origin}/preview/u/${encodeURIComponent(uid)}/${encodeURIComponent(id)}/`;
    const secret = previewUrlSecret();
    const ttlRaw = parseInt(process.env.PREVIEW_URL_TTL_SEC || "3600", 10);
    const ttl = Number.isFinite(ttlRaw) ? Math.min(Math.max(ttlRaw, 60), 86400) : 3600;
    const url = secret ? `${base}?pt=${encodeURIComponent(mintPreviewToken(uid, id, ttl))}` : base;
    res.json({
      url,
      expiresInSeconds: secret ? ttl : null,
      previewAuth: secret ? "signed" : "open",
      disclaimer:
        "Sooner preview uses dev-time transpilation and may differ from production web/mobile builds. Validate with npm run build, vite build, or flutter build web before shipping.",
    });
  });

  /** Rename a file or folder (Storage + local workspace). */
  app.post("/api/projects/:id/rename-path", async (req, res) => {
    const { id } = req.params;
    if (!isValidName(id)) {
      return res.status(400).json({ error: "Invalid project id" });
    }
    const uid = await extractUid(req);
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const norm = (p: string) => p.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
    const oldPath = typeof req.body?.oldPath === "string" ? norm(req.body.oldPath) : "";
    const newPath = typeof req.body?.newPath === "string" ? norm(req.body.newPath) : "";
    if (!oldPath || !newPath) {
      return res.status(400).json({ error: "oldPath and newPath required" });
    }
    try {
      await renameStorageEntry(uid, id, oldPath, newPath);
      const udir = userDirFromUid(uid);
      if (udir) await refreshLocalProjectFromCloud(uid, id, udir);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ error: String(e?.message || e) });
    }
  });

  /** GitHub HTTPS URL with x-access-token for pull/push over HTTPS. */
  function toGithubTokenUrl(remoteUrl: string, token: string): string | null {
    const u = remoteUrl.trim();
    if (u.startsWith("https://github.com/")) {
      return u.replace("https://", `https://x-access-token:${token}@`);
    }
    if (u.startsWith("git@github.com:")) {
      const m = u.match(/^git@github\.com:([^/]+)\/(.+?)(\.git)?$/);
      if (m) {
        return `https://x-access-token:${token}@github.com/${m[1]}/${m[2].replace(/\.git$/, "")}.git`;
      }
    }
    return null;
  }

  // Git: status (syncs latest from Storage first when authenticated)
  app.get("/api/projects/:id/git/status", async (req, res) => {
    const { id } = req.params;
    const uid = await extractUid(req);
    const projectPath = await ensureProjectPath(uid, id);
    if (!projectPath) {
      return res.status(404).json({ error: "Project not found" });
    }
    try {
      await fs.access(path.join(projectPath, ".git"));
    } catch {
      return res.json({ isRepo: false, message: "Not a git repository (clone a repo or run git init locally)." });
    }
    const branchOut = await execGit(projectPath, ["rev-parse", "--abbrev-ref", "HEAD"]);
    const branch = branchOut.stdout.trim() || "HEAD";
    const porcelain = await execGit(projectPath, ["status", "--porcelain=v1", "-b"]);
    const lines = porcelain.stdout.split("\n").filter(Boolean);
    let tracking: string | undefined;
    let ahead = 0;
    let behind = 0;
    const files: { path: string; status: string }[] = [];
    for (const line of lines) {
      if (line.startsWith("## ")) {
        const rest = line.slice(3).trim();
        const abMatch = rest.match(/\[([^\]]+)\]/);
        const branchPart = abMatch ? rest.slice(0, rest.indexOf("[")).trim() : rest;
        if (branchPart.includes("...")) {
          const idx = branchPart.indexOf("...");
          tracking = branchPart.slice(idx + 3) || undefined;
        }
        if (abMatch) {
          const ab = abMatch[1];
          const am = ab.match(/ahead (\d+)/);
          const bm = ab.match(/behind (\d+)/);
          if (am) ahead = parseInt(am[1], 10);
          if (bm) behind = parseInt(bm[1], 10);
        }
        continue;
      }
      if (line.length >= 4) {
        const status = line.slice(0, 2);
        const filePath = line.slice(3).trim();
        if (filePath) files.push({ path: filePath, status: status.trim() });
      }
    }
    let originUrl: string | undefined;
    const remoteOut = await execGit(projectPath, ["remote", "get-url", "origin"]);
    if (remoteOut.code === 0 && remoteOut.stdout.trim()) {
      originUrl = remoteOut.stdout.trim();
    }
    res.json({ isRepo: true, branch, tracking, ahead, behind, files, raw: porcelain.stdout, originUrl });
  });

  // Git: diff (unstaged or staged)
  app.get("/api/projects/:id/git/diff", async (req, res) => {
    const { id } = req.params;
    const staged = req.query.staged === "1" || req.query.staged === "true";
    const uid = await extractUid(req);
    const projectPath = await ensureProjectPath(uid, id);
    if (!projectPath) {
      return res.status(404).json({ error: "Project not found" });
    }
    try {
      await fs.access(path.join(projectPath, ".git"));
    } catch {
      return res.status(400).json({ error: "Not a git repository" });
    }
    const args = staged ? ["diff", "--cached"] : ["diff"];
    const out = await execGit(projectPath, args);
    res.json({ diff: out.stdout, stderr: out.stderr, code: out.code });
  });

  // Git: commit all changes (add -A + commit)
  app.post("/api/projects/:id/git/commit", async (req, res) => {
    const { id } = req.params;
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message) {
      return res.status(400).json({ error: "Commit message required" });
    }
    const uid = await extractUid(req);
    const projectPath = await ensureProjectPath(uid, id);
    if (!projectPath) {
      return res.status(404).json({ error: "Project not found" });
    }
    try {
      await fs.access(path.join(projectPath, ".git"));
    } catch {
      return res.status(400).json({ error: "Not a git repository" });
    }
    await execGit(projectPath, ["config", "user.email", "sooner@users.noreply.local"]);
    await execGit(projectPath, ["config", "user.name", "Sooner"]);
    const addOut = await execGit(projectPath, ["add", "-A"]);
    if (addOut.code !== 0) {
      return res.status(500).json({ error: "git add failed", details: addOut.stderr });
    }
    const commitOut = await execGit(projectPath, [
      "-c", "user.email=sooner@users.noreply.local",
      "-c", "user.name=Sooner",
      "commit",
      "-m",
      message,
    ]);
    if (commitOut.code !== 0 && !commitOut.stderr.includes("nothing to commit")) {
      return res.status(500).json({ error: "git commit failed", details: commitOut.stderr || commitOut.stdout });
    }
    res.json({
      message: commitOut.stderr.includes("nothing to commit") ? "Nothing to commit" : "Committed",
      output: commitOut.stdout + commitOut.stderr,
    });
  });

  // Git: push to origin (uses GitHub token in body for HTTPS)
  app.post("/api/projects/:id/git/push", async (req, res) => {
    const { id } = req.params;
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    if (!token) {
      return res.status(400).json({ error: "GitHub token required in body" });
    }
    const uid = await extractUid(req);
    const projectPath = await ensureProjectPath(uid, id);
    if (!projectPath) {
      return res.status(404).json({ error: "Project not found" });
    }
    try {
      await fs.access(path.join(projectPath, ".git"));
    } catch {
      return res.status(400).json({ error: "Not a git repository" });
    }
    const remote = await execGit(projectPath, ["remote", "get-url", "origin"]);
    if (remote.code !== 0 || !remote.stdout.trim()) {
      return res.status(400).json({ error: "No git remote 'origin' configured" });
    }
    const url = remote.stdout.trim();
    const pushUrl = toGithubTokenUrl(url, token);
    if (!pushUrl) {
      return res.status(400).json({ error: "Unsupported remote URL (use GitHub HTTPS or git@github.com)" });
    }
    const pushOut = await execGit(projectPath, ["push", pushUrl, "HEAD"]);
    if (pushOut.code !== 0) {
      return res.status(500).json({ error: "git push failed", details: pushOut.stderr || pushOut.stdout });
    }
    res.json({ message: "Pushed", output: pushOut.stdout + pushOut.stderr });
  });

  // Git: pull from origin (token for private repos; syncs pulled files to Storage)
  app.post("/api/projects/:id/git/pull", async (req, res) => {
    const { id } = req.params;
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    if (!token) {
      return res.status(400).json({ error: "GitHub token required in body" });
    }
    const uid = await extractUid(req);
    const projectPath = await ensureProjectPath(uid, id);
    if (!projectPath) {
      return res.status(404).json({ error: "Project not found" });
    }
    try {
      await fs.access(path.join(projectPath, ".git"));
    } catch {
      return res.status(400).json({ error: "Not a git repository" });
    }
    const remote = await execGit(projectPath, ["remote", "get-url", "origin"]);
    if (remote.code !== 0 || !remote.stdout.trim()) {
      return res.status(400).json({ error: "No git remote 'origin' configured" });
    }
    const url = remote.stdout.trim();
    const pullUrl = toGithubTokenUrl(url, token);
    if (!pullUrl) {
      return res.status(400).json({ error: "Unsupported remote URL (use GitHub HTTPS or git@github.com)" });
    }
    const pullOut = await execGit(projectPath, ["pull", pullUrl]);
    if (pullOut.code !== 0) {
      return res.status(500).json({ error: "git pull failed", details: pullOut.stderr || pullOut.stdout });
    }
    if (uid) {
      try {
        const allFiles = await getAllFilesRecursive(projectPath);
        for (const rel of allFiles) {
          const content = await fs.readFile(path.join(projectPath, rel), "utf-8");
          await storageUpload(uid, id, rel, content);
        }
      } catch (e) {
        console.warn("Storage sync after pull failed:", e);
      }
    }
    res.json({ message: "Pulled", output: pullOut.stdout + pullOut.stderr });
  });

  // Terminal execution
  app.post("/api/projects/:id/terminal", async (req, res) => {
    const { id } = req.params;
    const { command } = req.body;

    if (!command || typeof command !== "string") {
      return res.status(400).json({ error: "Command is required" });
    }

    const uid = await extractUid(req);
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const projectPath = projectFsPath(uid, id);
    if (!projectPath) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const cmdTrim = command.trim();
    const bodyTimeout = req.body?.timeoutMs;
    const defaultTimeout =
      /^flutter\s+build\s+web(\s|$)/i.test(cmdTrim) || /^flutter\s+run(\s|$)/i.test(cmdTrim)
        ? 480000
        : 30000;
    const timeoutMs =
      typeof bodyTimeout === "number" && bodyTimeout >= 5000 && bodyTimeout <= 900000
        ? bodyTimeout
        : defaultTimeout;

    exec(command, { cwd: projectPath, timeout: timeoutMs }, (error, stdout, stderr) => {
      res.json({
        stdout,
        stderr,
        exitCode: error ? (typeof error.code === "number" ? error.code : 1) : 0
      });
    });
  });

  // --- Square (sandbox / production via env; secrets never accepted from client) ---
  function squareBaseUrl(): string {
    return process.env.SQUARE_ENVIRONMENT === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";
  }

  async function squareApi<T = unknown>(path: string, method: string, body?: unknown): Promise<T> {
    const token = process.env.SQUARE_ACCESS_TOKEN?.trim();
    if (!token) {
      throw new Error("SQUARE_ACCESS_TOKEN is not set");
    }
    const res = await fetch(`${squareBaseUrl()}/v2${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "Square-Version": "2024-11-20",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as any;
    if (!res.ok) {
      const msg = Array.isArray(json?.errors)
        ? json.errors.map((e: any) => e?.detail || e?.code).join("; ")
        : json?.message || res.statusText;
      throw new Error(msg || `Square HTTP ${res.status}`);
    }
    return json as T;
  }

  app.get("/api/square/config", (_req, res) => {
    const applicationId = process.env.SQUARE_APPLICATION_ID?.trim();
    const locationId = process.env.SQUARE_LOCATION_ID?.trim();
    const accessToken = process.env.SQUARE_ACCESS_TOKEN?.trim();
    const planVariationId = process.env.SQUARE_PLAN_VARIATION_ID?.trim();
    const missing: string[] = [];
    if (!applicationId) missing.push("SQUARE_APPLICATION_ID");
    if (!locationId) missing.push("SQUARE_LOCATION_ID");
    if (!accessToken) missing.push("SQUARE_ACCESS_TOKEN");
    if (!planVariationId) missing.push("SQUARE_PLAN_VARIATION_ID");
    if (missing.length) {
      return res.status(503).json({
        error: "Square is not configured",
        missing,
        hint:
          "Set these on the Node process that runs server.ts (e.g. Railway Variables for the API service), save, then redeploy or restart. Names are case-sensitive.",
      });
    }
    res.json({
      applicationId,
      locationId,
      environment: process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox",
    });
  });

  app.post("/api/square/subscribe", async (req, res) => {
    try {
      const locationId = process.env.SQUARE_LOCATION_ID?.trim();
      const planVariationId = process.env.SQUARE_PLAN_VARIATION_ID?.trim();
      if (!locationId || !planVariationId) {
        return res.status(503).json({ error: "SQUARE_LOCATION_ID and SQUARE_PLAN_VARIATION_ID are required" });
      }

      const sourceId = typeof req.body?.sourceId === "string" ? req.body.sourceId.trim() : "";
      const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
      const givenName = typeof req.body?.givenName === "string" ? req.body.givenName.trim() : "Sooner";
      const familyName = typeof req.body?.familyName === "string" ? req.body.familyName.trim() : "Customer";
      if (!sourceId || !email) {
        return res.status(400).json({ error: "sourceId and email are required" });
      }

      const idem = () => crypto.randomUUID();

      const customerRes = await squareApi<{ customer?: { id?: string } }>("/customers", "POST", {
        idempotency_key: idem(),
        given_name: givenName,
        family_name: familyName,
        email_address: email,
      });
      const customerId = customerRes.customer?.id;
      if (!customerId) {
        return res.status(500).json({ error: "Square did not return customer id" });
      }

      const cardRes = await squareApi<{ card?: { id?: string } }>("/cards", "POST", {
        idempotency_key: idem(),
        source_id: sourceId,
        card: { customer_id: customerId },
      });
      const cardId = cardRes.card?.id;
      if (!cardId) {
        return res.status(500).json({ error: "Square did not return card id" });
      }

      const subRes = await squareApi<{ subscription?: { id?: string; status?: string } }>("/subscriptions", "POST", {
        idempotency_key: idem(),
        location_id: locationId,
        plan_variation_id: planVariationId,
        customer_id: customerId,
        card_id: cardId,
      });

      res.json({
        ok: true,
        subscriptionId: subRes.subscription?.id,
        status: subRes.subscription?.status,
        customerId,
        cardId,
      });
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  // Chat History Persistence (local + cloud)
  app.get("/api/projects/:id/chat", async (req, res) => {
    const { id } = req.params;
    const uid = await extractUid(req);
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const projectPath = projectFsPath(uid, id);
    if (!projectPath) {
      return res.status(400).json({ error: "Invalid project id" });
    }
    const chatPath = path.join(projectPath, ".sooner_chat.json");

    try {
      const content = await fs.readFile(chatPath, "utf-8");
      res.json(JSON.parse(content));
    } catch {
      if (uid) {
        const cloudContent = await storageDownload(uid, id, ".sooner_chat.json");
        if (cloudContent) {
          try { return res.json(JSON.parse(cloudContent)); } catch {}
        }
      }
      res.json([]);
    }
  });

  app.post("/api/projects/:id/chat", async (req, res) => {
    const { id } = req.params;
    const { messages } = req.body;
    const uid = await extractUid(req);
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const projectPath = projectFsPath(uid, id);
    if (!projectPath) {
      return res.status(400).json({ error: "Invalid project id" });
    }
    const chatPath = path.join(projectPath, ".sooner_chat.json");
    const data = JSON.stringify(messages, null, 2);

    try {
      await fs.writeFile(chatPath, data, "utf-8");
      if (uid) storageUpload(uid, id, ".sooner_chat.json", data).catch(() => {});
      res.json({ message: "Chat history saved" });
    } catch (e) {
      res.status(500).json({ error: "Failed to save chat history" });
    }
  });

  // Package management API
  app.get("/api/projects/:id/packages", async (req, res) => {
    const { id } = req.params;
    const uid = await extractUid(req);
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const projectPath = projectFsPath(uid, id);
    if (!projectPath) return res.status(400).json({ error: "Invalid project id" });
    try {
      const pkgPath = path.join(projectPath, "package.json");
      const content = JSON.parse(await fs.readFile(pkgPath, "utf-8"));
      res.json({ dependencies: content.dependencies || {}, devDependencies: content.devDependencies || {} });
    } catch {
      res.json({ dependencies: {}, devDependencies: {} });
    }
  });

  app.post("/api/projects/:id/packages", async (req, res) => {
    const { id } = req.params;
    const { name, version, dev } = req.body;
    const uid = await extractUid(req);
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const projectPath = projectFsPath(uid, id);
    if (!projectPath) return res.status(400).json({ error: "Invalid project id" });
    if (!name || typeof name !== "string") return res.status(400).json({ error: "Package name required" });
    try {
      const pkgPath = path.join(projectPath, "package.json");
      let pkg: any = { name: id, version: "1.0.0", dependencies: {}, devDependencies: {} };
      try { pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8")); } catch {}
      if (!pkg.dependencies) pkg.dependencies = {};
      if (!pkg.devDependencies) pkg.devDependencies = {};

      const field = dev ? "devDependencies" : "dependencies";
      pkg[field][name] = version || "latest";
      const data = JSON.stringify(pkg, null, 2);
      await fs.writeFile(pkgPath, data, "utf-8");
      if (uid) storageUpload(uid, id, "package.json", data).catch(() => {});
      res.json({ message: `Added ${name}`, packages: pkg });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/projects/:id/packages", async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const uid = await extractUid(req);
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const projectPath = projectFsPath(uid, id);
    if (!projectPath) return res.status(400).json({ error: "Invalid project id" });
    try {
      const pkgPath = path.join(projectPath, "package.json");
      const pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"));
      if (pkg.dependencies) delete pkg.dependencies[name];
      if (pkg.devDependencies) delete pkg.devDependencies[name];
      const data = JSON.stringify(pkg, null, 2);
      await fs.writeFile(pkgPath, data, "utf-8");
      if (uid) storageUpload(uid, id, "package.json", data).catch(() => {});
      res.json({ message: `Removed ${name}`, packages: pkg });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Flutter build state per signed-in user + project
  const buildState = new Map<string, { running: boolean; lines: string[]; done: boolean; success: boolean }>();

  // Start a Flutter build
  app.post("/api/projects/:id/build-preview", async (req, res) => {
    const { id } = req.params;
    const uid = await extractUid(req);
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const projectPath = projectFsPath(uid, id);
    if (!projectPath) {
      return res.status(400).json({ error: "Invalid project id" });
    }
    const buildKey = workspaceRunKey(uid, id);

    try {
      const pubspecPath = path.join(projectPath, "pubspec.yaml");
      try { await fs.access(pubspecPath); } catch {
        return res.json({ type: "non-flutter", message: "Not a Flutter project" });
      }

      const flutterJsPath = path.join(projectPath, "build", "web", "flutter.js");
      try { await fs.access(flutterJsPath); return res.json({ type: "flutter", status: "already-built" }); } catch {}

      const existing = buildState.get(buildKey);
      if (existing?.running) {
        return res.json({ type: "flutter", status: "building" });
      }

      const flutterBin = process.env.FLUTTER_BIN || "flutter";
      const state = { running: true, lines: [`$ ${flutterBin} build web`], done: false, success: false };
      buildState.set(buildKey, state);

      const child = exec(`${flutterBin} build web`, { cwd: projectPath, timeout: 180000, env: process.env, shell: true });
      child.stdout?.on("data", (data: string) => {
        data.split("\n").filter(Boolean).forEach(line => state.lines.push(line));
      });
      child.stderr?.on("data", (data: string) => {
        data.split("\n").filter(Boolean).forEach(line => state.lines.push(line));
      });
      child.on("close", async (code) => {
        state.running = false;
        state.done = true;
        let built = false;
        try { await fs.access(flutterJsPath); built = true; } catch {}
        state.success = built;
        const combined = state.lines.join("\n");
        if (!built && (code === 127 || /not found|ENOENT|flutter.*not recognized/i.test(combined))) {
          state.lines.push(
            "Flutter CLI not found on the server. Install the Flutter SDK or set FLUTTER_BIN to the flutter executable, then retry."
          );
        }
        state.lines.push(built ? "Build completed successfully." : `Build finished with exit code ${code}.`);
      });

      res.json({ type: "flutter", status: "build-started" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Poll build progress
  app.get("/api/projects/:id/build-status", async (req, res) => {
    const { id } = req.params;
    const uid = await extractUid(req);
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const state = buildState.get(workspaceRunKey(uid, id));
    if (!state) {
      return res.json({ status: "no-build" });
    }
    const since = parseInt(req.query.since as string) || 0;
    const newLines = state.lines.slice(since);
    res.json({ status: state.done ? (state.success ? "success" : "failed") : "building", lines: newLines, total: state.lines.length });
  });

  // === Backend project runner ===
  interface RunningProject {
    process: ChildProcess | null;
    port: number;
    lines: string[];
    type: string;
  }
  const runningProjects = new Map<string, RunningProject>();
  let nextPort = 4001;

  interface ProjectType {
    type: string;
    command: string;
    args: string[];
    portEnvVar?: string;
  }

  const FRONTEND_TOOLS = ["vite", "react-scripts", "next", "nuxt", "webpack", "parcel", "snowpack", "angular"];

  function isFrontendScript(script: string): boolean {
    return FRONTEND_TOOLS.some(tool => script.includes(tool));
  }

  async function detectProjectType(projectPath: string): Promise<ProjectType | null> {
    // Python first (no ambiguity with frontend tools)
    try {
      await fs.access(path.join(projectPath, "requirements.txt"));
      for (const entry of ["app.py", "main.py", "server.py", "manage.py"]) {
        try {
          await fs.access(path.join(projectPath, entry));
          if (entry === "manage.py") return { type: "django", command: "python", args: [entry, "runserver", "0.0.0.0:PORT"] };
          return { type: "python", command: "python", args: [entry], portEnvVar: "PORT" };
        } catch {}
      }
    } catch {}

    // Python without requirements.txt
    for (const entry of ["app.py", "server.py"]) {
      try {
        await fs.access(path.join(projectPath, entry));
        return { type: "python", command: "python", args: [entry], portEnvVar: "PORT" };
      } catch {}
    }

    // Go
    try {
      await fs.access(path.join(projectPath, "go.mod"));
      return { type: "go", command: "go", args: ["run", "."], portEnvVar: "PORT" };
    } catch {}

    // Rust
    try {
      await fs.access(path.join(projectPath, "Cargo.toml"));
      return { type: "rust", command: "cargo", args: ["run"], portEnvVar: "PORT" };
    } catch {}

    // Flutter — `flutter run -d web-server` for hot reload / live preview (SDK required on host)
    try {
      await fs.access(path.join(projectPath, "pubspec.yaml"));
      await fs.access(path.join(projectPath, "lib", "main.dart"));
      const flutterCmd = process.env.FLUTTER_BIN || "flutter";
      return {
        type: "flutter-web",
        command: flutterCmd,
        args: ["run", "-d", "web-server", "--web-port", "PORT", "--web-hostname", "0.0.0.0"],
      };
    } catch {}

    // Node.js — check package.json but EXCLUDE frontend-only projects
    try {
      const pkg = JSON.parse(await fs.readFile(path.join(projectPath, "package.json"), "utf-8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const hasFrontendDep = ["react", "vue", "svelte", "@angular/core", "vite", "next"].some(d => d in deps);
      const devScript = pkg.scripts?.dev || "";
      const startScript = pkg.scripts?.start || "";

      // If dev/start script uses frontend tools, it's a frontend project
      if (isFrontendScript(devScript) || isFrontendScript(startScript)) {
        // Check if it ALSO has a dedicated server file (fullstack)
        for (const entry of ["server.js", "server.ts", "api/index.js", "api/index.ts", "backend/index.js"]) {
          try {
            await fs.access(path.join(projectPath, entry));
            return { type: "node", command: "node", args: [entry], portEnvVar: "PORT" };
          } catch {}
        }

        // Run dev server (npm install will be handled by /run endpoint if needed)
        if (devScript.includes("vite")) {
          return { type: "devserver", command: "npx", args: ["vite", "--port", "PORT", "--host"], portEnvVar: "PORT" };
        }
        if (devScript) {
          return { type: "devserver", command: "npm", args: ["run", "dev"], portEnvVar: "PORT" };
        }

        return null; // Static preview with esbuild
      }

      // Non-frontend Node.js project (Express, Fastify, etc.)
      if (startScript && !hasFrontendDep) {
        return { type: "node", command: "npm", args: ["start"], portEnvVar: "PORT" };
      }
      if (devScript && !hasFrontendDep) {
        return { type: "node", command: "npm", args: ["run", "dev"], portEnvVar: "PORT" };
      }

      // Has explicit server entry points
      for (const entry of ["server.js", "server.ts", "app.js", "index.js"]) {
        try {
          await fs.access(path.join(projectPath, entry));
          const content = await fs.readFile(path.join(projectPath, entry), "utf-8");
          if (content.includes("listen") || content.includes("createServer") || content.includes("express")) {
            return { type: "node", command: "node", args: [entry], portEnvVar: "PORT" };
          }
        } catch {}
      }

      if (pkg.main && !hasFrontendDep) {
        return { type: "node", command: "node", args: [pkg.main], portEnvVar: "PORT" };
      }
    } catch {}

    return null;
  }

  // Detect project type
  app.get("/api/projects/:id/detect-type", async (req, res) => {
    const { id } = req.params;
    const uid = await extractUid(req);
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const projectPath = projectFsPath(uid, id);
    if (!projectPath) return res.status(400).json({ error: "Invalid project id" });

    const ptype = await detectProjectType(projectPath);
    const running = runningProjects.get(workspaceRunKey(uid, id));
    res.json({
      detected: ptype ? ptype.type : "static",
      running: !!running,
      port: running?.port || null,
    });
  });

  // Start a backend project
  app.post("/api/projects/:id/run", async (req, res) => {
    const { id } = req.params;
    const uid = await extractUid(req);
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const projectPath = projectFsPath(uid, id);
    if (!projectPath) return res.status(400).json({ error: "Invalid project id" });
    const runKey = workspaceRunKey(uid, id);

    if (runningProjects.has(runKey)) {
      const existing = runningProjects.get(runKey)!;
      return res.json({ status: "already-running", port: existing.port, type: existing.type });
    }

    const ptype = await detectProjectType(projectPath);
    if (!ptype) return res.json({ status: "static", message: "No backend detected" });

    const port = nextPort++;
    const env = { ...process.env, PORT: String(port) };
    const lines: string[] = [];
    const flutterCmd = process.env.FLUTTER_BIN || "flutter";

    if (ptype.type === "flutter-web") {
      const args = ptype.args.map((a) => a.replace("PORT", String(port)));
      const startFlutterServer = () => {
        lines.push(`$ ${flutterCmd} ${args.join(" ")}  (port ${port})`);
        const child = spawn(flutterCmd, args, {
          cwd: projectPath,
          env,
          shell: true,
          stdio: ["ignore", "pipe", "pipe"],
        });
        child.stdout?.on("data", (data: Buffer) => {
          data.toString().split("\n").filter(Boolean).forEach((l) => lines.push(l));
        });
        child.stderr?.on("data", (data: Buffer) => {
          data.toString().split("\n").filter(Boolean).forEach((l) => lines.push(l));
        });
        child.on("close", (code) => {
          lines.push(`Flutter process exited with code ${code}`);
          runningProjects.delete(runKey);
        });
        runningProjects.set(runKey, { process: child, port, lines, type: "flutter-web" });
      };

      lines.push(`$ ${flutterCmd} pub get`);
      runningProjects.set(runKey, { process: null, port, lines, type: "flutter-web" });
      res.json({ status: "installing", port, type: "flutter-web" });

      const pub = spawn(flutterCmd, ["pub", "get"], { cwd: projectPath, env, shell: true, stdio: ["ignore", "pipe", "pipe"] });
      pub.stdout?.on("data", (data: Buffer) => {
        data.toString().split("\n").filter(Boolean).forEach((l) => lines.push(l));
      });
      pub.stderr?.on("data", (data: Buffer) => {
        data.toString().split("\n").filter(Boolean).forEach((l) => lines.push(l));
      });
      pub.on("close", (code) => {
        if (code !== 0) {
          lines.push(`flutter pub get failed with code ${code}. Is Flutter installed? Set FLUTTER_BIN or install the SDK on the server.`);
          runningProjects.delete(runKey);
          return;
        }
        lines.push("flutter pub get completed.");
        startFlutterServer();
      });
      return;
    }

    // Ensure essential dev tooling is in package.json for devserver projects
    const pkgJsonPath = path.join(projectPath, "package.json");
    const nodeModulesPath = path.join(projectPath, "node_modules");
    if (ptype.type === "devserver") {
      try {
        const pkg = JSON.parse(await fs.readFile(pkgJsonPath, "utf-8"));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        const missing: string[] = [];
        if (!allDeps["vite"]) missing.push("vite");
        let viteConfigFile: string | null = null;
        for (const name of ["vite.config.ts", "vite.config.js", "vite.config.mts", "vite.config.mjs"]) {
          try { await fs.access(path.join(projectPath, name)); viteConfigFile = path.join(projectPath, name); break; } catch {}
        }
        if (viteConfigFile) {
          const viteConfig = await fs.readFile(viteConfigFile, "utf-8");
          if (viteConfig.includes("@vitejs/plugin-react") && !allDeps["@vitejs/plugin-react"]) {
            missing.push("@vitejs/plugin-react");
          }
          if (viteConfig.includes("@vitejs/plugin-vue") && !allDeps["@vitejs/plugin-vue"]) {
            missing.push("@vitejs/plugin-vue");
          }
        }
        if (!allDeps["react"]) missing.push("react");
        if (!allDeps["react-dom"]) missing.push("react-dom");
        if (missing.length > 0) {
          lines.push(`> Auto-adding missing dev dependencies: ${missing.join(", ")}`);
          if (!pkg.devDependencies) pkg.devDependencies = {};
          for (const dep of missing) {
            if (dep === "react" || dep === "react-dom") pkg.devDependencies[dep] = "^19.0.0";
            else pkg.devDependencies[dep] = "latest";
          }
          await fs.writeFile(pkgJsonPath, JSON.stringify(pkg, null, 2), "utf-8");
        }
      } catch {}
    }

    // Check if npm install is needed
    let needsInstall = false;
    try {
      await fs.access(pkgJsonPath);
      await fs.access(nodeModulesPath);
      if (ptype.type === "devserver") {
        try { await fs.access(path.join(nodeModulesPath, "vite")); } catch { needsInstall = true; }
      }
    } catch {
      try { await fs.access(pkgJsonPath); needsInstall = true; } catch {}
    }

    const args = ptype.args.map(a => a.replace("PORT", String(port)));

    const startServer = () => {
      lines.push(`$ ${ptype.command} ${args.join(" ")}  (port ${port})`);
      const child = spawn(ptype.command, args, {
        cwd: projectPath,
        env,
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.stdout?.on("data", (data: Buffer) => {
        data.toString().split("\n").filter(Boolean).forEach(l => lines.push(l));
      });
      child.stderr?.on("data", (data: Buffer) => {
        data.toString().split("\n").filter(Boolean).forEach(l => lines.push(l));
      });
      child.on("close", (code) => {
        lines.push(`Process exited with code ${code}`);
        runningProjects.delete(runKey);
      });
      runningProjects.set(runKey, { process: child, port, lines, type: ptype.type });
    };

    if (needsInstall) {
      lines.push("$ npm install  (this may take a minute...)");
      runningProjects.set(runKey, { process: null, port, lines, type: ptype.type });
      res.json({ status: "installing", port, type: ptype.type });

      const installChild = spawn("npm", ["install"], { cwd: projectPath, env, shell: true, stdio: ["ignore", "pipe", "pipe"] });
      installChild.stdout?.on("data", (data: Buffer) => {
        data.toString().split("\n").filter(Boolean).forEach(l => lines.push(l));
      });
      installChild.stderr?.on("data", (data: Buffer) => {
        data.toString().split("\n").filter(Boolean).forEach(l => lines.push(l));
      });
      installChild.on("close", (code) => {
        if (code === 0) {
          lines.push("Dependencies installed successfully.");
          startServer();
        } else {
          lines.push(`npm install failed with code ${code}`);
          runningProjects.delete(runKey);
        }
      });
    } else {
      startServer();
      res.json({ status: "started", port, type: ptype.type });
    }
  });

  // Stop a running project
  app.post("/api/projects/:id/stop", async (req, res) => {
    const { id } = req.params;
    const uid = await extractUid(req);
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const runKey = workspaceRunKey(uid, id);
    const running = runningProjects.get(runKey);
    if (!running) return res.json({ status: "not-running" });

    if (running.process) {
      running.process.kill("SIGTERM");
      setTimeout(() => {
        try {
          running.process?.kill("SIGKILL");
        } catch {}
      }, 3000);
    }
    runningProjects.delete(runKey);
    res.json({ status: "stopped" });
  });

  /** Rename project (Storage + local folder id). Declared after `runningProjects` so handlers can stop dev servers. */
  app.post("/api/projects/:id/rename-project", async (req, res) => {
    const oldId = req.params.id;
    const newName = typeof req.body?.newName === "string" ? req.body.newName.trim() : "";
    if (!isValidName(oldId) || !isValidName(newName)) {
      return res.status(400).json({ error: "Invalid project name" });
    }
    if (oldId === newName) {
      return res.json({ ok: true, name: newName });
    }
    const uid = await extractUid(req);
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!firebaseStorage) {
      return res.status(503).json({ error: "Storage not configured" });
    }
    const oldRunKey = workspaceRunKey(uid, oldId);
    const running = runningProjects.get(oldRunKey);
    if (running?.process) {
      try {
        running.process.kill("SIGTERM");
      } catch {}
      setTimeout(() => {
        try {
          running.process?.kill("SIGKILL");
        } catch {}
      }, 3000);
    }
    runningProjects.delete(oldRunKey);
    try {
      const existingNew = await storageListFiles(uid, newName);
      if (existingNew.length > 0) {
        return res.status(400).json({ error: "Target project name already exists" });
      }
      const paths = await storageListFiles(uid, oldId);
      for (const p of paths) {
        const content = await storageDownload(uid, oldId, p);
        if (content !== null) await storageUpload(uid, newName, p, content);
      }
      await storageDelete(uid, oldId);

      const oldPath = projectFsPath(uid, oldId);
      const newPath = projectFsPath(uid, newName);
      if (!oldPath || !newPath) {
        return res.status(400).json({ error: "Invalid path" });
      }
      try {
        await fs.rm(newPath, { recursive: true, force: true });
      } catch {}
      try {
        await fs.access(oldPath);
        await fs.rename(oldPath, newPath);
      } catch {
        await fs.mkdir(newPath, { recursive: true });
        await syncProjectToLocal(uid, newName, newPath);
      }
      res.json({ ok: true, name: newName });
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  // Get logs from running project
  app.get("/api/projects/:id/run-logs", async (req, res) => {
    const { id } = req.params;
    const uid = await extractUid(req);
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const running = runningProjects.get(workspaceRunKey(uid, id));
    if (!running) return res.json({ status: "not-running", lines: [] });
    const since = parseInt(req.query.since as string) || 0;
    res.json({ status: "running", lines: running.lines.slice(since), total: running.lines.length, port: running.port });
  });

  // Preview project files
  const INDEX_SEARCH_PATHS = [
    "index.html",
    "public/index.html",
    "build/web/index.html",     // Flutter web
    "build/index.html",         // Generic build output
    "dist/index.html",          // Vite/Webpack build
    "web/index.html",
    "www/index.html",
  ];

  async function findIndexHtml(projectPath: string): Promise<{ fullPath: string; relDir: string } | null> {
    for (const rel of INDEX_SEARCH_PATHS) {
      const full = path.join(projectPath, rel);
      try {
        await fs.access(full);
        const relDir = path.dirname(rel);
        return { fullPath: full, relDir: relDir === "." ? "" : relDir };
      } catch {}
    }
    return null;
  }

  /** When no index.html: show README / common entry sources so preview is still useful for non-web stacks. */
  async function buildNoIndexPreviewPage(projectPath: string, projectId: string): Promise<string> {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const chunks: { title: string; rel: string; body: string }[] = [];
    const tryPush = async (rel: string, title: string) => {
      const full = path.join(projectPath, rel);
      try {
        const st = await fs.stat(full);
        if (!st.isFile()) return;
        const body = (await fs.readFile(full, "utf-8")).slice(0, 48_000);
        chunks.push({ title, rel, body });
      } catch {}
    };
    await tryPush("README.md", "README");
    await tryPush("readme.md", "README");
    await tryPush("README.txt", "README");
    const codeCandidates = [
      "main.cpp",
      "main.c",
      "main.cc",
      "main.py",
      "main.rs",
      "main.go",
      "main.java",
      "app.py",
      "server.py",
      "main.js",
      "index.js",
      "src/main.cpp",
      "src/main.c",
      "src/main.py",
      "src/main.rs",
      "lib/main.dart",
    ];
    for (const rel of codeCandidates) {
      if (chunks.length >= 5) break;
      await tryPush(rel, rel);
    }
    if (chunks.length === 0) {
      try {
        const entries = await fs.readdir(projectPath, { withFileTypes: true });
        for (const e of entries) {
          if (!e.isFile() || e.name.startsWith(".")) continue;
          await tryPush(e.name, e.name);
          if (chunks.length) break;
        }
      } catch {}
    }
    const sections = chunks
      .map(
        (c) =>
          `<section style="margin-bottom:2rem"><h2 style="color:#93c5fd;font-size:1rem;margin:0 0 .5rem">${esc(c.title)} <span style="opacity:.6;font-weight:400">${esc(c.rel)}</span></h2><pre style="white-space:pre-wrap;word-break:break-word;background:#111827;border:1px solid #334155;border-radius:8px;padding:1rem;font-size:13px;line-height:1.45">${esc(c.body)}</pre></section>`
      )
      .join("");
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Preview · ${esc(projectId)}</title></head><body style="margin:0;background:#0a0a0a;color:#e2e8f0;font-family:system-ui,Segoe UI,sans-serif;padding:1.5rem;line-height:1.5">
<h1 style="color:#38bdf8;font-size:1.35rem">Project workspace</h1>
<p style="color:#94a3b8;max-width:52rem">No <code>index.html</code> was found. This read-only page shows text from your project. Native programs (C++, Rust, Go, …) cannot run in the browser — use the workspace terminal or clone locally to build and run.</p>
${sections || '<p style="color:#f97316">No readable text files found in the project root.</p>'}
<p style="margin-top:2rem;font-size:12px;color:#64748b">Sooner — add <code>index.html</code> or Flutter <code>web/index.html</code> for an interactive web preview.</p>
</body></html>`;
  }

  function isReactProject(html: string): boolean {
    return html.includes("react") || html.includes("React") || html.includes(".tsx") || html.includes(".jsx");
  }

  function isFlutterProject(html: string): boolean {
    return html.includes("flutter") || html.includes("_flutter");
  }

  function isVueProject(html: string): boolean {
    return html.includes("vue") || html.includes("Vue") || html.includes(".vue");
  }

  // Reverse proxy helper for backend/devserver projects
  function proxyToBackend(req: express.Request, res: express.Response, port: number, urlPath: string, injectBase?: string) {
    const options = {
      hostname: "127.0.0.1",
      port,
      path: urlPath || "/",
      method: req.method,
      headers: { ...req.headers, host: `127.0.0.1:${port}` },
    };
    const proxyReq = http.request(options, (proxyRes) => {
      const ct = proxyRes.headers["content-type"] || "";
      // For HTML responses from devserver root, inject <base> to fix relative path resolution
      if (injectBase && urlPath === "/" && ct.includes("text/html")) {
        const chunks: Buffer[] = [];
        proxyRes.on("data", (chunk: Buffer) => chunks.push(chunk));
        proxyRes.on("end", () => {
          let html = Buffer.concat(chunks).toString("utf-8");
          if (html.includes("<head>")) {
            html = html.replace("<head>", `<head><base href="${injectBase}">`);
          }
          const headers = { ...proxyRes.headers };
          delete headers["content-length"];
          delete headers["content-encoding"];
          res.writeHead(proxyRes.statusCode || 200, headers);
          res.end(html);
        });
      } else {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      }
    });
    proxyReq.on("error", () => {
      res.status(502).send(`
        <html>
          <head><meta http-equiv="refresh" content="3"></head>
          <body style="background:#0A0A0A;color:#ccc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
            <div style="text-align:center;">
              <h1 style="color:#38BDF8;">Server Starting...</h1>
              <p>Waiting for the server to be ready. Auto-refreshing...</p>
              <div style="margin-top:20px;"><div style="width:30px;height:30px;border:3px solid #333;border-top:3px solid #38BDF8;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div></div>
              <style>@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}</style>
            </div>
          </body>
        </html>
      `);
    });
    req.pipe(proxyReq, { end: true });
  }

  function sendPreviewAuthRequired(res: Response) {
    res.status(401).type("html").send(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Preview</title></head><body style="margin:0;font-family:system-ui,sans-serif;background:#0a0a0a;color:#cbd5e1;padding:2rem;line-height:1.5">
<h1 style="color:#38bdf8;font-size:1.25rem;">Preview access</h1>
<p>Open Preview from the Sooner editor while signed in, or use a preview link issued from the app (Copy preview link).</p>
<p style="font-size:.75rem;opacity:.75">Operators: set <code>PREVIEW_URL_SECRET</code> to require time-limited signed URLs; leave unset for open previews (project id is still unguessable).</p>
</body></html>`);
  }

  function ensurePreviewGate(req: Request, res: Response, projectId: string, pathOwnerUid?: string): boolean {
    if (!previewUrlSecret()) return true;
    const q = typeof req.query.pt === "string" ? req.query.pt : "";
    const c = cookieValue(req, "spv") || "";
    const token = q || c;
    if (!verifyPreviewToken(token, projectId, pathOwnerUid)) {
      sendPreviewAuthRequired(res);
      return false;
    }
    return true;
  }

  app.get("/preview/u/:pathUid/:id", async (req, res) => {
    const { pathUid, id } = req.params;

    if (!sanitizeUidForFs(pathUid) || !isValidName(id)) {
      return res.status(400).send("Invalid preview URL");
    }

    const raw = req.originalUrl || "";
    const qIdx = raw.indexOf("?");
    const pathOnly = qIdx === -1 ? raw : raw.slice(0, qIdx);
    const queryPart = qIdx === -1 ? "" : raw.slice(qIdx);
    if (!pathOnly.endsWith("/")) {
      return res.redirect(301, pathOnly + "/" + queryPart);
    }

    if (!ensurePreviewGate(req, res, id, pathUid)) return;
    if (previewUrlSecret() && typeof req.query.pt === "string" && req.query.pt.length > 0) {
      const v = verifyPreviewToken(req.query.pt, id, pathUid);
      if (v) setSpvCookie(res, v.uid, id, req.query.pt);
      return res.redirect(302, `/preview/u/${encodeURIComponent(pathUid)}/${encodeURIComponent(id)}/`);
    }

    const projectPath = projectFsPath(pathUid, id);
    if (!projectPath) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    // If a backend/devserver is running, proxy to it with base tag injection
    const running = runningProjects.get(workspaceRunKey(pathUid, id));
    if (running) {
      const base = `/preview/u/${encodeURIComponent(pathUid)}/${encodeURIComponent(id)}/`;
      return proxyToBackend(req, res, running.port, "/", base);
    }

    const found = await findIndexHtml(projectPath);
    if (!found) {
      const html = await buildNoIndexPreviewPage(projectPath, id);
      return res.status(200).type("html").send(html);
    }

    try {
      let content = await fs.readFile(found.fullPath, "utf-8");
      const isFlutter = isFlutterProject(content);

      if (isFlutter) {
        const flutterJsPath = path.join(projectPath, found.relDir || "", "flutter.js");
        let flutterJsExists = false;
        try { await fs.access(flutterJsPath); flutterJsExists = true; } catch {}
        if (!flutterJsExists) {
          return res.send(`
            <html>
              <body style="background:#0A0A0A;color:#ccc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
                <div style="text-align:center;max-width:500px;">
                  <h1 style="color:#38BDF8;">Flutter Web Preview</h1>
                  <p>Flutter Web requires the Flutter SDK to build for web.</p>
                  <p style="color:#8E9299;">Run <code style="background:#1a1a1a;padding:2px 8px;border-radius:4px;">flutter build web</code> in the terminal, then refresh this preview.</p>
                  <p style="color:#8E9299;font-size:12px;margin-top:20px;">The built output will appear in <code>build/web/</code> and be served automatically.</p>
                  <p style="color:#555;font-size:11px;margin-top:12px;">Note: Flutter SDK must be installed on this machine.</p>
                </div>
              </body>
            </html>
          `);
        }
      }

      // Flutter build output: serve with minimal injection, no import maps
      if (isFlutter) {
        const basePath = found.relDir ? `${found.relDir}/` : "";
        const baseHref = `/preview/u/${encodeURIComponent(pathUid)}/${encodeURIComponent(id)}/${basePath}`;
        if (content.includes("<head>")) {
          content = content.replace("<head>", `<head><base href="${baseHref}">`);
        }
        return res.send(content);
      }

      const basePath = found.relDir ? `${found.relDir}/` : "";
      const baseHref = `/preview/u/${encodeURIComponent(pathUid)}/${encodeURIComponent(id)}/${basePath}`;
      const isReact = isReactProject(content);

      let headInjection = `<base href="${baseHref}">
        <script>
          window.onerror = function(msg, url, line) {
            console.error("Preview Error: " + msg + " at " + url + ":" + line);
          };
        </script>`;

      // Read package.json to build dynamic import map
      let pkgDeps: Record<string, string> = {};
      try {
        const pkgJson = JSON.parse(await fs.readFile(path.join(projectPath, "package.json"), "utf-8"));
        pkgDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
      } catch {}

      const importMapEntries: Record<string, string> = {};

      if (isReact) {
        Object.assign(importMapEntries, {
          "react": "https://esm.sh/react@19?dev",
          "react/jsx-runtime": "https://esm.sh/react@19/jsx-runtime?dev",
          "react/jsx-dev-runtime": "https://esm.sh/react@19/jsx-dev-runtime?dev",
          "react-dom": "https://esm.sh/react-dom@19?dev",
          "react-dom/client": "https://esm.sh/react-dom@19/client?dev",
        });
        headInjection += `\n<script src="https://cdn.tailwindcss.com"></script>`;
      }

      const isVue = isVueProject(content);
      if (isVue) {
        Object.assign(importMapEntries, {
          "vue": "https://esm.sh/vue@3?dev",
          "@vue/runtime-dom": "https://esm.sh/@vue/runtime-dom@3?dev",
        });
      }

      for (const [pkg, ver] of Object.entries(pkgDeps)) {
        if (!importMapEntries[pkg]) {
          const cleanVer = (ver as string).replace(/^[\^~>=<]*/g, "");
          importMapEntries[pkg] = `https://esm.sh/${pkg}@${cleanVer}`;
        }
      }

      if (Object.keys(importMapEntries).length > 0) {
        headInjection += `
        <script type="importmap">
        { "imports": ${JSON.stringify(importMapEntries, null, 2)} }
        </script>`;
      }

      content = content.replace(/(<script[^>]+src=")\/([^"]*")/g, '$1./$2');
      content = content.replace(/(<link[^>]+href=")\/([^"]*")/g, '$1./$2');
      if (content.includes("<head>")) {
        content = content.replace("<head>", `<head>${headInjection}`);
      } else {
        content = headInjection + content;
      }
      res.send(content);
    } catch (err) {
      res.status(500).send("Error loading preview");
    }
  });

  // Resolve extensionless imports to actual files
  async function resolveFile(basePath: string): Promise<string | null> {
    const extensions = [".tsx", ".ts", ".jsx", ".js", ".vue", ".svelte", "/index.tsx", "/index.ts", "/index.jsx", "/index.js"];
    // Try exact path first
    try { await fs.access(basePath); return basePath; } catch {}
    for (const ext of extensions) {
      const candidate = basePath + ext;
      try { await fs.access(candidate); return candidate; } catch {}
    }
    return null;
  }

  // Rewrite bare module imports (e.g. "three", "vue") to esm.sh CDN URLs
  function rewriteBareImports(code: string): string {
    return code.replace(
      /from\s+["']([^./][^"']*)["']/g,
      (match, specifier) => {
        if (specifier.startsWith("http")) return match;
        return `from "https://esm.sh/${specifier}"`;
      }
    ).replace(
      /import\s+["']([^./][^"']*)["']/g,
      (match, specifier) => {
        if (specifier.startsWith("http")) return match;
        return `import "https://esm.sh/${specifier}"`;
      }
    );
  }

  // Catch-all for sub-resources in preview with on-the-fly transpilation
  app.get("/preview/u/:pathUid/:id/*", async (req, res) => {
    const { pathUid, id } = req.params;
    const filePath = req.params[0];

    if (!sanitizeUidForFs(pathUid) || !isValidName(id)) {
      return res.status(400).send("Invalid preview URL");
    }
    if (!ensurePreviewGate(req, res, id, pathUid)) return;

    // Proxy to backend if running
    const running = runningProjects.get(workspaceRunKey(pathUid, id));
    if (running) {
      return proxyToBackend(req, res, running.port, "/" + filePath);
    }

    const projRoot = projectFsPath(pathUid, id);
    const baseFullPath = projRoot ? safePath(projRoot, filePath) : null;
    if (!baseFullPath) {
      return res.status(400).send("Invalid file path");
    }

    try {
      const fullPath = await resolveFile(baseFullPath);
      if (!fullPath) {
        return res.status(404).send("File not found in project preview");
      }

      // Serve build output (Flutter build/web, dist/, etc.) directly without transformation
      const isBuildOutput = filePath.startsWith("build/") || filePath.startsWith("dist/") || filePath.includes(".dart.");
      if (isBuildOutput) {
        return res.sendFile(fullPath, (err) => {
          if (err) res.status(404).send("File not found");
        });
      }

      const ext = path.extname(fullPath);

      if ([".ts", ".tsx", ".jsx"].includes(ext)) {
        const content = await fs.readFile(fullPath, "utf-8");
        const loader = ext === ".ts" ? "ts" : (ext === ".tsx" ? "tsx" : "jsx");
        const result = await esbuild.transform(content, {
          loader: loader as esbuild.Loader,
          format: "esm",
          target: "es2020",
          jsx: "automatic"
        });
        res.setHeader("Content-Type", "application/javascript");
        return res.send(rewriteBareImports(result.code));
      }

      if (ext === ".js" || ext === ".mjs") {
        const content = await fs.readFile(fullPath, "utf-8");
        res.setHeader("Content-Type", "application/javascript");
        return res.send(rewriteBareImports(content));
      }

      if (ext === ".vue") {
        const content = await fs.readFile(fullPath, "utf-8");
        const compiled = compileVueSFC(content, filePath);
        res.setHeader("Content-Type", "application/javascript");
        return res.send(rewriteBareImports(compiled));
      }

      if (ext === ".svelte") {
        const content = await fs.readFile(fullPath, "utf-8");
        const compiled = compileSvelteSFC(content);
        res.setHeader("Content-Type", "application/javascript");
        return res.send(rewriteBareImports(compiled));
      }

      if (ext === ".css") {
        const content = await fs.readFile(fullPath, "utf-8");
        res.setHeader("Content-Type", "text/css");
        return res.send(content);
      }

      if (ext === ".json") {
        res.setHeader("Content-Type", "application/json");
      }

      res.sendFile(fullPath, (err) => {
        if (err) {
          res.status(404).send("File not found in project preview");
        }
      });
    } catch (error) {
      res.status(500).send("Error processing file");
    }
  });

  // Minimal Vue SFC compiler (template + script extraction)
  function compileVueSFC(source: string, filename: string): string {
    const templateMatch = source.match(/<template>([\s\S]*?)<\/template>/);
    const scriptMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    const styleMatch = source.match(/<style[^>]*>([\s\S]*?)<\/style>/);

    const template = templateMatch?.[1]?.trim() || "<div></div>";
    const script = scriptMatch?.[1]?.trim() || "export default {}";
    const style = styleMatch?.[1]?.trim() || "";

    const escaped = template.replace(/`/g, "\\`").replace(/\$/g, "\\$");
    return `
      ${script.replace(/export default/, "const __component =")}
      __component.template = \`${escaped}\`;
      ${style ? `
      const __style = document.createElement("style");
      __style.textContent = \`${style.replace(/`/g, "\\`")}\`;
      document.head.appendChild(__style);
      ` : ""}
      export default __component;
    `;
  }

  // Minimal Svelte compiler (basic extraction)
  function compileSvelteSFC(source: string): string {
    const scriptMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    const styleMatch = source.match(/<style[^>]*>([\s\S]*?)<\/style>/);
    const htmlPart = source
      .replace(/<script[^>]*>[\s\S]*?<\/script>/g, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/g, "")
      .trim();

    const script = scriptMatch?.[1]?.trim() || "";
    const style = styleMatch?.[1]?.trim() || "";
    const escaped = htmlPart.replace(/`/g, "\\`").replace(/\$/g, "\\$");

    return `
      ${script}
      ${style ? `
      const __style = document.createElement("style");
      __style.textContent = \`${style.replace(/`/g, "\\`")}\`;
      document.head.appendChild(__style);
      ` : ""}
      const __template = \`${escaped}\`;
      export default { template: __template };
    `;
  }

  // ===================== CMS & Blog API =====================

  const CMS_ADMIN_USER = process.env.CMS_ADMIN_USER || "";
  const CMS_ADMIN_PASS = process.env.CMS_ADMIN_PASS || "";
  const CMS_JWT_SECRET = process.env.CMS_JWT_SECRET || "dev-secret-change-me";

  function signJwt(payload: object, expiresInSec = 86400): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSec })).toString("base64url");
    const sig = crypto.createHmac("sha256", CMS_JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    return `${header}.${body}.${sig}`;
  }

  function verifyJwt(token: string): object | null {
    try {
      const [header, body, sig] = token.split(".");
      const expected = crypto.createHmac("sha256", CMS_JWT_SECRET).update(`${header}.${body}`).digest("base64url");
      if (sig !== expected) return null;
      const payload = JSON.parse(Buffer.from(body, "base64url").toString());
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
      return payload;
    } catch { return null; }
  }

  function requireCmsAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    const payload = verifyJwt(auth.slice(7));
    if (!payload) return res.status(401).json({ error: "Invalid or expired token" });
    (req as any).cmsUser = payload;
    next();
  }

  // CMS Login
  app.post("/api/cms/login", (req, res) => {
    const { user, password } = req.body;
    if (!CMS_ADMIN_USER || !CMS_ADMIN_PASS) return res.status(503).json({ error: "CMS not configured" });
    if (user !== CMS_ADMIN_USER || password !== CMS_ADMIN_PASS) return res.status(401).json({ error: "Invalid credentials" });
    const token = signJwt({ sub: user, role: "admin" });
    res.json({ token });
  });

  // CMS: List all posts
  app.get("/api/cms/posts", requireCmsAuth, async (_req, res) => {
    if (!firebaseDb) return res.status(503).json({ error: "Firestore not configured" });
    try {
      const snap = await firebaseDb.collection("blog_posts").orderBy("createdAt", "desc").get();
      const now = admin.firestore.Timestamp.now();
      const promoted = await promoteDueScheduledPosts(snap.docs, now);
      const posts = snap.docs.map((d) => {
        const data = d.data();
        const status = promoted.has(d.id) ? "published" : data?.status;
        return { id: d.id, ...data, status };
      });
      res.json(posts);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // CMS: Get single post
  app.get("/api/cms/posts/:id", requireCmsAuth, async (req, res) => {
    if (!firebaseDb) return res.status(503).json({ error: "Firestore not configured" });
    try {
      const doc = await firebaseDb.collection("blog_posts").doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Not found" });
      const now = admin.firestore.Timestamp.now();
      const promoted = await promoteDueScheduledPosts([doc], now);
      const data = doc.data();
      const status = promoted.has(doc.id) ? "published" : data?.status;
      res.json({ id: doc.id, ...data, status });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // CMS: Create post
  app.post("/api/cms/posts", requireCmsAuth, async (req, res) => {
    if (!firebaseDb) return res.status(503).json({ error: "Firestore not configured" });
    try {
      const now = admin.firestore.Timestamp.now();
      const data = {
        slug: req.body.slug || "",
        title_en: req.body.title_en || "",
        title_ja: req.body.title_ja || "",
        content_en: req.body.content_en || "",
        content_ja: req.body.content_ja || "",
        excerpt_en: req.body.excerpt_en || "",
        excerpt_ja: req.body.excerpt_ja || "",
        author: req.body.author || "Sooner Team",
        readingTime_en: req.body.readingTime_en || "",
        readingTime_ja: req.body.readingTime_ja || "",
        tags: req.body.tags || [],
        status: req.body.status || "draft",
        publishAt: req.body.publishAt ? admin.firestore.Timestamp.fromDate(new Date(req.body.publishAt)) : now,
        createdAt: now,
        updatedAt: now,
        viewCount: 0,
      };
      const ref = await firebaseDb.collection("blog_posts").add(data);

      let indexingResult = null;
      if (data.status === "published" && data.slug) {
        indexingResult = await notifyGoogleIndexing(`https://blog.sooner.sh/${data.slug}`);
        if (!indexingResult.success) console.warn("Google Indexing API:", indexingResult.error);
      }

      res.json({ id: ref.id, ...data, indexingResult });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- Google Indexing API (Web Search / URL notifications) ---
  // Uses the service account JSON you configure for the project; requests faster crawl of public blog URLs after CMS publish.
  async function notifyGoogleIndexing(url: string): Promise<{ success: boolean; error?: string }> {
    if (!admin.apps.length) return { success: false, error: "Firebase Admin not initialized" };
    try {
      const client = admin.app().options.credential as any;
      if (!client?.getAccessToken) return { success: false, error: "No credential with getAccessToken" };
      const tokenRes = await client.getAccessToken();
      const accessToken = tokenRes?.access_token;
      if (!accessToken) return { success: false, error: "Failed to get access token" };

      const response = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ url, type: "URL_UPDATED" }),
      });
      if (!response.ok) {
        const body = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${body}` };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // CMS: Update post
  app.put("/api/cms/posts/:id", requireCmsAuth, async (req, res) => {
    if (!firebaseDb) return res.status(503).json({ error: "Firestore not configured" });
    try {
      const docRef = firebaseDb.collection("blog_posts").doc(req.params.id);
      const doc = await docRef.get();
      if (!doc.exists) return res.status(404).json({ error: "Not found" });
      const prevData = doc.data();
      const updates: any = { updatedAt: admin.firestore.Timestamp.now() };
      const allowed = ["slug", "title_en", "title_ja", "content_en", "content_ja", "excerpt_en", "excerpt_ja", "author", "readingTime_en", "readingTime_ja", "tags", "status"];
      for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
      if (req.body.publishAt) updates.publishAt = admin.firestore.Timestamp.fromDate(new Date(req.body.publishAt));
      await docRef.update(updates);
      const updated = await docRef.get();
      const updatedData = updated.data();

      // Auto-notify Google when status transitions to "published"
      const wasPublished = prevData?.status === "published";
      const nowPublished = updatedData?.status === "published";
      let indexingResult = null;
      if (nowPublished && updatedData?.slug) {
        const articleUrl = `https://blog.sooner.sh/${updatedData.slug}`;
        indexingResult = await notifyGoogleIndexing(articleUrl);
        if (!indexingResult.success) console.warn("Google Indexing API:", indexingResult.error);
      }

      res.json({ id: updated.id, ...updatedData, indexingResult });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // CMS: Delete post
  app.delete("/api/cms/posts/:id", requireCmsAuth, async (req, res) => {
    if (!firebaseDb) return res.status(503).json({ error: "Firestore not configured" });
    try {
      await firebaseDb.collection("blog_posts").doc(req.params.id).delete();
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Milliseconds for publishAt (Timestamp, ISO string, or serialized seconds). */
  function publishAtMillis(pub: any): number | null {
    if (pub == null) return null;
    if (typeof pub.toMillis === "function") return pub.toMillis();
    if (typeof pub === "string") {
      const t = new Date(pub).getTime();
      return Number.isNaN(t) ? null : t;
    }
    if (typeof pub._seconds === "number") return pub._seconds * 1000 + Math.floor((pub._nanoseconds || 0) / 1e6);
    return null;
  }

  /** Scheduled posts whose publish time has passed become `published` in Firestore (CMS badge + consistency). */
  async function promoteDueScheduledPosts(
    docs: readonly admin.firestore.DocumentSnapshot[],
    now: admin.firestore.Timestamp
  ): Promise<Set<string>> {
    const promoted = new Set<string>();
    for (const d of docs) {
      if (!d.exists) continue;
      const data = d.data();
      if (!data || data.status !== "scheduled") continue;
      const ms = publishAtMillis(data.publishAt);
      if (ms === null || ms > now.toMillis()) continue;
      try {
        await d.ref.update({ status: "published", updatedAt: now });
        promoted.add(d.id);
        const slug = data.slug;
        if (slug) {
          const r = await notifyGoogleIndexing(`https://blog.sooner.sh/${slug}`);
          if (!r.success) console.warn("Google Indexing (auto-promote scheduled):", r.error);
        }
      } catch (e: any) {
        console.warn("promoteDueScheduledPosts:", d.id, e?.message || e);
      }
    }
    return promoted;
  }

  function isBlogPostPublicVisible(data: any, now: admin.firestore.Timestamp): boolean {
    const st = data.status;
    if (st === "draft") return false;
    if (st === "published") {
      return true;
    }
    if (st === "scheduled") {
      const ms = publishAtMillis(data.publishAt);
      if (ms === null) return false;
      return ms <= now.toMillis();
    }
    return false;
  }

  // Public Blog: List published posts (filter in memory to avoid required composite index on status + publishAt)
  app.get("/api/blog/posts", async (_req, res) => {
    if (!firebaseDb) return res.status(503).json({ error: "Firestore not configured" });
    try {
      const now = admin.firestore.Timestamp.now();
      const snap = await firebaseDb.collection("blog_posts")
        .orderBy("publishAt", "desc")
        .limit(250)
        .get();
      await promoteDueScheduledPosts(snap.docs, now);
      const posts = snap.docs
        .filter((d) => isBlogPostPublicVisible(d.data(), now))
        .map((d) => {
          const data = d.data();
          return {
            id: d.id, slug: data.slug,
            title_en: data.title_en, title_ja: data.title_ja,
            excerpt_en: data.excerpt_en, excerpt_ja: data.excerpt_ja,
            author: data.author,
            readingTime_en: data.readingTime_en, readingTime_ja: data.readingTime_ja,
            tags: data.tags, publishAt: data.publishAt,
            viewCount: data.viewCount || 0,
          };
        });
      res.json(posts);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Public Blog: Get single post by slug (same visibility rules as list: published/scheduled, publishAt <= now)
  app.get("/api/blog/posts/:slug", async (req, res) => {
    if (!firebaseDb) return res.status(503).json({ error: "Firestore not configured" });
    try {
      const now = admin.firestore.Timestamp.now();
      const snap = await firebaseDb.collection("blog_posts")
        .where("slug", "==", req.params.slug)
        .limit(20)
        .get();
      if (snap.empty) return res.status(404).json({ error: "Not found" });
      const visible = snap.docs.filter((d) => isBlogPostPublicVisible(d.data(), now));
      if (!visible.length) return res.status(404).json({ error: "Not found" });
      visible.sort((a, b) => (publishAtMillis(b.data().publishAt) ?? 0) - (publishAtMillis(a.data().publishAt) ?? 0));
      const promoted = await promoteDueScheduledPosts(visible, now);
      const doc = visible[0];
      const raw = doc.data();
      const merged = promoted.has(doc.id) ? { ...raw, status: "published" } : raw;
      res.json({ id: doc.id, ...merged });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Public Blog: Dynamic sitemap
  app.get("/api/blog/sitemap.xml", async (_req, res) => {
    if (!firebaseDb) { res.type("xml").send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'); return; }
    try {
      const now = admin.firestore.Timestamp.now();
      const snap = await firebaseDb.collection("blog_posts")
        .orderBy("publishAt", "desc")
        .limit(250)
        .get();
      await promoteDueScheduledPosts(snap.docs, now);
      let urls = `  <url>\n    <loc>https://blog.sooner.sh/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
      for (const d of snap.docs.filter((doc) => isBlogPostPublicVisible(doc.data(), now))) {
        const data = d.data();
        const date = data.publishAt?.toDate?.()?.toISOString?.()?.slice(0, 10) || "";
        const pathSlug = encodeURIComponent(String(data.slug ?? ""));
        urls += `  <url>\n    <loc>https://blog.sooner.sh/${pathSlug}</loc>\n    <lastmod>${date}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      }
      res.type("xml").send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>`);
    } catch (e: any) { res.status(500).send("Error generating sitemap"); }
  });

  /** Public base URL for image links (Railway: set PUBLIC_API_BASE_URL if Host header is wrong). */
  function imagePublicBaseUrl(req: express.Request): string {
    const fromEnv = process.env.PUBLIC_API_BASE_URL?.trim();
    if (fromEnv) return fromEnv.replace(/\/$/, "");
    const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
    return `${proto}://${host}`;
  }

  // Public: proxy blog images from Storage (no public bucket or long-lived signed URLs needed)
  app.get("/api/blog/image", async (req, res) => {
    if (!firebaseStorage) return res.status(503).json({ error: "Storage not configured" });
    const raw = req.query.p;
    if (typeof raw !== "string" || !raw.startsWith("blog/images/") || raw.includes("..") || raw.includes("\\")) {
      return res.status(400).json({ error: "Invalid path" });
    }
    try {
      const bucket = firebaseStorage.bucket();
      const file = bucket.file(raw);
      const [exists] = await file.exists();
      if (!exists) return res.status(404).end();
      const [metadata] = await file.getMetadata();
      const ct = metadata.contentType || "application/octet-stream";
      res.setHeader("Content-Type", ct);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      const stream = file.createReadStream();
      stream.on("error", (err) => {
        console.error("blog/image stream:", err);
        if (!res.headersSent) res.status(500).end();
        else res.destroy();
      });
      stream.pipe(res);
    } catch (e: any) {
      console.error("blog/image:", e);
      res.status(500).json({ error: e.message || "Failed to load image" });
    }
  });

  // --- Page view tracking ---
  app.post("/api/blog/posts/:slug/view", async (req, res) => {
    if (!firebaseDb) return res.status(503).json({ error: "Firestore not configured" });
    try {
      const now = admin.firestore.Timestamp.now();
      const snap = await firebaseDb.collection("blog_posts")
        .where("slug", "==", req.params.slug)
        .limit(20)
        .get();
      if (snap.empty) return res.status(404).json({ error: "Not found" });
      const visible = snap.docs.filter((d) => isBlogPostPublicVisible(d.data(), now));
      if (!visible.length) return res.status(404).json({ error: "Not found" });
      visible.sort((a, b) => (publishAtMillis(b.data().publishAt) ?? 0) - (publishAtMillis(a.data().publishAt) ?? 0));
      await promoteDueScheduledPosts(visible, now);
      const docRef = visible[0].ref;
      await docRef.update({ viewCount: admin.firestore.FieldValue.increment(1) });
      const updated = await docRef.get();
      res.json({ viewCount: updated.data()?.viewCount || 0 });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- CMS: Blog image upload to Firebase Storage (multipart binary — no base64) ---
  app.post("/api/cms/upload-image", requireCmsAuth, cmsImageUpload.single("file"), async (req, res) => {
    if (!firebaseStorage) return res.status(503).json({ error: "Storage not configured" });
    const up = req.file;
    if (!up?.buffer) return res.status(400).json({ error: "file required (multipart field name: file)" });
    try {
      const bucket = firebaseStorage.bucket();
      const safeName = String(up.originalname || "image.png").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
      const storagePath = `blog/images/${Date.now()}_${safeName}`;
      const file = bucket.file(storagePath);
      const contentType = up.mimetype || "image/png";

      await file.save(up.buffer, {
        contentType,
        metadata: { cacheControl: "public, max-age=31536000" },
      });

      const baseUrl = imagePublicBaseUrl(req);
      const publicUrl = `${baseUrl}/api/blog/image?p=${encodeURIComponent(storagePath)}`;

      res.json({ url: publicUrl, path: storagePath });
    } catch (e: any) {
      console.error("upload-image:", e);
      res.status(500).json({ error: e.message || "Upload failed" });
    }
  });

  // --- Health check ---
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // --- Vite Middleware (dev only) / Static files (local production) ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (process.env.RAILWAY_ENVIRONMENT) {
    // On Railway: API-only mode, no static file serving
    app.get("/", (_req, res) => {
      res.json({ service: "Sooner API", status: "running" });
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    const e = err as { code?: string; name?: string; message?: string };
    if (e?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "Image too large (max 25MB)" });
    }
    if (e?.name === "MulterError") {
      return res.status(400).json({ error: e.message || "Upload failed" });
    }
    next(err);
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} (${process.env.NODE_ENV || "development"})`);
    execFile("git", ["--version"], { timeout: 5000 }, (e, out) => {
      if (e) console.error("[Sooner] git not found in PATH — clone/push/pull will fail:", (e as Error).message);
      else console.log("[Sooner]", out?.trim());
    });
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
