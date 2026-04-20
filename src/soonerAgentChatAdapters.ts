import type { UIMessage } from "ai";
import type { ChatMessage } from "./types";

type ToolLike = {
  type: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

const LIM = {
  persistence: { cmdOut: 4000, cmdErr: 2000, readFile: 2500, genericJson: 1800 },
  display: { cmdOut: 48000, cmdErr: 16000, readFile: 32000, genericJson: 12000 },
} as const;

function trunc(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n… [truncated, ${s.length - max} more chars]`;
}

/**
 * Human-readable tool payload for chat log persistence and on-screen display.
 * Avoids JSON.stringify on whole tool objects (which escapes newlines in stdout and looks like "mojibake").
 */
export function formatWorkspaceToolPayload(part: ToolLike, mode: "persistence" | "display"): string {
  const lim = LIM[mode];
  const name = part.type.replace(/^tool-/, "");
  const state = part.state || "";
  const header = `── ${name}${state ? ` (${state})` : ""} ──`;
  const err = part.errorText?.trim();
  const lines: string[] = [header];
  if (err) lines.push(`Error: ${err}`);

  if (name === "run_command" && part.output && typeof part.output === "object") {
    const o = part.output as { ok?: boolean; stdout?: string; stderr?: string; exitCode?: number };
    lines.push(`exitCode: ${o.exitCode ?? "?"}\nok: ${String(o.ok)}`);
    const out = trunc(o.stdout || "", lim.cmdOut);
    const er = trunc(o.stderr || "", lim.cmdErr);
    if (out) lines.push(`\n--- stdout ---\n${out}`);
    if (er) lines.push(`\n--- stderr ---\n${er}`);
    return lines.join("\n");
  }

  if (name === "run_command_pipeline" && part.output && typeof part.output === "object") {
    const o = part.output as { steps?: unknown };
    lines.push(`steps: ${Array.isArray(o.steps) ? o.steps.length : 0}`);
    if (Array.isArray(o.steps)) {
      for (let i = 0; i < o.steps.length; i++) {
        const step = o.steps[i] as { ok?: boolean; stdout?: string; stderr?: string; exitCode?: number };
        lines.push(`\n[step ${i + 1}] exit=${step?.exitCode ?? "?"} ok=${String(step?.ok)}`);
        lines.push(trunc([step?.stdout, step?.stderr].filter(Boolean).join("\n"), lim.cmdOut));
      }
    } else {
      lines.push(trunc(JSON.stringify(o, null, 2), lim.genericJson));
    }
    return lines.join("\n");
  }

  if (name === "write_file") {
    const inp = part.input as { path?: string } | undefined;
    const o = part.output as { ok?: boolean; error?: string; path?: string } | undefined;
    lines.push(`path: ${inp?.path ?? o?.path ?? "?"}`);
    if (o != null) {
      lines.push(`ok: ${String(o.ok)}`);
      if (o.error) lines.push(`message: ${o.error}`);
    }
    return lines.join("\n");
  }

  if (name === "delete_file") {
    const inp = part.input as { path?: string } | undefined;
    const o = part.output as { ok?: boolean; error?: string } | undefined;
    lines.push(`path: ${inp?.path ?? "?"}`);
    if (o != null) {
      lines.push(`ok: ${String(o.ok)}`);
      if (o.error) lines.push(`message: ${o.error}`);
    }
    return lines.join("\n");
  }

  if (name === "read_file") {
    const inp = part.input as { path?: string } | undefined;
    const o = part.output as { ok?: boolean; path?: string; content?: string; error?: string } | undefined;
    lines.push(`path: ${inp?.path ?? o?.path ?? "?"}`);
    if (o != null) {
      lines.push(`ok: ${String(o.ok)}`);
      if (o.error) lines.push(`message: ${o.error}`);
      else if (typeof o.content === "string") lines.push(trunc(o.content, lim.readFile));
    }
    return lines.join("\n");
  }

  if (name === "list_directory") {
    if (part.output !== undefined) lines.push(trunc(JSON.stringify(part.output, null, 2), lim.genericJson));
    return lines.join("\n");
  }

  if (name.startsWith("mcp__")) {
    lines.push(
      trunc(
        JSON.stringify({ input: part.input, output: part.output }, null, 2),
        mode === "persistence" ? 2500 : lim.genericJson,
      ),
    );
    return lines.join("\n");
  }

  lines.push(
    trunc(
      JSON.stringify({ input: part.input, output: part.output }, null, 2),
      lim.genericJson,
    ),
  );
  return lines.join("\n");
}

/** Restore persisted simple chat into AI SDK UI messages (best-effort). */
export function chatMessagesToUi(messages: ChatMessage[]): UIMessage[] {
  return messages.map((m, i) => ({
    id: `hist-${i}-${m.role}`,
    role: m.role === "assistant" ? "assistant" : "user",
    parts: [{ type: "text", text: m.content }],
  })) as UIMessage[];
}

/** Flatten UI messages back to legacy storage format. */
export function uiMessagesToChat(messages: UIMessage[]): ChatMessage[] {
  return messages.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.parts
      .map((p) => {
        if (p.type === "text") return p.text;
        if (typeof p.type === "string" && p.type.startsWith("tool-")) {
          return `\n${formatWorkspaceToolPayload(p as ToolLike, "persistence")}`;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n"),
  }));
}
