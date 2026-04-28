import { Pinecone } from "@pinecone-database/pinecone";
import { z } from "zod";

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY as string,
});

const search_react_docs = {
  description:
    "当用户提问关于 React 源码、API 用法或具体技术细节时，必须调用此工具去知识库中检索背景信息。",
  inputSchema: z.object({
    searchQuery: z.string().describe("用来去向量数据库检索的精准搜索关键词"),
  }),
  execute: async ({ searchQuery }: { searchQuery: string }) => {
    console.log(`[Function Calling] 大模型决定去搜索: ${searchQuery}`);

    const embedRes = await fetch("https://api.gptsapi.net/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-large",
        input: searchQuery,
        dimensions: 1024,
      }),
    });

    if (!embedRes.ok) {
      const errorText = await embedRes.text();
      console.error("[Function Calling] Embedding 调用失败:", errorText);
      return "检索失败，向量化 API 异常";
    }

    const embedData = await embedRes.json();
    const queryVector = embedData.data[0].embedding;

    const index = pc.index(process.env.PINECONE_INDEX_NAME as string);
    const queryResponse = await index.query({
      vector: queryVector,
      topK: 3,
      includeMetadata: true,
    });

    const contextDocs = queryResponse.matches
      .map((match) => match.metadata?.text || match.metadata?.pageContent || "")
      .filter(Boolean)
      .join("\n\n---\n\n");

    return contextDocs || "未检索到相关内容";
  },
};

export default search_react_docs;
