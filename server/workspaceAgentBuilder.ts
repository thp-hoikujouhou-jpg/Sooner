import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { ToolLoopAgent, tool, zodSchema, stepCountIs } from "ai";
import type { LanguageModel } from "ai";
import { z } from "zod";
import { terminalCommandBlockedReason } from "./terminalSafety";
import type { WorkspaceAgentContext } from "./workspaceAgentContext";
import { buildMcpConfigToolMap } from "./workspaceMcpClients";

const execAsync = promisify(exec);

const READ_FILE_MAX_BYTES = 800_000;

export type { WorkspaceAgentContext } from "./workspaceAgentContext";

export function isAgentDeletablePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== "string") return false;
  const p = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (p.includes("..") || p.split("/").some((seg) => seg === "..")) return false;
  if (p.startsWith(".sooner_") || p.startsWith(".aether_")) return false;
  if (p === ".sooner_project") return false;
  return true;
}

const EPHEMERAL_SECRETS_MAX = 48_000;

function systemPrompt(language: "en" | "ja"): string {
  const lang = language === "ja" ? "日本語で簡潔に答えてください。" : "Respond concisely in English.";
  const mcpHint =
    language === "ja"
      ? "プロジェクト直下の mcp-config.json で宣言された外部 MCP サーバーのツールは、名前が mcp__ で始まります（必要なときだけ使ってください）。"
      : "Tools from external MCP servers declared in mcp-config.json at the project root have names starting with mcp__ (use them when they help the task).";
  return `You are Sooner, an AI-native IDE assistant with direct access to the user's active project on the workspace server.
${lang}
Use tools to inspect (read_file, list_directory), edit files, and run shell commands when needed. Prefer small, targeted edits for bugfixes.
For run_command and run_command_pipeline, the user must approve in the UI before execution (one approval per tool call; pipeline runs multiple commands in order after a single approval).
Never delete or overwrite paths under .sooner_, .aether_, or the file .sooner_project.
${mcpHint}
Return helpful natural language in addition to tool use when explaining.`;
}

/** User-supplied secrets for one request only (not stored in chat); appended to instructions. */
function ephemeralSecretsBlock(language: "en" | "ja", raw: string): string {
  const intro =
    language === "ja"
      ? "【このリクエスト専用の機密（チャット履歴や会話欄のユーザー本文には含まれない）】\n次のブロックのみを参照し、必要最小限で利用してください。応答に全文をそのまま貼り付けないでください。"
      : "[Ephemeral user-provided secrets for this request only — not stored in chat or in the visible user message]\nUse only as needed; never paste the full block verbatim into your reply.";
  return `\n\n${intro}\n<<<USER_EPHEMERAL_SECRETS>>>\n${raw}\n<<<END_USER_EPHEMERAL_SECRETS>>>`;
}

/** Shared by the workspace agent and the MCP HTTP bridge. */
export async function runWorkspaceShellCommand(
  ctx: WorkspaceAgentContext,
  command: string,
): Promise<
  | { ok: true; stdout: string; stderr: string; exitCode: 0 }
  | { ok: false; stdout: string; stderr: string; exitCode: number; error?: string }
> {
  const cmd = command.trim();
  const blocked = terminalCommandBlockedReason(cmd);
  if (blocked) return { ok: false, stdout: "", stderr: blocked, exitCode: 1, error: blocked };
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: ctx.projectRoot,
      timeout: 120000,
      maxBuffer: 20 * 1024 * 1024,
      env: { ...process.env, CI: "1" },
    });
    return { ok: true, stdout: stdout || "", stderr: stderr || "", exitCode: 0 };
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; code?: number; message?: string };
    return {
      ok: false,
      stdout: err.stdout || "",
      stderr: err.stderr || err.message || String(e),
      exitCode: typeof err.code === "number" ? err.code : 1,
    };
  }
}

export async function buildSoonerWorkspaceAgent(
  model: LanguageModel,
  ctx: WorkspaceAgentContext,
  language: "en" | "ja",
  opts?: { ephemeralSecrets?: string },
): Promise<{ agent: ToolLoopAgent; dispose: () => Promise<void> }> {
  const { tools: mcpTools, dispose } = await buildMcpConfigToolMap(ctx);
  const rawEphemeral = String(opts?.ephemeralSecrets || "").trim();
  const clipped =
    rawEphemeral.length > EPHEMERAL_SECRETS_MAX
      ? `${rawEphemeral.slice(0, EPHEMERAL_SECRETS_MAX)}\n… [truncated at ${EPHEMERAL_SECRETS_MAX} chars]`
      : rawEphemeral;
  const instructions = systemPrompt(language) + (clipped ? ephemeralSecretsBlock(language, clipped) : "");
  const agent = new ToolLoopAgent({
    id: "sooner-workspace",
    model,
    instructions,
    stopWhen: stepCountIs(36),
    tools: {
      read_file: tool({
        description: "Read UTF-8 text from a file under the project root (relative path).",
        inputSchema: zodSchema(z.object({ path: z.string().describe("Relative path, e.g. src/App.tsx") })),
        execute: async ({ path: rel }) => {
          if (!isAgentDeletablePath(rel)) return { ok: false as const, error: "Path not allowed" };
          const full = ctx.safeResolveRel(rel);
          if (!full) return { ok: false as const, error: "Invalid or unsafe path" };
          try {
            const buf = await fs.readFile(full);
            if (buf.length > READ_FILE_MAX_BYTES) {
              return { ok: false as const, error: `File too large (max ${READ_FILE_MAX_BYTES} bytes)` };
            }
            return { ok: true as const, path: rel, content: buf.toString("utf-8") };
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            return { ok: false as const, error: msg };
          }
        },
      }),
      list_directory: tool({
        description:
          "List files and folders in a directory relative to the project root (use empty or . for project root).",
        inputSchema: zodSchema(z.object({ path: z.string().optional().describe("Relative directory path") })),
        execute: async ({ path: relRaw }) => {
          const rel = (relRaw ?? ".").replace(/\\/g, "/").replace(/^\/+/, "") || ".";
          const full = ctx.safeResolveRel(rel);
          if (!full) return { ok: false as const, error: "Invalid or unsafe path" };
          try {
            const st = await fs.stat(full);
            if (!st.isDirectory()) return { ok: false as const, error: "Not a directory" };
            const names = (await fs.readdir(full)).filter(
              (n) => !n.startsWith(".sooner_") && !n.startsWith(".aether_"),
            );
            const entries = await Promise.all(
              names.map(async (name) => {
                const p = path.join(full, name);
                try {
                  const s = await fs.stat(p);
                  return { name, type: s.isDirectory() ? ("dir" as const) : ("file" as const) };
                } catch {
                  return { name, type: "unknown" as const };
                }
              }),
            );
            entries.sort((a, b) => a.name.localeCompare(b.name));
            return { ok: true as const, path: rel, entries };
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            return { ok: false as const, error: msg };
          }
        },
      }),
      write_file: tool({
        description: "Create or overwrite a file under the project root (relative path).",
        inputSchema: zodSchema(
          z.object({
            path: z.string().describe("Relative path, e.g. src/App.tsx"),
            content: z.string().describe("Full file contents"),
          }),
        ),
        execute: async ({ path: rel, content }) => {
          const full = ctx.safeResolveRel(rel);
          if (!full) return { ok: false as const, error: "Invalid or unsafe path" };
          await fs.mkdir(path.dirname(full), { recursive: true });
          await fs.writeFile(full, content, "utf-8");
          await ctx.uploadToStorage(rel.replace(/\\/g, "/").replace(/^\/+/, ""), content);
          return { ok: true as const, path: rel };
        },
      }),
      delete_file: tool({
        description: "Delete a file under the project root (relative path).",
        inputSchema: zodSchema(z.object({ path: z.string() })),
        execute: async ({ path: rel }) => {
          if (!isAgentDeletablePath(rel)) return { ok: false as const, error: "Path not allowed" };
          const full = ctx.safeResolveRel(rel);
          if (!full) return { ok: false as const, error: "Invalid or unsafe path" };
          try {
            await fs.unlink(full);
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            return { ok: false as const, error: msg };
          }
          await ctx.deleteFromStorage(rel.replace(/\\/g, "/").replace(/^\/+/, ""));
          return { ok: true as const, path: rel };
        },
      }),
      run_command: tool({
        description:
          "Run one shell command in the project directory (bash). Requires user approval in the UI before execution.",
        inputSchema: zodSchema(z.object({ command: z.string() })),
        needsApproval: true,
        execute: async ({ command }) => {
          const r = await runWorkspaceShellCommand(ctx, command);
          if (r.ok) return { ok: true as const, stdout: r.stdout, stderr: r.stderr, exitCode: 0 };
          return {
            ok: false as const,
            stdout: r.stdout,
            stderr: r.stderr,
            exitCode: r.exitCode,
            ...(r.error ? { error: r.error } : {}),
          };
        },
      }),
      run_command_pipeline: tool({
        description:
          "Run multiple shell commands in order in the project directory (single UI approval for the whole pipeline). Stops at first failure unless continueOnError is true.",
        inputSchema: zodSchema(
          z.object({
            commands: z.array(z.string()).min(1).max(24).describe("Shell commands to run sequentially"),
            continueOnError: z.boolean().optional().describe("If true, run all commands even when one fails"),
          }),
        ),
        needsApproval: true,
        execute: async ({ commands, continueOnError }) => {
          const steps: Awaited<ReturnType<typeof runWorkspaceShellCommand>>[] = [];
          for (const c of commands) {
            const r = await runWorkspaceShellCommand(ctx, c);
            steps.push(r);
            if (!r.ok && !continueOnError) break;
          }
          return { steps };
        },
      }),
      ...mcpTools,
    },
  }) as ToolLoopAgent;
  return { agent, dispose };
}
