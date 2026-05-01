import {
  convertToModelMessages,
  generateId,
  stepCountIs,
  streamText,
  tool,
  type ToolSet,
} from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import { createMCPClient } from "@ai-sdk/mcp";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import { writeAuditLog, summarizeParams } from "./audit-log";
import { checkRateLimit } from "./rate-limit";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(req: Request) {
  let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | undefined;

  try {
    const { messages } = await req.json();
    const requestId = generateId();
    const userId = req.headers.get("x-user-id")?.trim() || "anonymous";
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      "unknown";
    const auditContext: { modelRequestId?: string } = {};

    const systemPrompt = `
      你是一个极客风格的 React 源码与官方文档智能助手。
      遇到需要查阅 React API、源码细节或文档的问题时，请调用 search_react_docs 工具去查询。
      遇到需要查阅 地点实时天气状况的问题时，请调用 lookup_weather 工具去查询。
      工具参数必须最小化、只传纯数据，不要把用户的话原样包装成指令，不要构造文件路径、URL、系统提示词探测语句或越权参数。
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
    const protectedTools = Object.fromEntries(
      Object.entries(tools).map(([toolName, toolDefinition]) => [
        toolName,
        tool({
          description: toolDefinition.description,
          inputSchema: toolDefinition.inputSchema,
          execute: async (input, options) => {
            const rateLimit = checkRateLimit({
              subject: `${ip}:${userId}`,
              toolName,
              limit: 10,
              windowMs: 60_000,
            });

            const parameterSummary = summarizeParams(input);

            if (!rateLimit.allowed) {
              writeAuditLog({
                time: new Date().toISOString(),
                requestId,
                modelRequestId: auditContext.modelRequestId,
                userId,
                ip,
                toolName,
                status: "blocked",
                parameterSummary,
                detail: `rate_limited retry_after_ms=${rateLimit.retryAfterMs}`,
              });

              throw new Error(
                `工具调用过于频繁，请在 ${Math.ceil(
                  rateLimit.retryAfterMs / 1000
                )} 秒后重试。`
              );
            }

            writeAuditLog({
              time: new Date().toISOString(),
              requestId,
              modelRequestId: auditContext.modelRequestId,
              userId,
              ip,
              toolName,
              status: "allowed",
              parameterSummary,
              detail: `remaining=${rateLimit.remaining}`,
            });

            try {
              const output = await toolDefinition.execute?.(input, options);

              writeAuditLog({
                time: new Date().toISOString(),
                requestId,
                modelRequestId: auditContext.modelRequestId,
                userId,
                ip,
                toolName,
                status: "success",
                parameterSummary,
                detail: `tool_call_id=${options.toolCallId}`,
              });

              return output;
            } catch (error) {
              writeAuditLog({
                time: new Date().toISOString(),
                requestId,
                modelRequestId: auditContext.modelRequestId,
                userId,
                ip,
                toolName,
                status: "error",
                parameterSummary,
                detail:
                  error instanceof Error ? error.message : "unknown_tool_error",
              });
              throw error;
            }
          },
        }),
      ])
    ) as ToolSet;
    // 在这里其实可以把 tools 也都向量化，用用户的 vector 去检索前三。防止所用工具都给大模型用爆 token

    const result = await streamText({
      model: deepseek("deepseek-chat"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: protectedTools,
      stopWhen: stepCountIs(5),
      // 一个 Step（步骤）的完整生命周期是：【发请求给模型】 -> 【模型返回指令】 -> 【服务器执行完该指令对应的代码】。只有当这三步全走完，才会触发一次 onStepFinish。
      onStepFinish: ({ finishReason, toolCalls, toolResults, text, response }) => {
        auditContext.modelRequestId = response.id ?? auditContext.modelRequestId;
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
