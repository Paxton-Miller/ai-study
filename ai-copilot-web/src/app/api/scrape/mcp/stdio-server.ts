import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createScrapeMcpServer } from "./create-server";

async function main() {
  const server = createScrapeMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error("[MCP] scrape stdio server running");
}

main().catch((error) => {
  console.error("[MCP] server error:", error);
  process.exit(1);
});
