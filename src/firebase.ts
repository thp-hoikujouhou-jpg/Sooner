import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  GithubAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  type Auth,
  type User,
} from "firebase/auth";
import {
  getStorage,
  ref,
  uploadString,
  getBytes,
  deleteObject,
  listAll,
  type FirebaseStorage,
} from "firebase/storage";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

const isConfigured = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;
let db: Firestore | null = null;

if (isConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  storage = getStorage(app);
  db = getFirestore(app);
}

function userStoragePath(uid: string, project: string, filePath?: string): string {
  const base = `users/${uid}/projects/${project}`;
  return filePath ? `${base}/${filePath}` : base;
}

export async function storageListProjects(uid: string): Promise<string[]> {
  if (!storage) return [];
  const listRef = ref(storage, `users/${uid}/projects`);
  try {
    const result = await listAll(listRef);
    return result.prefixes.map((p) => p.name);
  } catch {
    return [];
  }
}

export async function storageCreateProject(uid: string, projectName: string): Promise<void> {
  if (!storage) return;
  const markerRef = ref(storage, userStoragePath(uid, projectName, ".sooner_project"));
  await uploadString(markerRef, JSON.stringify({ created: new Date().toISOString() }));
}

export async function storageListFiles(uid: string, project: string): Promise<string[]> {
  if (!storage) return [];
  const prefix = userStoragePath(uid, project);
  const listRef = ref(storage, prefix);
  const result = await listAll(listRef);

  const files: string[] = [];
  for (const item of result.items) {
    const relativePath = item.fullPath.slice(prefix.length + 1);
    if (relativePath && relativePath !== ".sooner_project") {
      files.push(relativePath);
    }
  }

  async function recurse(prefixes: typeof result.prefixes) {
    for (const folderRef of prefixes) {
      const sub = await listAll(folderRef);
      for (const item of sub.items) {
        const relativePath = item.fullPath.slice(prefix.length + 1);
        if (relativePath) files.push(relativePath);
      }
      await recurse(sub.prefixes);
    }
  }
  await recurse(result.prefixes);
  return files;
}

export async function storageUploadFile(uid: string, project: string, filePath: string, content: string): Promise<void> {
  if (!storage) return;
  const fileRef = ref(storage, userStoragePath(uid, project, filePath));
  await uploadString(fileRef, content);
}

export async function storageDownloadFile(uid: string, project: string, filePath: string): Promise<string | null> {
  if (!storage) return null;
  try {
    const fileRef = ref(storage, userStoragePath(uid, project, filePath));
    const bytes = await getBytes(fileRef);
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return null;
  }
}

export async function storageDeleteFile(uid: string, project: string, filePath: string): Promise<void> {
  if (!storage) return;
  try {
    const fileRef = ref(storage, userStoragePath(uid, project, filePath));
    await deleteObject(fileRef);
  } catch {}
}

export async function storageDeleteProject(uid: string, project: string): Promise<void> {
  if (!storage) return;
  const files = await storageListFiles(uid, project);
  const prefix = userStoragePath(uid, project);
  for (const f of files) {
    try { await deleteObject(ref(storage, `${prefix}/${f}`)); } catch {}
  }
  try { await deleteObject(ref(storage, `${prefix}/.sooner_project`)); } catch {}
}

/** Firebase Storage string uploads can fail with 400 if the object is too large; keep chat JSON under a safe size. */
const MAX_CHAT_JSON_CHARS = 3_400_000;

function trimMessagesForStorage(messages: unknown[]): unknown[] {
  let list = messages;
  let json = JSON.stringify(list);
  let guard = 0;
  while (json.length > MAX_CHAT_JSON_CHARS && list.length > 1 && guard < 40) {
    const drop = Math.max(1, Math.floor(list.length * 0.25));
    list = list.slice(drop);
    json = JSON.stringify(list);
    guard++;
  }
  if (json.length > MAX_CHAT_JSON_CHARS) {
    return list.slice(-30);
  }
  return list;
}

export async function storageSaveChatHistory(uid: string, project: string, messages: unknown[]): Promise<void> {
  if (!storage) return;
  const fileRef = ref(storage, userStoragePath(uid, project, ".sooner_chat.json"));
  const toSave = trimMessagesForStorage(messages);
  await uploadString(fileRef, JSON.stringify(toSave));
}

export async function storageLoadChatHistory(uid: string, project: string): Promise<unknown[]> {
  const content = await storageDownloadFile(uid, project, ".sooner_chat.json");
  if (!content?.trim()) return [];
  try {
    const parsed = JSON.parse(content) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const MAX_TERMINAL_JSON_CHARS = 2_800_000;
const MAX_TERMINAL_LINES = 8000;

function trimTerminalLinesForStorage(lines: string[]): string[] {
  let list = lines;
  let json = JSON.stringify(list);
  let guard = 0;
  while (json.length > MAX_TERMINAL_JSON_CHARS && list.length > 50 && guard < 50) {
    const drop = Math.max(1, Math.floor(list.length * 0.15));
    list = list.slice(drop);
    json = JSON.stringify(list);
    guard++;
  }
  if (list.length > MAX_TERMINAL_LINES) {
    list = list.slice(-MAX_TERMINAL_LINES);
  }
  return list;
}

/** Per-project terminal log (JSON array of lines), same storage layout as chat history. */
export async function storageSaveTerminalLog(uid: string, project: string, lines: string[]): Promise<void> {
  if (!storage) return;
  const fileRef = ref(storage, userStoragePath(uid, project, ".sooner_terminal.json"));
  const toSave = trimTerminalLinesForStorage(lines);
  await uploadString(fileRef, JSON.stringify(toSave));
}

export async function storageLoadTerminalLog(uid: string, project: string): Promise<string[]> {
  const content = await storageDownloadFile(uid, project, ".sooner_terminal.json");
  if (!content?.trim()) return [];
  try {
    const parsed = JSON.parse(content) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

/** New account: Firestore `users/{uid}` with legal consent facts (merge-safe). Requires Firestore rules allowing user to write own doc. */
export async function recordNewUserLegalProfile(
  uid: string,
  opts: {
    signupMethod: "email" | "google" | "github";
    locale: "en" | "ja";
    termsVersionId: string;
    privacyVersionId: string;
  }
): Promise<void> {
  if (!db) return;
  try {
    // OAuth flows: wait until Auth has the same uid, then refresh ID token so Firestore rules see request.auth.uid.
    for (let attempt = 0; attempt < 8; attempt++) {
      if (auth?.currentUser?.uid === uid) break;
      await new Promise((r) => setTimeout(r, 75));
    }
    if (!auth?.currentUser || auth.currentUser.uid !== uid) {
      console.warn("recordNewUserLegalProfile: signed-in user not ready or uid mismatch", { uid });
      return;
    }
    await auth.currentUser.getIdToken(true);
    await setDoc(
      doc(db, "users", uid),
      {
        profile: {
          signupMethod: opts.signupMethod,
          localeAtSignup: opts.locale,
          createdAt: serverTimestamp(),
        },
        legalConsent: {
          termsVersionId: opts.termsVersionId,
          privacyVersionId: opts.privacyVersionId,
          termsAcceptedAt: serverTimestamp(),
          privacyAcceptedAt: serverTimestamp(),
          recordedFactEn:
            "At account creation on sooner.sh (sign-in/sign-up only at /signin and /signup; legacy sign-in/sign-up hostnames removed from auth and hosting), the user confirmed they read and agree to the Terms of Service and Privacy Policy (checkboxes for email sign-up; equivalent confirmation before OAuth sign-up).",
          recordedFactJa:
            "アカウント作成時（sooner.sh、サインイン／新規登録は /signin および /signup のみ。認証専用の旧ホスト名は廃止し Firebase Authentication・ホスティング等から除外済み）に、利用規約およびプライバシーポリシーを読み内容に同意した旨（メール登録はチェックボックス、OAuth 登録はポップアップ前に同等の同意）を確認した事実。",
        },
      },
      { merge: true }
    );
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
    console.warn("recordNewUserLegalProfile:", code || e);
  }
}

export {
  db,
  auth,
  storage,
  isConfigured,
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc,
  serverTimestamp,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  GithubAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
};
export type { User };
