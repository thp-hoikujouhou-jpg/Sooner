/**
 * OpenAI-compatible model list: GET {base}/v1/models (or {base}/models when base already ends with /v1).
 */

export function openAiCompatibleModelsListUrl(apiBase: string): string {
  const b = apiBase.trim().replace(/\/+$/, "");
  if (!b) return "";
  if (/\/v1\/models$/i.test(b)) return b;
  if (/\/v1$/i.test(b)) return `${b}/models`;
  return `${b}/v1/models`;
}

/** OpenAI-style chat completions POST target (OpenRouter, LiteLLM, etc.). */
export function openAiCompatibleChatCompletionsUrl(apiBase: string): string {
  const b = apiBase.trim().replace(/\/+$/, "");
  if (!b) return "";
  if (/\/v1\/chat\/completions$/i.test(b)) return b;
  if (/\/v1$/i.test(b)) return `${b}/chat/completions`;
  return `${b}/v1/chat/completions`;
}

/** Parses typical OpenAI-style `{ data: [{ id }] }` and a few variants. */
export function parseOpenAiCompatibleModelsResponse(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const o = body as Record<string, unknown>;
  const raw = o.data ?? o.models;
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.length > 0) out.push(item);
    else if (item && typeof item === "object" && typeof (item as { id?: string }).id === "string") {
      out.push((item as { id: string }).id);
    }
  }
  return [...new Set(out)].filter(Boolean).sort();
}
