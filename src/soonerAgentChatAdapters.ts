import type { UIMessage } from "ai";
import type { ChatMessage } from "./types";

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
          const t = p as {
            type: string;
            state?: string;
            input?: unknown;
            output?: unknown;
            errorText?: string;
          };
          const payload = JSON.stringify(
            { input: t.input, output: t.output, error: t.errorText },
            null,
            0,
          ).slice(0, 4000);
          return `\n[${t.type} ${t.state || ""}] ${payload}`;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n"),
  }));
}
