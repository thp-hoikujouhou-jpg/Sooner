/**
 * Gemini REST helpers: list models that support generateContent, optional SSE stream.
 */

import axios from "axios";

const DEFAULT_GEMINI_REST = "https://generativelanguage.googleapis.com/v1beta";

export function geminiRestRoot(baseUrl?: string): string {
  const b = baseUrl?.trim().replace(/\/+$/, "");
  return b && b.length > 0 ? b : DEFAULT_GEMINI_REST;
}

function listModelsHeaders(apiKey: string, root: string): Record<string, string> {
  const isGoogleHosted = root.includes("generativelanguage.googleapis.com");
  if (isGoogleHosted) return { "x-goog-api-key": apiKey };
  return { Authorization: `Bearer ${apiKey}`, "x-goog-api-key": apiKey };
}

/** Model ids (no `models/` prefix) that support the Gemini generateContent API. */
export async function listGeminiGenerateContentModelIds(apiKey: string, baseUrl?: string): Promise<string[]> {
  const root = geminiRestRoot(baseUrl);
  const res = await axios.get<{ models?: unknown[] }>(`${root}/models`, {
    headers: listModelsHeaders(apiKey, root),
  });
  const models = res.data?.models;
  if (!Array.isArray(models)) return [];
  const out: string[] = [];
  for (const raw of models) {
    const m = raw as {
      name?: string;
      supportedGenerationMethods?: string[];
    };
    const methods = m.supportedGenerationMethods;
    if (!Array.isArray(methods) || !methods.includes("generateContent")) continue;
    const name = String(m.name || "").replace(/^models\//, "");
    if (name) out.push(name);
  }
  return [...new Set(out)].sort();
}

function extractStreamedText(obj: unknown): string {
  if (!obj || typeof obj !== "object") return "";
  const c = (obj as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates?.[0]?.content
    ?.parts;
  if (!Array.isArray(c)) return "";
  return c.map((p) => (typeof p?.text === "string" ? p.text : "")).join("");
}

/**
 * streamGenerateContent (SSE). Returns full text when the stream ends.
 * @see https://ai.google.dev/api/rest/v1beta/models/streamGenerateContent
 */
export async function geminiStreamGenerateContent(params: {
  apiKey: string;
  baseUrl?: string;
  model: string;
  body: Record<string, unknown>;
  onText: (accumulated: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const root = geminiRestRoot(params.baseUrl);
  const m = params.model.replace(/^models\//, "");
  const url = `${root}/models/${encodeURIComponent(m)}:streamGenerateContent?alt=sse`;
  const isGoogleHosted = root.includes("generativelanguage.googleapis.com");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(isGoogleHosted ? { "x-goog-api-key": params.apiKey } : { Authorization: `Bearer ${params.apiKey}` }),
  };
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(params.body),
    signal: params.signal,
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(errBody || `Gemini stream HTTP ${res.status}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const json = trimmed.slice(5).trim();
      if (!json || json === "[DONE]") continue;
      try {
        const obj = JSON.parse(json) as unknown;
        const piece = extractStreamedText(obj);
        if (piece) {
          accumulated += piece;
          params.onText(accumulated);
        }
      } catch {
        /* ignore malformed SSE line */
      }
    }
  }
  const tail = buffer.trim();
  if (tail.startsWith("data:")) {
    const json = tail.slice(5).trim();
    if (json && json !== "[DONE]") {
      try {
        const piece = extractStreamedText(JSON.parse(json));
        if (piece) {
          accumulated += piece;
          params.onText(accumulated);
        }
      } catch {
        /* ignore */
      }
    }
  }
  return accumulated;
}
