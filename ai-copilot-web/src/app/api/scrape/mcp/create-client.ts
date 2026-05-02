import { createMCPClient } from "@ai-sdk/mcp";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import {
  DEFAULT_MCP_TRANSPORT,
  MCP_STDIO_ENTRY_PATH,
} from "../config";

export async function createScrapeMcpClient({
  requestUrl,
  transport = process.env.MCP_TRANSPORT?.toLowerCase() ?? DEFAULT_MCP_TRANSPORT,
}: {
  requestUrl: URL;
  transport?: string;
}) {
  if (transport === "stdio") {
    const tsxCommand =
      process.platform === "win32"
        ? path.join(process.cwd(), "node_modules", ".bin", "tsx.cmd")
        : path.join(process.cwd(), "node_modules", ".bin", "tsx");

    const mcpServerEntry = path.join(process.cwd(), ...MCP_STDIO_ENTRY_PATH);

    return createMCPClient({
      transport: new StdioClientTransport({
        command: tsxCommand,
        args: [mcpServerEntry],
      }),
    });
  }

  return createMCPClient({
    transport: {
      type: "sse",
      url: `${requestUrl.origin}/api/scrape/mcp`,
    },
  });
}
