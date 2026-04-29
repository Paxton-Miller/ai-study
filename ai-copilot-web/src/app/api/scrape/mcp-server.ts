import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  lookupWeather,
  lookupWeatherSchema,
  lookupWeatherToMcpResult,
} from "./lookup_weather";
import {
  searchReactDocs,
  searchReactDocsSchema,
  searchReactDocsToMcpResult,
} from "./search_react_docs";

export function createScrapeMcpServer() {
  const server = new McpServer({
    name: "ai-copilot-scrape-tools",
    version: "1.0.0",
  });

  server.registerTool(
    "search_react_docs",
    {
      description:
        "当用户提问关于 React 源码、API 用法或具体技术细节时，必须调用此工具去知识库中检索背景信息。",
      inputSchema: searchReactDocsSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ searchQuery }) => {
      const text = await searchReactDocs({ searchQuery });
      return searchReactDocsToMcpResult(text);
    }
  );

  server.registerTool(
    "lookup_weather",
    {
      description: "当用户提问某个地点的实时天气时，调用此工具查询该地点当前天气。",
      inputSchema: lookupWeatherSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ location }) => {
      const text = await lookupWeather({ location });
      return lookupWeatherToMcpResult(text);
    }
  );

  return server;
}
