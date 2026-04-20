import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  AlertCircle,
  CheckCircle2,
  FileCode,
  History,
  Loader2,
  Paperclip,
  Send,
  Square,
  X,
} from "lucide-react";
import { chatMessagesToUi, uiMessagesToChat } from "./soonerAgentChatAdapters";
import type { ChatMessage } from "./types";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SoonerAiAgentPanelProps = {
  backendUrl: string;
  language: "en" | "ja";
  uid: string | null;
  activeProject: string | null;
  apiProvider: "gemini" | "vercel-ai-gateway" | "custom";
  selectedModel: string;
  geminiKey: string;
  vercelKey: string;
  customKey: string;
  openrouterBase: string;
  getIdToken: () => Promise<string | null>;
  /** Legacy persisted messages (plain text) — shown until user sends in this session. */
  initialPersistedMessages: ChatMessage[];
  onPersistMessages: (messages: ChatMessage[]) => void;
  onWorkspaceChanged: () => void;
  onTerminalMirror?: (text: string) => void;
  activeFile: string | null;
  contextAttachments: { name: string; text: string }[];
  onSetContextAttachments: React.Dispatch<React.SetStateAction<{ name: string; text: string }[]>>;
  attachOpenEditorBuffer: () => void;
  translations: {
    placeholderUnified: string;
    attachFiles: string;
    attachOpenFile: string;
    attachRemoveAria: string;
    attachmentsHint: string;
    clear: string;
    stop: string;
    you: string;
    assistantLabel: string;
    noProjectHint: string;
    noApiKeyHint: string;
    deny: string;
    approveRun: string;
  };
  onBusyChange?: (busy: boolean) => void;
  /** When this counter changes, the draft textarea is filled with `draftPrefillText` (e.g. Git → chat assist). */
  draftPrefillSeq?: number;
  draftPrefillText?: string;
};

export type SoonerAiAgentPanelHandle = {
  stop: () => void;
};

function isToolPart(p: { type: string }): p is { type: `tool-${string}` } & Record<string, unknown> {
  return typeof p.type === "string" && p.type.startsWith("tool-");
}

export const SoonerAiAgentPanel = React.forwardRef<SoonerAiAgentPanelHandle, SoonerAiAgentPanelProps>(
  function SoonerAiAgentPanel(
  {
  backendUrl,
  language,
  uid,
  activeProject,
  apiProvider,
  selectedModel,
  geminiKey,
  vercelKey,
  customKey,
  openrouterBase,
  getIdToken,
  initialPersistedMessages,
  onPersistMessages,
  onWorkspaceChanged,
  onTerminalMirror,
  activeFile,
  contextAttachments,
  onSetContextAttachments,
  attachOpenEditorBuffer,
  translations: t,
  onBusyChange,
  draftPrefillSeq = 0,
  draftPrefillText = "",
}: SoonerAiAgentPanelProps,
  ref,
) {
  const [draft, setDraft] = useState("");
  const chatId = `${uid || "anon"}::${activeProject || "none"}`;
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${backendUrl.replace(/\/$/, "")}/api/ai/workspace-agent`,
        credentials: "omit",
        headers: async () => {
          const token = await getIdToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        body: async () => ({
          projectId: activeProject,
          provider: apiProvider,
          selectedModel,
          language,
          geminiKey: apiProvider === "gemini" ? geminiKey : "",
          gatewayKey: apiProvider === "vercel-ai-gateway" ? vercelKey : "",
          customKey: apiProvider === "custom" ? customKey : "",
          openrouterBase: apiProvider === "custom" ? openrouterBase : "",
        }),
      }),
    [
      backendUrl,
      activeProject,
      apiProvider,
      selectedModel,
      language,
      geminiKey,
      vercelKey,
      customKey,
      openrouterBase,
      getIdToken,
    ],
  );

  const { messages, sendMessage, status, stop, addToolApprovalResponse, error, setMessages } = useChat({
    id: chatId,
    transport,
    messages: (initialPersistedMessages.length
      ? chatMessagesToUi(initialPersistedMessages)
      : []) as UIMessage[],
    onFinish: () => {
      onWorkspaceChanged();
    },
  });

  useImperativeHandle(ref, () => ({ stop: () => stop() }), [stop]);

  const lastPrefillSeq = useRef(0);
  useEffect(() => {
    if (!draftPrefillSeq || draftPrefillSeq === lastPrefillSeq.current) return;
    lastPrefillSeq.current = draftPrefillSeq;
    if (draftPrefillText) setDraft(draftPrefillText);
  }, [draftPrefillSeq, draftPrefillText]);

  const busy = status !== "ready";
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      onPersistMessages(uiMessagesToChat(messages));
    }, 500);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [messages, onPersistMessages]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const hasApiKey =
    apiProvider === "gemini"
      ? !!geminiKey.trim()
      : apiProvider === "vercel-ai-gateway"
        ? !!vercelKey.trim()
        : !!customKey.trim();

  const submit = useCallback(async () => {
    const text = draft.trim();
    if ((!text && contextAttachments.length === 0) || !activeProject || !backendUrl || !hasApiKey) return;
    const attachBlock =
      contextAttachments.length === 0
        ? ""
        : "\n\n<<<USER-ATTACHED-FILES>>>\n" +
          contextAttachments.map((a) => `=== ${a.name} ===\n${a.text}`).join("\n\n") +
          "\n<<<END-ATTACHED>>>\n";
    setDraft("");
    onSetContextAttachments([]);
    await sendMessage({ text: (text || (language === "ja" ? "（添付のみ）" : "(Attachments only)")) + attachBlock });
  }, [
    draft,
    contextAttachments,
    activeProject,
    backendUrl,
    hasApiKey,
    sendMessage,
    language,
    onSetContextAttachments,
  ]);

  const clearLocal = useCallback(() => {
    setMessages([]);
    onPersistMessages([]);
    setDraft("");
    onSetContextAttachments([]);
  }, [setMessages, onPersistMessages, onSetContextAttachments]);

  const renderPart = useCallback(
    (message: UIMessage, part: unknown, idx: number) => {
      if (!part || typeof part !== "object" || !("type" in part)) return null;
      const p = part as { type: string };
      if (p.type === "text") {
        const tp = part as unknown as { text?: string };
        return (
          <div key={idx} className="leading-relaxed whitespace-pre-wrap text-[#E4E3E0]">
            {tp.text ?? ""}
          </div>
        );
      }
      if (isToolPart(p)) {
        const tool = part as {
          type: string;
          state?: string;
          input?: { path?: string; command?: string; content?: string };
          output?: unknown;
          errorText?: string;
          approval?: { id: string };
        };
        const name = tool.type.replace(/^tool-/, "");
        const needsShellApproval =
          tool.state === "approval-requested" &&
          tool.approval?.id &&
          (name === "run_command" || name === "run_command_pipeline");
        if (needsShellApproval) {
          const preview =
            name === "run_command_pipeline"
              ? (Array.isArray(tool.input?.commands) ? tool.input!.commands! : []).join("\n")
              : String(tool.input?.command || "");
          return (
            <div
              key={idx}
              className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2 text-[11px]"
            >
              <div className="text-amber-200 font-semibold">
                {language === "ja"
                  ? name === "run_command_pipeline"
                    ? "シェルパイプラインの承認（複数コマンド）"
                    : "シェルコマンドの承認"
                  : name === "run_command_pipeline"
                    ? "Approve shell pipeline (multiple commands)"
                    : "Approve shell command"}
              </div>
              <pre className="text-[10px] text-[#FDE68A] whitespace-pre-wrap break-all font-mono max-h-40 overflow-y-auto">
                {preview}
              </pre>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-3 py-1 rounded-md bg-[#38BDF8] text-black text-[10px] font-bold hover:bg-[#0EA5E9]"
                  onClick={() => void addToolApprovalResponse({ id: tool.approval!.id, approved: true })}
                >
                  {t.approveRun}
                </button>
                <button
                  type="button"
                  className="px-3 py-1 rounded-md border border-[#52525B] text-[#E4E3E0] text-[10px] hover:bg-[#1A1A1A]"
                  onClick={() => void addToolApprovalResponse({ id: tool.approval!.id, approved: false })}
                >
                  {t.deny}
                </button>
              </div>
            </div>
          );
        }
        if (
          (name === "run_command" || name === "run_command_pipeline") &&
          tool.output &&
          typeof tool.output === "object"
        ) {
          const o = tool.output as { stdout?: string; stderr?: string; ok?: boolean; exitCode?: number; steps?: unknown };
          const block =
            name === "run_command_pipeline" && Array.isArray(o.steps)
              ? JSON.stringify(o.steps, null, 0)
              : [o.stdout, o.stderr].filter(Boolean).join("\n");
          if (block && onTerminalMirror) onTerminalMirror(block);
        }
        return (
          <div key={idx} className="mt-2 rounded border border-[#252525] bg-[#0A0A0A] p-2 text-[10px] font-mono text-[#8E9299]">
            <div className="text-[#38BDF8] mb-1">{name}</div>
            <div className="text-[#52525B]">{tool.state}</div>
            {tool.errorText ? <div className="text-red-400 mt-1">{tool.errorText}</div> : null}
            {tool.output != null ? (
              <pre className="mt-1 max-h-40 overflow-auto text-[#C4C4C0] whitespace-pre-wrap break-words">
                {typeof tool.output === "string" ? tool.output : JSON.stringify(tool.output, null, 2).slice(0, 4000)}
              </pre>
            ) : null}
          </div>
        );
      }
      return null;
    },
    [addToolApprovalResponse, language, onTerminalMirror, t.approveRun, t.deny],
  );

  if (!backendUrl) {
    return <p className="p-4 text-xs text-[#8E9299]">{t.noProjectHint}</p>;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {!activeProject && (
          <p className="text-xs text-amber-400/90 leading-relaxed">{t.noProjectHint}</p>
        )}
        {!hasApiKey && (
          <p className="text-xs text-amber-400/90 leading-relaxed">{t.noApiKeyHint}</p>
        )}
        {error ? (
          <div className="text-xs text-red-400 border border-red-500/30 rounded-lg p-2">{String(error.message)}</div>
        ) : null}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "p-3 rounded-lg text-sm break-words",
              m.role === "user" ? "bg-[#1A1A1A] ml-2" : "bg-[#151515] mr-2 border border-[#1A1A1A]",
            )}
          >
            <div className="text-[10px] tracking-widest text-[#8E9299] mb-1">
              {m.role === "user" ? t.you : t.assistantLabel}
            </div>
            <div className="space-y-1">
              {m.parts.map((part, i) => (
                <React.Fragment key={i}>{renderPart(m, part, i)}</React.Fragment>
              ))}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-[10px] text-[#8E9299] pl-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#38BDF8]" />
            {language === "ja" ? "生成中…" : "Generating…"}
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 border-t border-[#1A1A1A] bg-[#0A0A0A] shrink-0">
        <div className="flex flex-wrap gap-1 mb-3 items-center">
          <button
            type="button"
            onClick={clearLocal}
            className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold text-[#8E9299] hover:text-white transition-colors"
          >
            <History className="w-3 h-3" />
            {t.clear}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <button
            type="button"
            disabled={busy || !activeProject}
            onClick={() => {
              const el = document.createElement("input");
              el.type = "file";
              el.multiple = true;
              el.onchange = () => {
                const files = el.files;
                if (!files) return;
                void (async () => {
                  const next: { name: string; text: string }[] = [];
                  for (const f of Array.from(files)) {
                    next.push({ name: f.name, text: await f.text() });
                  }
                  onSetContextAttachments((prev) => [...prev, ...next]);
                })();
              };
              el.click();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border border-[#252525] text-[#8E9299] hover:text-[#38BDF8] hover:border-[#38BDF8]/40 disabled:opacity-40"
          >
            <Paperclip className="w-3 h-3" />
            {t.attachFiles}
          </button>
          <button
            type="button"
            disabled={busy || !activeFile}
            onClick={() => attachOpenEditorBuffer()}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border border-[#252525] text-[#8E9299] hover:text-[#38BDF8] hover:border-[#38BDF8]/40 disabled:opacity-40",
              activeFile && contextAttachments.some((a) => a.name === activeFile) && "border-[#38BDF8]/45 text-[#38BDF8] bg-[#38BDF8]/10",
            )}
          >
            <FileCode className="w-3 h-3" />
            {t.attachOpenFile}
          </button>
          {contextAttachments.map((a, i) => (
            <span
              key={`${i}:${a.name}:${a.text.length}`}
              className="inline-flex items-center gap-1 text-[10px] pl-2 pr-1 py-0.5 rounded-full bg-[#1A1A1A] border border-[#252525] text-[#8E9299] max-w-[min(180px,calc(100vw-8rem))]"
              title={a.name}
            >
              <span className="truncate min-w-0">{a.name}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => onSetContextAttachments((prev) => prev.filter((_, j) => j !== i))}
                className="shrink-0 p-0.5 rounded-full text-[#71717A] hover:text-white hover:bg-white/10 disabled:opacity-40"
                aria-label={t.attachRemoveAria}
              >
                <X className="w-3 h-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
        <p className="text-[9px] text-[#555] mb-1">{t.attachmentsHint}</p>
        <div className="relative">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder={t.placeholderUnified}
            disabled={!activeProject || !hasApiKey || busy}
            className="w-full bg-[#1A1A1A] border border-[#252525] rounded-xl p-3 pr-20 text-sm focus:outline-none focus:border-[#38BDF8] transition-colors resize-none h-24 text-[#E4E3E0]"
          />
          {busy ? (
            <button
              type="button"
              onClick={() => stop()}
              className="absolute bottom-3 right-3 p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
              title={t.stop}
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void submit()}
              disabled={(!draft.trim() && contextAttachments.length === 0) || !activeProject || !hasApiKey}
              className="absolute bottom-3 right-3 p-2 bg-[#38BDF8] text-white rounded-lg hover:bg-[#0EA5E9] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
