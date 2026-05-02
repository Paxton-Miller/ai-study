import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SCRAPE_TOOLS } from "../tools";

export function createScrapeMcpServer() {
  const server = new McpServer({
    name: "ai-copilot-scrape-tools",
    version: "1.0.0",
  });

  for (const [toolName, definition] of Object.entries(SCRAPE_TOOLS)) {
    server.registerTool(
      toolName,
      {
        description: definition.description,
        inputSchema: definition.schema.shape,
        annotations: definition.annotations,
      },
      async (input: unknown) => {
        const text = await definition.execute(input as never);
        return definition.toMcpResult(text);
      }
    );
  }

  return server;
}
