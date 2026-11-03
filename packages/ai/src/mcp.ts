import { randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * Server MCP minimal (HTTP, JSON-RPC fără streaming) prin care CLI-ul `claude` apelează
 * instrumentele aplicației în procesul nostru: registrul de dovezi, constatările și
 * cache-ul portalului rămân în memorie, ca la apelurile directe din API.
 * Ascultă doar pe 127.0.0.1, cu un token aleator per sesiune.
 */

export const MCP_SERVER_NAME = "lexai";

export interface ToolOutcome {
  content: string;
  isError?: boolean;
}

export interface CliTool {
  name: string;
  description: string;
  /** JSON Schema pentru argumente */
  inputSchema: Record<string, unknown>;
  run: (input: Record<string, unknown>) => Promise<ToolOutcome>;
}

/** Numele sub care modelul vede instrumentul. */
export function mcpToolName(name: string): string {
  return `mcp__${MCP_SERVER_NAME}__${name}`;
}

export interface McpServerHandle {
  /** configurația pentru --mcp-config */
  config: { mcpServers: Record<string, unknown> };
  close: () => Promise<void>;
}

interface RpcRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

async function readBody(req: IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body;
}

function sendJson(res: ServerResponse, payload: unknown) {
  res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(payload));
}

export async function startMcpServer(tools: CliTool[]): Promise<McpServerHandle> {
  const token = randomBytes(24).toString("hex");
  const byName = new Map(tools.map((t) => [t.name, t]));

  const handle = async (msg: RpcRequest): Promise<unknown> => {
    switch (msg.method) {
      case "initialize":
        return {
          protocolVersion: (msg.params?.protocolVersion as string) ?? "2025-06-18",
          capabilities: { tools: {} },
          serverInfo: { name: MCP_SERVER_NAME, version: "1.0.0" },
        };
      case "ping":
        return {};
      case "tools/list":
        return { tools: tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) };
      case "tools/call": {
        const tool = byName.get(String(msg.params?.name));
        if (!tool) return { content: [{ type: "text", text: `Instrument necunoscut: ${msg.params?.name}` }], isError: true };
        try {
          const out = await tool.run((msg.params?.arguments as Record<string, unknown>) ?? {});
          return { content: [{ type: "text", text: out.content }], isError: out.isError ?? false };
        } catch (e) {
          return { content: [{ type: "text", text: `Eroare: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
      }
      default:
        throw Object.assign(new Error(`Metodă necunoscută: ${msg.method}`), { code: -32601 });
    }
  };

  const server = createServer(async (req, res) => {
    if (req.headers.authorization !== `Bearer ${token}`) {
      res.writeHead(401).end();
      return;
    }
    // fără flux de notificări server → client
    if (req.method !== "POST") {
      res.writeHead(405).end();
      return;
    }
    let msg: RpcRequest;
    try {
      msg = JSON.parse(await readBody(req)) as RpcRequest;
    } catch {
      sendJson(res, { jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON invalid" } });
      return;
    }
    // notificările nu primesc răspuns
    if (msg.id === undefined) {
      res.writeHead(202).end();
      return;
    }
    try {
      sendJson(res, { jsonrpc: "2.0", id: msg.id, result: await handle(msg) });
    } catch (e) {
      const code = (e as { code?: number }).code ?? -32603;
      sendJson(res, { jsonrpc: "2.0", id: msg.id, error: { code, message: e instanceof Error ? e.message : String(e) } });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const { port } = server.address() as AddressInfo;

  return {
    config: {
      mcpServers: {
        [MCP_SERVER_NAME]: { type: "http", url: `http://127.0.0.1:${port}/mcp`, headers: { Authorization: `Bearer ${token}` } },
      },
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
