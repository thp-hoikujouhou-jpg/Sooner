import path from "path";
import fs from "fs/promises";
import { z } from "zod";

const mcpHttpServerSchema = z.object({
  id: z.string().min(1).max(64),
  transport: z.literal("http"),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
});

const mcpStdioServerSchema = z.object({
  id: z.string().min(1).max(64),
  transport: z.literal("stdio"),
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  cwd: z.string().optional(),
});

export const mcpConfigFileSchema = z.object({
  version: z.number().int().positive().optional().default(1),
  servers: z.array(z.union([mcpHttpServerSchema, mcpStdioServerSchema])).max(8),
});

export type McpConfigFile = z.infer<typeof mcpConfigFileSchema>;
export type McpConfiguredServer = McpConfigFile["servers"][number];

const MCP_CONFIG_FILENAME = "mcp-config.json";

export async function readProjectMcpConfig(projectRoot: string): Promise<McpConfigFile | null> {
  const full = path.join(projectRoot, MCP_CONFIG_FILENAME);
  let raw: string;
  try {
    raw = await fs.readFile(full, "utf-8");
  } catch {
    return null;
  }
  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  } catch {
    console.warn("[mcp-config] invalid JSON at", full);
    return null;
  }
  const parsed = mcpConfigFileSchema.safeParse(json);
  if (!parsed.success) {
    console.warn("[mcp-config] schema validation failed:", parsed.error.flatten());
    return null;
  }
  return parsed.data;
}

export function isPathInsideProject(projectRoot: string, targetPath: string): boolean {
  const root = path.resolve(projectRoot);
  const child = path.resolve(targetPath);
  const rel = path.relative(root, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}
