import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createScrapeMcpServer } from "./mcp-server";

async function main() {
  const server = createScrapeMcpServer();
  const transport = new StdioServerTransport(); // 解析StdIn

  await server.connect(transport);
  console.error("[MCP] scrape stdio server running");
}

main().catch((error) => {
  console.error("[MCP] server error:", error);
  process.exit(1);
});

// 因为 stdio 把 stdout（打印输出）当成了传数据的专用通道，所以在 MCP Server 的代码里，绝对不能用 console.log 来打印普通日志！
