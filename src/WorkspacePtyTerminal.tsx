import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

export type WorkspacePtyTerminalHandle = {
  /** Append one-off output (e.g. approved agent exec via HTTP) into the terminal view. */
  appendExternalOutput: (text: string) => void;
};

type Props = {
  backendOrigin: string;
  projectId: string;
  getIdToken: () => Promise<string | null>;
  disabled?: boolean;
};

function toWsOrigin(httpOrigin: string): string {
  try {
    const u = new URL(httpOrigin);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    return u.origin;
  } catch {
    return "";
  }
}

export const WorkspacePtyTerminal = forwardRef<WorkspacePtyTerminalHandle, Props>(function WorkspacePtyTerminal(
  { backendOrigin, projectId, getIdToken, disabled },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const appendExternalOutput = useCallback((text: string) => {
    const t = termRef.current;
    if (!t) return;
    const normalized = text.endsWith("\n") ? text : `${text}\n`;
    t.write(`\r\n\x1b[36m[exec]\x1b[0m ${normalized.replace(/\n/g, "\r\n")}`);
  }, []);

  useImperativeHandle(ref, () => ({ appendExternalOutput }), [appendExternalOutput]);

  useEffect(() => {
    if (disabled || !containerRef.current || !backendOrigin || !projectId) return;
    const el = containerRef.current;
    let disposed = false;
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      theme: { background: "#0A0A0A", foreground: "#E4E3E0" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);
    fit.fit();
    termRef.current = term;

    const disposer = term.onData((data) => {
      const w = wsRef.current;
      if (w && w.readyState === WebSocket.OPEN) {
        w.send(JSON.stringify({ type: "input", data }));
      }
    });

    const ro = new ResizeObserver(() => {
      fit.fit();
      const w = wsRef.current;
      if (w && w.readyState === WebSocket.OPEN) {
        w.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      }
    });
    ro.observe(el);

    void (async () => {
      const token = await getIdToken();
      if (disposed || !token) {
        term.writeln("\x1b[33m[terminal]\x1b[0m Sign in to use the workspace shell.");
        return;
      }
      const origin = toWsOrigin(backendOrigin);
      if (!origin) {
        term.writeln("\x1b[31m[terminal]\x1b[0m Invalid backend URL.");
        return;
      }
      const url = `${origin}/api/ws/terminal?project=${encodeURIComponent(projectId)}&token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as { type?: string; data?: string };
          if (msg.type === "output" && typeof msg.data === "string") term.write(msg.data);
          else if (msg.type === "error" && typeof msg.data === "string") {
            term.write(`\r\n\x1b[31m${msg.data}\x1b[0m\r\n`);
          } else if (msg.type === "exit") {
            term.write("\r\n\x1b[90m[shell exited]\x1b[0m\r\n");
          }
        } catch {
          /* ignore */
        }
      };
      ws.onerror = () => {
        term.write("\r\n\x1b[31m[websocket error]\x1b[0m\r\n");
      };
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      };
    })();

    return () => {
      disposed = true;
      disposer.dispose();
      ro.disconnect();
      try {
        wsRef.current?.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
      term.dispose();
      termRef.current = null;
    };
  }, [backendOrigin, projectId, disabled, getIdToken]);

  return <div ref={containerRef} className="h-full w-full min-h-0 overflow-hidden" />;
});
