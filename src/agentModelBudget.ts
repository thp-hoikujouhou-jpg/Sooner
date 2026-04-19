/**
 * Rough **input** context limits (tokens) for sizing agent plan prompts.
 * Tokenizers differ; we use conservative char budgets (~2 chars / token for mixed code + Japanese).
 */

export function estimateModelContextTokens(model: string): number {
  const m = model.trim().toLowerCase().replace(/^google\//, "");
  if (m.includes("gemini-2.5")) return 1_048_576;
  /** Many 2.0 Flash tiers expose ~192k–200k **input** tokens; stay under to avoid 400 overflow. */
  if (m.includes("gemini-2.0")) return 196_608;
  if (m.includes("gemini-1.5")) return 1_048_576;
  if (m.includes("gemini-exp") || m.includes("gemini-experimental")) return 1_048_576;
  if (m.includes("gemini-1.0") || m === "gemini-pro") return 32_768;
  if (m.includes("gemini")) return 196_608;
  if (m.includes("claude-opus") || m.includes("claude-sonnet-4") || m.includes("claude-3-5")) return 200_000;
  if (m.includes("claude")) return 200_000;
  if (m.includes("gpt-5") || m.includes("gpt-4.1") || m.includes("gpt-4o") || m.includes("o3") || m.includes("o4")) return 128_000;
  if (m.includes("gpt-4")) return 128_000;
  if (m.includes("gpt-3.5")) return 16_385;
  return 128_000;
}

export type AgentPlanCharBudget = {
  /** Total chars allowed for all file excerpts combined */
  maxCharsForFiles: number;
  /** Initial per-file cap (may shrink when splitting budget) */
  perFileCap: number;
  /** Max number of files to include excerpts for */
  maxFiles: number;
  maxHistoryChars: number;
  maxTreeChars: number;
  contextTokens: number;
};

/**
 * Reserve fraction of context for system template, JSON instructions, model output, and safety.
 */
export function computeAgentPlanCharBudget(model: string, reservedFraction = 0.34): AgentPlanCharBudget {
  const contextTokens = estimateModelContextTokens(model);
  const usableTokens = Math.max(4096, Math.floor(contextTokens * (1 - reservedFraction)));
  /** ~1.35 chars/token conservative for mixed Japanese + code (CJK can tokenize denser than English). */
  const usableChars = Math.floor(usableTokens * 1.35);
  const templateReserve = Math.min(55_000, Math.floor(usableChars * 0.18));
  const rest = Math.max(24_000, usableChars - templateReserve);
  const maxHistoryChars = Math.min(48_000, Math.floor(rest * 0.14));
  const maxTreeChars = Math.min(14_000, Math.floor(rest * 0.07));
  const maxCharsForFiles = Math.max(16_000, rest - maxHistoryChars - maxTreeChars);
  const maxFiles = Math.min(100, Math.max(6, Math.floor(maxCharsForFiles / 6000)));
  const perFileCap = Math.max(1200, Math.floor(maxCharsForFiles / Math.max(1, maxFiles)));
  return {
    maxCharsForFiles,
    perFileCap,
    maxFiles,
    maxHistoryChars,
    maxTreeChars,
    contextTokens,
  };
}

export function truncateAgentHistory(history: string, maxChars: number, lang: "en" | "ja"): string {
  if (history.length <= maxChars) return history;
  const note =
    lang === "ja"
      ? "…（以前の会話はモデルのコンテキスト上限のため省略）\n\n"
      : "…(earlier conversation omitted to fit the model context limit)\n\n";
  return note + history.slice(history.length - maxChars);
}

export function stringifyFileTreeForAgent(files: unknown, maxChars: number): string {
  try {
    const s = JSON.stringify(files);
    if (s.length <= maxChars) return s;
    return `${s.slice(0, maxChars)}\n/* file tree JSON truncated for model context */`;
  } catch {
    return "(file tree unavailable)";
  }
}

export type FileSnippet = { path: string; content: string };

/**
 * Greedy pack: prefer smaller files first so more files fit; hard cap file count.
 */
export function buildPlanFileSnippets(
  files: FileSnippet[],
  budget: AgentPlanCharBudget,
  lang: "en" | "ja",
): string {
  if (files.length === 0) return "(empty project)";
  const sorted = [...files].sort((a, b) => a.content.length - b.content.length);
  const capCount = Math.min(budget.maxFiles, sorted.length);
  const take = sorted.slice(0, capCount);
  let remaining = budget.maxCharsForFiles;
  const parts: string[] = [];
  const header =
    lang === "ja"
      ? `（全 ${files.length} ファイル中 ${take.length} 件を抜粋。モデル「約${Math.round(budget.contextTokens / 1000)}k」トークン想定内に収めています。大きいリポジトリはチャットで対象ファイルを指定してください。）\n\n`
      : `(${take.length} of ${files.length} files excerpted to fit ~${Math.round(budget.contextTokens / 1000)}k-token model budget. For huge repos, name target files in chat.)\n\n`;

  for (let i = 0; i < take.length; i++) {
    const f = take[i];
    const slotsLeft = take.length - i;
    const cap = Math.max(400, Math.min(budget.perFileCap, Math.floor(remaining / Math.max(1, slotsLeft))));
    const chunk = `--- ${f.path} ---\n${f.content.slice(0, cap)}${f.content.length > cap ? "\n... (truncated)" : ""}`;
    parts.push(chunk);
    remaining -= chunk.length;
    if (remaining < 0) break;
  }
  return header + parts.join("\n\n");
}
