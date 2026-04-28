import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    console.log(`🗣️ 用户提问: ${question}`);

    // --- 交互一：问题向量化 (使用 WildCard/OpenAI) ---
    const embedRes = await fetch("https://api.gptsapi.net/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "text-embedding-3-large",
        input: question,
        dimensions: 1024 // 🚨 必须与灌库时的维度一致
      })
    });
    const embedData = await embedRes.json();
    const vector = embedData.data[0].embedding;

    // --- 检索 Pinecone：寻找最相关的背景知识 ---
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    const index = pc.Index("react-docs");
    const queryResponse = await index.query({
      vector,
      topK: 3,
      includeMetadata: true
    });

    // 提取背景文本
    const context = queryResponse.matches
      .map(match => match.metadata?.text)
      .join("\n\n");

    // --- 交互二：携带背景请求 DeepSeek ---
    const dsRes = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `你是一个 React 专家。请严格基于以下参考资料回答。
            资料库中没有的内容请直说不知道。
            
            --- 参考资料 ---
            ${context}`
          },
          { role: "user", content: question }
        ],
        temperature: 0.1 // 保持严谨
      })
    });

    const dsData = await dsRes.json();
    return NextResponse.json({ answer: dsData.choices[0].message.content });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}