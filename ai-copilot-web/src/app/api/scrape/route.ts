import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type ToolSet,
} from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import {
  SCRAPE_SYSTEM_PROMPT,
} from "./config";
import { createScrapeMcpClient } from "./mcp/create-client";
import { protectToolsWithPolicies } from "./mcp/protect-tools";
import { createRequestContext } from "./request-context";

export const maxDuration = 60; // next路由文件保留变量，必须static string，不能导入
export const runtime = "nodejs"; // next路由文件保留变量，必须static string，不能导入

export async function POST(req: Request) {
  let mcpClient: Awaited<ReturnType<typeof createScrapeMcpClient>> | undefined;

  try {
    const { messages } = await req.json();
    const requestContext = createRequestContext(req);

    mcpClient = await createScrapeMcpClient({
      requestUrl: new URL(req.url),
    });

    const discoveredTools = (await mcpClient.tools()) as ToolSet;
    const protectedTools = protectToolsWithPolicies(
      discoveredTools,
      requestContext
    );

    const result = await streamText({
      model: deepseek("deepseek-chat"),
      system: SCRAPE_SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools: protectedTools,
      stopWhen: stepCountIs(5),
      onStepFinish: ({ finishReason, toolCalls, toolResults, text, response }) => {
        requestContext.modelRequestId =
          response.id ?? requestContext.modelRequestId;

        console.log("[Function Calling] step finished:", {
          finishReason,
          text,
          toolCalls: toolCalls.map((toolCall) => toolCall.toolName),
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
    return new Response(JSON.stringify({ error: "服务器异常" }), {
      status: 500,
    });
  }
}
