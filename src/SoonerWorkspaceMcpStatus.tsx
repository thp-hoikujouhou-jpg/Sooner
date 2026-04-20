import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useMcp } from "use-mcp/react";
import { Loader2, PlugZap } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SoonerWorkspaceMcpStatusProps = {
  backendUrl: string;
  activeProject: string;
  getIdToken: () => Promise<string | null>;
  language: "en" | "ja";
  mcpTitle: string;
  mcpConnecting: string;
  mcpReadyPrefix: string;
  mcpFailed: string;
  mcpHint: string;
  mcpAwaitingAuth: string;
};

type InnerProps = Omit<SoonerWorkspaceMcpStatusProps, "getIdToken" | "activeProject"> & {
  customHeaders: Record<string, string>;
  onReconnect: () => void;
};

function SoonerWorkspaceMcpStatusInner({
  backendUrl,
  language,
  mcpTitle,
  mcpConnecting,
  mcpReadyPrefix,
  mcpFailed,
  mcpHint,
  customHeaders,
  onReconnect,
}: InnerProps) {
  const base = useMemo(() => backendUrl.replace(/\/$/, ""), [backendUrl]);
  const url = `${base}/api/mcp`;

  const { state, tools, error, retry } = useMcp({
    url,
    clientName: "Sooner Web",
    transportType: "http",
    customHeaders,
    preventAutoAuth: true,
    debug: false,
  });

  const label =
    state === "ready"
      ? `${mcpReadyPrefix} · ${tools.length}`
      : state === "failed"
        ? mcpFailed
        : mcpConnecting;

  return (
    <div className="rounded-lg border border-[#252525] bg-[#080808] px-3 py-2 mb-3 space-y-1">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-[#8E9299]">
        <PlugZap className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
        {mcpTitle}
        {state !== "ready" && state !== "failed" ? (
          <Loader2 className="w-3 h-3 animate-spin text-[#38BDF8] ml-auto" aria-hidden />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#A1A1AA]">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 font-mono",
            state === "ready" ? "bg-emerald-500/15 text-emerald-400" : state === "failed" ? "bg-red-500/15 text-red-400" : "bg-[#1A1A1A] text-[#8E9299]",
          )}
        >
          {label}
        </span>
        {state === "failed" && error ? (
          <button type="button" onClick={() => retry()} className="text-[#38BDF8] hover:underline">
            {language === "ja" ? "再試行" : "Retry"}
          </button>
        ) : null}
        <button type="button" onClick={() => onReconnect()} className="text-[#71717A] hover:text-[#38BDF8] text-[9px]">
          {language === "ja" ? "再接続" : "Reconnect"}
        </button>
      </div>
      {state === "ready" && tools.length > 0 ? (
        <p className="text-[9px] text-[#71717A] font-mono leading-relaxed break-words">
          <span className="text-[#52525B] not-italic font-sans mr-1">
            {language === "ja" ? "名前:" : "Names:"}
          </span>
          {tools.map((x) => x.name).join(" · ")}
        </p>
      ) : null}
      <p className="text-[9px] text-[#52525B] leading-snug">{mcpHint}</p>
    </div>
  );
}

/**
 * Live MCP connection to the Sooner workspace Streamable HTTP endpoint (/api/mcp), for discovery and debugging.
 * External tools for the LLM are merged on the server from mcp-config.json when the workspace agent runs.
 */
export function SoonerWorkspaceMcpStatus(props: SoonerWorkspaceMcpStatusProps) {
  const { getIdToken, activeProject, ...innerRest } = props;
  const { backendUrl, mcpTitle, mcpAwaitingAuth } = innerRest;
  const [customHeaders, setCustomHeaders] = useState<Record<string, string> | null>(null);
  const [connectNonce, setConnectNonce] = useState(0);

  const loadHeaders = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setCustomHeaders(null);
      return;
    }
    setCustomHeaders({
      Authorization: `Bearer ${token}`,
      "X-Sooner-Project": activeProject,
    });
  }, [getIdToken, activeProject]);

  useEffect(() => {
    void loadHeaders();
  }, [loadHeaders, backendUrl, activeProject]);

  const reconnect = useCallback(() => {
    void (async () => {
      await loadHeaders();
      setConnectNonce((n) => n + 1);
    })();
  }, [loadHeaders]);

  if (!customHeaders) {
    return (
      <div className="rounded-lg border border-[#252525] bg-[#080808] px-3 py-2 mb-3 flex items-center gap-2 text-[10px] text-[#8E9299]">
        <Loader2 className="w-3 h-3 animate-spin text-[#38BDF8]" aria-hidden />
        <PlugZap className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
        <span className="font-bold uppercase tracking-wide">{mcpTitle}</span>
        <span className="text-[#71717A]">{mcpAwaitingAuth}</span>
      </div>
    );
  }

  return (
    <SoonerWorkspaceMcpStatusInner
      key={`${activeProject}:${connectNonce}`}
      {...innerRest}
      customHeaders={customHeaders}
      onReconnect={reconnect}
    />
  );
}
