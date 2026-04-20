export type WorkspaceAgentContext = {
  projectRoot: string;
  uid: string;
  projectId: string;
  safeResolveRel: (rel: string) => string | null;
  uploadToStorage: (relPath: string, content: string) => Promise<void>;
  deleteFromStorage: (relPath: string) => Promise<void>;
};
