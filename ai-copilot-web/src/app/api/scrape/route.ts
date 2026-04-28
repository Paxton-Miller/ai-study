import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import search_react_docs from "./search_react_docs";
import lookup_weather from "./lookup_weather";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const systemPrompt = `
      你是一个极客风格的 React 源码与官方文档智能助手。
      遇到需要查阅 React API、源码细节或文档的问题时，请调用 search_react_docs 工具去查询。
      遇到需要查阅 地点实时天气状况的问题时，请调用 lookup_weather 工具去查询。
      使用 Markdown 格式输出。
    `;

    const tools = {
      // Function Calling可以并行
      search_react_docs,
      lookup_weather,
    };

    const result = await streamText({
      model: deepseek("deepseek-chat"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages, { tools }),
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
    });

    return result.toUIMessageStreamResponse();
    
  } catch (error) {
    console.error("Agentic RAG Pipeline Error:", error);
    return new Response(JSON.stringify({ error: "服务器异常" }), { status: 500 });
  }
}
