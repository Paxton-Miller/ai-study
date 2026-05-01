import { Pinecone } from "@pinecone-database/pinecone";
import { z } from "zod";
import { fetchWithRetry } from "./network";
import { sanitizeSearchQuery } from "./security";

export const searchReactDocsSchema = z.object({
  searchQuery: z
    .string()
    .min(1)
    .max(200)
    .describe("用来去向量数据库检索的精准搜索关键词"),
});

export type SearchReactDocsInput = z.infer<typeof searchReactDocsSchema>;

export async function searchReactDocs({
  searchQuery,
}: SearchReactDocsInput): Promise<string> {
  const safeSearchQuery = sanitizeSearchQuery(searchQuery);
  const pineconeApiKey = process.env.PINECONE_API_KEY;
  const pineconeIndexName = process.env.PINECONE_INDEX_NAME;

  if (!pineconeApiKey || !pineconeIndexName) {
    return "检索失败，缺少 Pinecone 环境变量配置";
  }

  const pc = new Pinecone({
    apiKey: pineconeApiKey,
  });

  console.log(`[Function Calling] 大模型决定去搜索: ${safeSearchQuery}`);

  const embedRes = await fetchWithRetry("https://api.gptsapi.net/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-large",
      input: safeSearchQuery,
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

  const index = pc.index(pineconeIndexName);
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
}

export function searchReactDocsToMcpResult(text: string) {
  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
    structuredContent: {
      text,
    },
  };
}

const search_react_docs = {
  description:
    "当用户提问关于 React 源码、API 用法或具体技术细节时，必须调用此工具去知识库中检索背景信息。",
  inputSchema: searchReactDocsSchema,
  execute: searchReactDocs,
};

export default search_react_docs;
