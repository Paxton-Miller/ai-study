import { streamText } from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import { Pinecone } from "@pinecone-database/pinecone";

export const maxDuration = 60;

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY as string,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const latestMessage = messages[messages.length - 1];

    // 1. 修复：精准提取用户提问 (兼容 parts 结构和传统 content 结构)
    let userQuery = "";
    if (latestMessage.parts && Array.isArray(latestMessage.parts)) {
      userQuery = latestMessage.parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("\n");
    } else {
      userQuery = latestMessage.content || latestMessage.text || "";
    }

    if (!userQuery.trim()) {
      throw new Error("提取到的用户问题为空");
    }

    // 2. 问题向量化：对齐你的架构，使用原生 fetch 请求 OpenAI Embedding
    // 如果你用了代理，直接把 https://api.openai.com/v1/embeddings 换成代理地址即可
    const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: userQuery,
      }),
    });

    if (!embedRes.ok) {
      const errText = await embedRes.text();
      console.error("Embedding API Error:", errText);
      throw new Error("向量化请求失败，请检查 API 密钥或网络连通性。");
    }

    const embedData = await embedRes.json();
    const queryVector = embedData.data[0].embedding;

    // 3. 空间搜索 (Retrieval)
    const index = pc.index(process.env.PINECONE_INDEX_NAME as string);
    const queryResponse = await index.query({
      vector: queryVector,
      topK: 3, 
      includeMetadata: true,
    });

    // 4. 提取背景知识
    const contextDocs = queryResponse.matches
      .map((match) => match.metadata?.text || match.metadata?.pageContent || "")
      .join("\n\n---\n\n");

    // 5. 组装 Prompt
    const systemPrompt = `
      你是一个极客风格的 React 源码与官方文档智能助手。
      请基于我为你提供的【背景知识】来回答用户的问题。
      
      规则：
      1. 如果背景知识中包含答案，请精准、专业地回答，并可以适当引用代码。
      2. 如果背景知识中没有相关信息，请坦白告知你不知道，切勿胡编乱造（不要产生幻觉）。
      3. 保持专业、冷峻的语气，使用 Markdown 格式输出。

      【背景知识开始】
      ${contextDocs}
      【背景知识结束】
    `;

    // 6. 喂给大模型 (DeepSeek)
    const result = await streamText({
      model: deepseek("deepseek-chat"),
      system: systemPrompt,
      messages: messages, // 传入包含完整历史记录的 messages
    });

    return result.toUIMessageStreamResponse();

  } catch (error) {
    console.error("RAG Pipeline Error:", error);
    return new Response(
      JSON.stringify({ error: "服务器开小差了，请看控制台日志。" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}