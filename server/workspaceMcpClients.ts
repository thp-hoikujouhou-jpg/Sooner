import path from "path";
import type { JSONSchema7 } from "ai";
import { dynamicTool, jsonSchema } from "ai";
import type { Tool } from "ai";
import { Client } from "@modelcontextprotocol/sdk/client";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";
import type { WorkspaceAgentContext } from "./workspaceAgentContext";
import { isPathInsideProject, readProjectMcpConfig } from "./mcpConfig";

const MAX_TOOLS_PER_SERVER = 32;

function sanitizeKeyPart(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
}

function mcpInputToJsonSchema7(inputSchema: {
  type: "object";
  properties?: Record<string, object>;
  required?: string[];
}): JSONSchema7 {
  return {
    type: "object",
    properties: (inputSchema.properties ?? {}) as JSONSchema7["properties"],
    required: inputSchema.required,
    additionalProperties: true,
  };
}

function serializeCallToolResult(result: unknown): unknown {
  if (result && typeof result === "object" && "content" in result) {
    const r = result as {
      content?: unknown;
      isError?: boolean;
      structuredContent?: unknown;
    };
    return {
      content: r.content,
      isError: r.isError,
      structuredContent: r.structuredContent,
    };
  }
  return result;
}

async function listAllTools(client: Client) {
  const tools: Awaited<ReturnType<Client["listTools"]>>["tools"] = [];
  let cursor: string | undefined;
  let guard = 0;
  do {
    const page = await client.listTools(cursor ? { cursor } : {});
    tools.push(...page.tools.slice(0, MAX_TOOLS_PER_SERVER - tools.length));
    cursor = page.nextCursor;
    guard++;
    if (guard > 24) break;
  } while (cursor && tools.length < MAX_TOOLS_PER_SERVER);
  return tools;
}

type Connected = {
  client: Client;
  transport: { close: () => Promise<void> };
};

/**
 * Loads `mcp-config.json` from the project root and registers each server's tools on the workspace agent.
 * Tool names are prefixed as `mcp__<serverId>__<toolName>` to avoid collisions.
 */
export async function buildMcpConfigToolMap(ctx: WorkspaceAgentContext): Promise<{
  tools: Record<string, Tool<unknown, unknown>>;
  dispose: () => Promise<void>;
}> {
  const config = await readProjectMcpConfig(ctx.projectRoot);
  if (!config?.servers.length) {
    return { tools: {}, dispose: async () => {} };
  }

  const connected: Connected[] = [];
  const tools: Record<string, Tool<unknown, unknown>> = {};

  for (const server of config.servers) {
    let client: Client | undefined;
    let transport: Connected["transport"] | undefined;
    try {
      client = new Client({ name: "sooner-workspace-mcp-bridge", version: "1.0.0" }, { capabilities: {} });

      if (server.transport === "http") {
        transport = new StreamableHTTPClientTransport(new URL(server.url), {
          requestInit: {
            headers: server.headers ? { ...server.headers } : undefined,
          },
        });
      } else {
        const cwdResolved = path.resolve(ctx.projectRoot, server.cwd || ".");
        if (!isPathInsideProject(ctx.projectRoot, cwdResolved)) {
          console.warn(`[mcp-config] stdio cwd outside project for server "${server.id}", skipping`);
          continue;
        }
        transport = new StdioClientTransport({
          command: server.command,
          args: server.args,
          env: server.env,
          cwd: cwdResolved,
          stderr: "inherit",
        });
      }

      await client.connect(transport);
      const listed = await listAllTools(client);
      connected.push({ client, transport });

      const sid = sanitizeKeyPart(server.id);

      for (const t of listed) {
        const tname = sanitizeKeyPart(t.name);
        const aiToolName = `mcp__${sid}__${tname}`;
        if (tools[aiToolName]) continue;

        const desc =
          (t.description ? `${t.description} ` : "") +
          `(MCP server "${server.id}", original tool name: ${t.name})`;

        const inputSchema7 = mcpInputToJsonSchema7(t.inputSchema);
        const stableClient = client;
        const stableToolName = t.name;

        tools[aiToolName] = dynamicTool({
          description: desc,
          inputSchema: jsonSchema(inputSchema7),
          execute: async (input) => {
            const res = await stableClient.callTool({
              name: stableToolName,
              arguments: (input && typeof input === "object" ? input : {}) as Record<string, unknown>,
            });
            return serializeCallToolResult(res);
          },
        });
      }
    } catch (e) {
      console.warn(`[mcp-config] server "${server.id}" failed:`, e instanceof Error ? e.message : e);
      if (transport) {
        try {
          await transport.close();
        } catch {
          /* ignore */
        }
      }
    }
  }

  const dispose = async () => {
    for (const { transport } of connected.reverse()) {
      try {
        await transport.close();
      } catch {
        /* ignore */
      }
    }
  };

  return { tools, dispose };
}
