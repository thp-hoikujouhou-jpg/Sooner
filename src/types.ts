export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

export interface Project {
  name: string;
}

export interface AgentStep {
  id: string;
  type: "plan" | "code" | "fix" | "test" | "deploy" | "read";
  status: "pending" | "running" | "completed" | "failed";
  message: string;
  timestamp: number;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  /** Plain-text summary (searchable); tool transcripts may live only in `parts`. */
  content: string;
  /** When set (AI SDK UI parts), chat restores tool cards and approval buttons instead of CLI-like text. */
  parts?: unknown[];
}
