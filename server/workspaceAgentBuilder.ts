import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { ToolLoopAgent, tool, zodSchema, stepCountIs } from "ai";
import type { LanguageModel } from "ai";
import { z } from "zod";
import { terminalCommandBlockedReason } from "./terminalSafety";

const execAsync = promisify(exec);

export function isAgentDeletablePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== "string") return false;
  const p = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (p.includes("..") || p.split("/").some((seg) => seg === "..")) return false;
  if (p.startsWith(".sooner_") || p.startsWith(".aether_")) return false;
  if (p === ".sooner_project") return false;
  return true;
}

export type WorkspaceAgentContext = {
  projectRoot: string;
  uid: string;
  projectId: string;
  safeResolveRel: (rel: string) => string | null;
  uploadToStorage: (relPath: string, content: string) => Promise<void>;
  deleteFromStorage: (relPath: string) => Promise<void>;
};

function systemPrompt(language: "en" | "ja"): string {
  const lang = language === "ja" ? "日本語で簡潔に答えてください。" : "Respond concisely in English.";
  return `You are Sooner, an AI-native IDE assistant with direct access to the user's active project on the workspace server.
${lang}
Use tools to change files or run shell commands when needed. Prefer small, targeted edits for bugfixes.
For run_command, the user must approve each command in the UI before it executes.
Never delete or overwrite paths under .sooner_, .aether_, or the file .sooner_project.
Return helpful natural language in addition to tool use when explaining.`;
}

export function buildSoonerWorkspaceAgent(
  model: LanguageModel,
  ctx: WorkspaceAgentContext,
  language: "en" | "ja",
): ToolLoopAgent {
  return new ToolLoopAgent({
    id: "sooner-workspace",
    model,
    instructions: systemPrompt(language),
    stopWhen: stepCountIs(24),
    tools: {
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
          const cmd = command.trim();
          const blocked = terminalCommandBlockedReason(cmd);
          if (blocked) return { ok: false as const, error: blocked, stdout: "", stderr: blocked, exitCode: 1 };
          try {
            const { stdout, stderr } = await execAsync(cmd, {
              cwd: ctx.projectRoot,
              timeout: 120000,
              maxBuffer: 20 * 1024 * 1024,
              env: { ...process.env, CI: "1" },
            });
            return { ok: true as const, stdout: stdout || "", stderr: stderr || "", exitCode: 0 };
          } catch (e: unknown) {
            const err = e as { stdout?: string; stderr?: string; code?: number; message?: string };
            return {
              ok: false as const,
              stdout: err.stdout || "",
              stderr: err.stderr || err.message || String(e),
              exitCode: typeof err.code === "number" ? err.code : 1,
            };
          }
        },
      }),
    },
  }) as ToolLoopAgent;
}
