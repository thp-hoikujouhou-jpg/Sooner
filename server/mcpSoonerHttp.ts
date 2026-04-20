import type { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { isAgentDeletablePath, runWorkspaceShellCommand } from "./workspaceAgentBuilder";
import type { WorkspaceAgentContext } from "./workspaceAgentContext";

const READ_MAX_BYTES = 800_000;

function jsonResult(obj: unknown, isError?: boolean) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(obj, null, 0) }],
    ...(isError ? { isError: true as const } : {}),
  };
}

/**
 * Streamable HTTP MCP endpoint for external clients (Cursor, Claude Desktop, etc.).
 * Auth: same Firebase Bearer token as other workspace APIs.
 * Scope: pass the project id in header `X-Sooner-Project` (or query `project`).
 * Tools run in the user's sandboxed project directory — no UI approval (caller is trusted OAuth context).
 */
export async function handleSoonerMcpHttpRequest(req: Request, res: Response, ctx: WorkspaceAgentContext): Promise<void> {
  const mcp = new McpServer(
    { name: "sooner-workspace", version: "1.0.0" },
    {
      instructions:
        "Sooner workspace MCP: tools operate inside the authenticated user's active project directory only. " +
        "Use run_terminal for one command, run_terminal_pipeline for multiple steps, read_file / write_file / delete_file / list_directory for files.",
    },
  );

  mcp.registerTool(
    "run_terminal",
    {
      description: "Run one shell command in the project root (same cwd as the web IDE terminal).",
      inputSchema: { command: z.string().describe("Full shell command") },
    },
    async ({ command }) => {
      const r = await runWorkspaceShellCommand(ctx, command);
      return jsonResult(r, !r.ok);
    },
  );

  mcp.registerTool(
    "run_terminal_pipeline",
    {
      description:
        "Run several shell commands sequentially in the project directory (stops at first non-zero exit unless continueOnError).",
      inputSchema: {
        commands: z.array(z.string()).min(1).max(24).describe("Commands in order"),
        continueOnError: z.boolean().optional().describe("If true, run all commands regardless of exit code"),
      },
    },
    async ({ commands, continueOnError }) => {
      const results: Awaited<ReturnType<typeof runWorkspaceShellCommand>>[] = [];
      for (const c of commands) {
        const r = await runWorkspaceShellCommand(ctx, c);
        results.push(r);
        if (!r.ok && !continueOnError) break;
      }
      const anyFail = results.some((x) => !x.ok);
      return jsonResult({ steps: results }, anyFail);
    },
  );

  mcp.registerTool(
    "read_file",
    {
      description: "Read a UTF-8 text file under the project root (relative path).",
      inputSchema: { path: z.string().describe("Relative path, e.g. src/App.tsx") },
    },
    async ({ path: rel }) => {
      if (!isAgentDeletablePath(rel)) {
        return jsonResult({ ok: false, error: "Path not allowed" }, true);
      }
      const full = ctx.safeResolveRel(rel);
      if (!full) return jsonResult({ ok: false, error: "Invalid or unsafe path" }, true);
      try {
        const buf = await fs.readFile(full);
        if (buf.length > READ_MAX_BYTES) {
          return jsonResult({ ok: false, error: `File too large (max ${READ_MAX_BYTES} bytes)` }, true);
        }
        return jsonResult({ ok: true, path: rel, content: buf.toString("utf-8") });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return jsonResult({ ok: false, error: msg }, true);
      }
    },
  );

  mcp.registerTool(
    "write_file",
    {
      description: "Create or overwrite a file under the project root.",
      inputSchema: {
        path: z.string(),
        content: z.string(),
      },
    },
    async ({ path: rel, content }) => {
      const full = ctx.safeResolveRel(rel);
      if (!full) return jsonResult({ ok: false, error: "Invalid or unsafe path" }, true);
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, content, "utf-8");
      await ctx.uploadToStorage(rel.replace(/\\/g, "/").replace(/^\/+/, ""), content);
      return jsonResult({ ok: true, path: rel });
    },
  );

  mcp.registerTool(
    "delete_file",
    {
      description: "Delete a file under the project root (cannot delete .sooner_* metadata).",
      inputSchema: { path: z.string() },
    },
    async ({ path: rel }) => {
      if (!isAgentDeletablePath(rel)) return jsonResult({ ok: false, error: "Path not allowed" }, true);
      const full = ctx.safeResolveRel(rel);
      if (!full) return jsonResult({ ok: false, error: "Invalid or unsafe path" }, true);
      try {
        await fs.unlink(full);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return jsonResult({ ok: false, error: msg }, true);
      }
      await ctx.deleteFromStorage(rel.replace(/\\/g, "/").replace(/^\/+/, ""));
      return jsonResult({ ok: true, path: rel });
    },
  );

  mcp.registerTool(
    "list_directory",
    {
      description: "List files and subdirectories in a path relative to project root (default .).",
      inputSchema: {
        path: z.string().optional().describe("Relative directory; empty or omitted for project root"),
      },
    },
    async (args) => {
      const rel = (args.path ?? ".").replace(/\\/g, "/").replace(/^\/+/, "") || ".";
      const full = ctx.safeResolveRel(rel);
      if (!full) return jsonResult({ ok: false, error: "Invalid or unsafe path" }, true);
      try {
        const st = await fs.stat(full);
        if (!st.isDirectory()) {
          return jsonResult({ ok: false, error: "Not a directory" }, true);
        }
        const names = (await fs.readdir(full)).filter(
          (name) => !name.startsWith(".sooner_") && !name.startsWith(".aether_"),
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
        return jsonResult({ ok: true, path: rel, entries });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return jsonResult({ ok: false, error: msg }, true);
      }
    },
  );

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await mcp.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
