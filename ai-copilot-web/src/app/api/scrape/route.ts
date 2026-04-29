import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type ToolSet,
} from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import { createMCPClient } from "@ai-sdk/mcp";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(req: Request) {
  let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | undefined;

  try {
    const { messages } = await req.json();

    const systemPrompt = `
      你是一个极客风格的 React 源码与官方文档智能助手。
      遇到需要查阅 React API、源码细节或文档的问题时，请调用 search_react_docs 工具去查询。
      遇到需要查阅 地点实时天气状况的问题时，请调用 lookup_weather 工具去查询。
      使用 Markdown 格式输出。
    `;

    const tsxCommand =
      process.platform === "win32"
        ? path.join(process.cwd(), "node_modules", ".bin", "tsx.cmd")
        : path.join(process.cwd(), "node_modules", ".bin", "tsx");

    const mcpServerEntry = path.join(
      process.cwd(),
      "src",
      "app",
      "api",
      "scrape",
      "mcp-stdio-server.ts"
    );

    const requestUrl = new URL(req.url);
    const mcpTransport = process.env.MCP_TRANSPORT?.toLowerCase() ?? "sse";

    if (mcpTransport === "stdio") {
      mcpClient = await createMCPClient({
        transport: new StdioClientTransport({
          command: tsxCommand,
          args: [mcpServerEntry],
        }),
      });
    } else {
      mcpClient = await createMCPClient({
        transport: {
          type: "sse",
          url: `${requestUrl.origin}/api/scrape/mcp`,
        },
      });
    }

    const tools = (await mcpClient.tools()) as ToolSet; // Get下行得到的

    const result = await streamText({
      model: deepseek("deepseek-chat"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(5),
      // 一个 Step（步骤）的完整生命周期是：【发请求给模型】 -> 【模型返回指令】 -> 【服务器执行完该指令对应的代码】。只有当这三步全走完，才会触发一次 onStepFinish。
      onStepFinish: ({ finishReason, toolCalls, toolResults, text }) => {
        console.log("[Function Calling] step finished:", {
          finishReason,
          text, // 面向用户生成的纯自然语言文本，不包含 JSON 指令
          toolCalls: toolCalls.map((toolCall) => toolCall.toolName), // 大模型在这步里决定要调用的工具列表，以及具体的参数（JSON）
          toolResults: toolResults.map((toolResult) => toolResult.output),
        });
      },
      onFinish: async () => {
        await mcpClient?.close();
      },
    });

    return result.toUIMessageStreamResponse();
    
  } catch (error) {
    await mcpClient?.close();
    console.error("Agentic RAG Pipeline Error:", error);
    return new Response(JSON.stringify({ error: "服务器异常" }), { status: 500 });
  }
}
