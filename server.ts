import express from "express";
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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(cors());
  app.use(bodyParser.json());

  const PROJECTS_ROOT = path.resolve(process.cwd(), "projects");

  try {
    await fs.mkdir(PROJECTS_ROOT, { recursive: true });
  } catch (e) {
    console.error("Failed to create projects directory:", e);
    process.exit(1);
  }

  // --- API Routes ---

  // GitHub Clone
  app.post("/api/projects/clone", async (req, res) => {
    const { repoUrl, name, token } = req.body;
    if (!repoUrl || !name) return res.status(400).json({ error: "Repo URL and name required" });

    if (!isValidName(name)) {
      return res.status(400).json({ error: "Invalid project name" });
    }

    const projectPath = safePath(PROJECTS_ROOT, name);
    if (!projectPath) {
      return res.status(400).json({ error: "Invalid project name" });
    }

    const args = ["clone"];
    if (token) {
      args.push("-c", `http.extraheader=AUTHORIZATION: basic ${Buffer.from(`token:${token}`).toString("base64")}`);
    }
    args.push("--", repoUrl, projectPath);

    execFile("git", args, { timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: "Failed to clone repo", details: stderr });
      }
      res.json({ message: "Project cloned", name });
    });
  });

  // File Upload
  app.post("/api/projects/:id/upload", async (req, res) => {
    const { id } = req.params;
    const { fileName, content } = req.body;
    if (!fileName) return res.status(400).json({ error: "File name required" });

    const fullPath = safePath(PROJECTS_ROOT, id, fileName);
    if (!fullPath) {
      return res.status(400).json({ error: "Invalid file path" });
    }

    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, "utf-8");
      res.json({ message: "File uploaded" });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // List projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await fs.readdir(PROJECTS_ROOT);
      res.json(projects);
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

    const projectPath = safePath(PROJECTS_ROOT, name);
    if (!projectPath) {
      return res.status(400).json({ error: "Invalid project name" });
    }

    try {
      await fs.mkdir(projectPath, { recursive: true });
      res.json({ message: "Project created", name });
    } catch (error) {
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  // Delete project
  app.delete("/api/projects/:id", async (req, res) => {
    const { id } = req.params;
    const projectPath = safePath(PROJECTS_ROOT, id);
    if (!projectPath) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    try {
      await fs.rm(projectPath, { recursive: true, force: true });
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

    const fullPath = safePath(PROJECTS_ROOT, id, filePath);
    if (!fullPath) {
      return res.status(400).json({ error: "Invalid file path" });
    }

    try {
      await fs.unlink(fullPath);
      res.json({ message: "File deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // List files in project
  app.get("/api/projects/:id/files", async (req, res) => {
    const { id } = req.params;
    const projectPath = safePath(PROJECTS_ROOT, id);
    if (!projectPath) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    async function getFiles(dir: string, base: string = ""): Promise<any[]> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files = await Promise.all(entries.map(async (entry) => {
        const relativePath = path.join(base, entry.name);
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
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
      return files;
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

    const fullPath = safePath(PROJECTS_ROOT, id, filePath);
    if (!fullPath) {
      return res.status(400).json({ error: "Invalid file path" });
    }

    try {
      const content = await fs.readFile(fullPath, "utf-8");
      res.json({ content });
    } catch (error) {
      res.status(500).json({ error: "Failed to read file" });
    }
  });

  // Write file
  app.post("/api/projects/:id/file", async (req, res) => {
    const { id } = req.params;
    const { filePath, content } = req.body;
    if (!filePath) return res.status(400).json({ error: "File path required" });

    const fullPath = safePath(PROJECTS_ROOT, id, filePath);
    if (!fullPath) {
      return res.status(400).json({ error: "Invalid file path" });
    }

    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, "utf-8");
      res.json({ message: "File saved" });
    } catch (error) {
      res.status(500).json({ error: "Failed to write file" });
    }
  });

  // Terminal execution
  app.post("/api/projects/:id/terminal", async (req, res) => {
    const { id } = req.params;
    const { command } = req.body;

    if (!command || typeof command !== "string") {
      return res.status(400).json({ error: "Command is required" });
    }

    const projectPath = safePath(PROJECTS_ROOT, id);
    if (!projectPath) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    exec(command, { cwd: projectPath, timeout: 30000 }, (error, stdout, stderr) => {
      res.json({
        stdout,
        stderr,
        exitCode: error ? (typeof error.code === "number" ? error.code : 1) : 0
      });
    });
  });

  // Chat History Persistence
  app.get("/api/projects/:id/chat", async (req, res) => {
    const { id } = req.params;
    const projectPath = safePath(PROJECTS_ROOT, id);
    if (!projectPath) {
      return res.status(400).json({ error: "Invalid project id" });
    }
    const chatPath = path.join(projectPath, ".aether_chat.json");

    try {
      const content = await fs.readFile(chatPath, "utf-8");
      res.json(JSON.parse(content));
    } catch (e) {
      res.json([]);
    }
  });

  app.post("/api/projects/:id/chat", async (req, res) => {
    const { id } = req.params;
    const { messages } = req.body;
    const projectPath = safePath(PROJECTS_ROOT, id);
    if (!projectPath) {
      return res.status(400).json({ error: "Invalid project id" });
    }
    const chatPath = path.join(projectPath, ".aether_chat.json");

    try {
      await fs.writeFile(chatPath, JSON.stringify(messages, null, 2), "utf-8");
      res.json({ message: "Chat history saved" });
    } catch (e) {
      res.status(500).json({ error: "Failed to save chat history" });
    }
  });

  // Package management API
  app.get("/api/projects/:id/packages", async (req, res) => {
    const { id } = req.params;
    const projectPath = safePath(PROJECTS_ROOT, id);
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
    const projectPath = safePath(PROJECTS_ROOT, id);
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
      await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2), "utf-8");
      res.json({ message: `Added ${name}`, packages: pkg });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/projects/:id/packages", async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const projectPath = safePath(PROJECTS_ROOT, id);
    if (!projectPath) return res.status(400).json({ error: "Invalid project id" });

    try {
      const pkgPath = path.join(projectPath, "package.json");
      const pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"));
      if (pkg.dependencies) delete pkg.dependencies[name];
      if (pkg.devDependencies) delete pkg.devDependencies[name];
      await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2), "utf-8");
      res.json({ message: `Removed ${name}`, packages: pkg });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Flutter build state per project
  const buildState = new Map<string, { running: boolean; lines: string[]; done: boolean; success: boolean }>();

  // Start a Flutter build
  app.post("/api/projects/:id/build-preview", async (req, res) => {
    const { id } = req.params;
    const projectPath = safePath(PROJECTS_ROOT, id);
    if (!projectPath) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    try {
      const pubspecPath = path.join(projectPath, "pubspec.yaml");
      try { await fs.access(pubspecPath); } catch {
        return res.json({ type: "non-flutter", message: "Not a Flutter project" });
      }

      const flutterJsPath = path.join(projectPath, "build", "web", "flutter.js");
      try { await fs.access(flutterJsPath); return res.json({ type: "flutter", status: "already-built" }); } catch {}

      const existing = buildState.get(id);
      if (existing?.running) {
        return res.json({ type: "flutter", status: "building" });
      }

      const state = { running: true, lines: ["$ flutter build web"], done: false, success: false };
      buildState.set(id, state);

      const child = exec("flutter build web", { cwd: projectPath, timeout: 180000 });
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
        state.lines.push(built ? "Build completed successfully." : `Build finished with exit code ${code}.`);
      });

      res.json({ type: "flutter", status: "build-started" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Poll build progress
  app.get("/api/projects/:id/build-status", (req, res) => {
    const { id } = req.params;
    const state = buildState.get(id);
    if (!state) {
      return res.json({ status: "no-build" });
    }
    const since = parseInt(req.query.since as string) || 0;
    const newLines = state.lines.slice(since);
    res.json({ status: state.done ? (state.success ? "success" : "failed") : "building", lines: newLines, total: state.lines.length });
  });

  // === Backend project runner ===
  interface RunningProject {
    process: ChildProcess;
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
    const projectPath = safePath(PROJECTS_ROOT, id);
    if (!projectPath) return res.status(400).json({ error: "Invalid project id" });

    const ptype = await detectProjectType(projectPath);
    const running = runningProjects.get(id);
    res.json({
      detected: ptype ? ptype.type : "static",
      running: !!running,
      port: running?.port || null,
    });
  });

  // Start a backend project
  app.post("/api/projects/:id/run", async (req, res) => {
    const { id } = req.params;
    const projectPath = safePath(PROJECTS_ROOT, id);
    if (!projectPath) return res.status(400).json({ error: "Invalid project id" });

    if (runningProjects.has(id)) {
      const existing = runningProjects.get(id)!;
      return res.json({ status: "already-running", port: existing.port, type: existing.type });
    }

    const ptype = await detectProjectType(projectPath);
    if (!ptype) return res.json({ status: "static", message: "No backend detected" });

    const port = nextPort++;
    const env = { ...process.env, PORT: String(port) };
    const lines: string[] = [];

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
        runningProjects.delete(id);
      });
      runningProjects.set(id, { process: child, port, lines, type: ptype.type });
    };

    if (needsInstall) {
      lines.push("$ npm install  (this may take a minute...)");
      runningProjects.set(id, { process: null as any, port, lines, type: ptype.type });
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
          runningProjects.delete(id);
        }
      });
    } else {
      startServer();
      res.json({ status: "started", port, type: ptype.type });
    }
  });

  // Stop a running project
  app.post("/api/projects/:id/stop", (req, res) => {
    const { id } = req.params;
    const running = runningProjects.get(id);
    if (!running) return res.json({ status: "not-running" });

    running.process.kill("SIGTERM");
    setTimeout(() => {
      try { running.process.kill("SIGKILL"); } catch {}
    }, 3000);
    runningProjects.delete(id);
    res.json({ status: "stopped" });
  });

  // Get logs from running project
  app.get("/api/projects/:id/run-logs", (req, res) => {
    const { id } = req.params;
    const running = runningProjects.get(id);
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

  app.get("/preview/:id", async (req, res) => {
    const { id } = req.params;

    // Ensure trailing slash so relative URLs resolve correctly in the browser
    if (!req.originalUrl.endsWith("/")) {
      return res.redirect(301, req.originalUrl + "/");
    }

    const projectPath = safePath(PROJECTS_ROOT, id);
    if (!projectPath) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    // If a backend/devserver is running, proxy to it with base tag injection
    const running = runningProjects.get(id);
    if (running) {
      const base = `/preview/${encodeURIComponent(id)}/`;
      return proxyToBackend(req, res, running.port, "/", base);
    }

    const found = await findIndexHtml(projectPath);
    if (!found) {
      return res.status(404).send(`
        <html>
          <body style="background: #000; color: #8E9299; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
            <div style="text-align: center;">
              <h1 style="color: #38BDF8;">index.html not found</h1>
              <p>Create an index.html in your project root (or build/web/, public/, dist/) to preview.</p>
            </div>
          </body>
        </html>
      `);
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
        const baseHref = `/preview/${encodeURIComponent(id)}/${basePath}`;
        if (content.includes("<head>")) {
          content = content.replace("<head>", `<head><base href="${baseHref}">`);
        }
        return res.send(content);
      }

      const basePath = found.relDir ? `${found.relDir}/` : "";
      const baseHref = `/preview/${encodeURIComponent(id)}/${basePath}`;
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
  app.get("/preview/:id/*", async (req, res) => {
    const { id } = req.params;
    const filePath = req.params[0];

    // Proxy to backend if running
    const running = runningProjects.get(id);
    if (running) {
      return proxyToBackend(req, res, running.port, "/" + filePath);
    }

    const baseFullPath = safePath(PROJECTS_ROOT, id, filePath);
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

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
