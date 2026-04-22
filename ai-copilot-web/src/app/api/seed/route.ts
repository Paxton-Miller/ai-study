// RAG（Retrieval-Augmented Generation，检索增强生成）
// 1024维，是一个文本块用text-embedding模型，即Embedding（向量化）模型，通过OpenAI 耗费几千万美金训练的深度神经网络（Transformer 架构）“压榨”出来的。模型会把所有它理解到的“语义信息”，压缩成一组高维坐标点
// 意思越相近的词，它们在空间里的坐标距离就越近！
// 为什么为什么 Pinecone 既记录小鼠，还要在 metadata 里记录源文本？当用户提问时，Pinecone 数据库只会对比“数字”。回答时问题向量化： 后端拿着这个问题，再去求一次 OpenAI 的 Embedding 模型，把问题也变成一个 1024 维的坐标。
// 空间搜索（Retrieval）： 后端拿着这个“问题坐标”，去 Pinecone 数据库里搜：“计算一下，哪几个数据块的坐标，离这个问题的坐标最近？” （这叫余弦相似度计算）。
// 喂给大模型（Augmented Generation）： Pinecone 找到了距离最近的 3 个数据块（也就是原来切好的 React 文档原文）。后端把这 3 段原文，加上用户的提问，一起打包发给 DeepSeek ：“大哥，这是我在资料库里找的背景知识，请结合这些知识回答用户的问题。”


// 爬虫（Loader）： 去 React 官网上把 useState 的网页全部扒下来，变成纯文本。
// 切块（Chunking/Splitter）： 大模型一次性读不了整本书，也不能把整本书算成一个坐标。所以我们用切肉刀，把长文档切成了 52 个“大概 1000 字的小肉块”。
// 向量化（Embedding）： 我们把这 52 个肉块，发给了 OpenAI，OpenAI 返回了 52 个 1024 维 的数字数组。
// 存入向量库（Vector DB - Pinecone）： 我们把这 52 个数组，连同它们的“原话文本”，一起锁进了 Pinecone 数据库里。
import { NextResponse } from "next/server";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Pinecone } from "@pinecone-database/pinecone";

export async function GET() {
  try {
    console.log("🚀 [降维打击] 启动纯 REST API 暴力全量灌库...");

    // 1. 抓取与切块
    const urls = [
      "https://zh-hans.react.dev/reference/react/useState",
      "https://zh-hans.react.dev/reference/react/useEffect",
    ];
    const allDocs = [];
    for (const url of urls) {
      const loader = new CheerioWebBaseLoader(url, { selector: "article" });
      const docs = await loader.load();
      allDocs.push(...docs);
    }
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
    const splitDocs = await splitter.splitDocuments(allDocs);
    console.log(`✅ 文档准备就绪，共 ${splitDocs.length} 块。`);

    // 2. 获取 Pinecone 真实后端地址 (用完即弃)
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    const indexModel = await pc.describeIndex("react-docs");
    const host = indexModel.host;
    console.log(`🔗 成功获取数据库后门地址: ${host}`);

    // 3. 循环获取向量并存入数组
    const formattedVectors = [];
    console.log("🧠 开始向 WildCard 请求向量化...");

    for (let i = 0; i < splitDocs.length; i++) {
      const text = splitDocs[i].pageContent;
      
      const res = await fetch("https://api.gptsapi.net/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "text-embedding-3-large",
          input: text,
          dimensions: 1024
        })
      });

      const data = await res.json();
      const vector = data.data[0].embedding;

      // 封装成云端服务器只认的干净 JSON 格式
      formattedVectors.push({
        id: `react_doc_${Date.now()}_${i}`,
        values: vector,
        metadata: { 
          text: text, 
          source: splitDocs[i].metadata.source || "react.dev" 
        }
      });
      console.log(`⏳ 向量化进度: ${i + 1}/${splitDocs.length}`);
    }

    // 4. 原生协议强行推入云端！
    console.log(`🔥 所有数据准备就绪，正在通过 REST API 一把梭哈...`);
    const pcRes = await fetch(`https://${host}/vectors/upsert`, {
      method: "POST",
      headers: {
        "Api-Key": process.env.PINECONE_API_KEY!,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ vectors: formattedVectors })
    });

    const pcData = await pcRes.json();

    if (!pcRes.ok) {
       throw new Error(`云端拒收: ${JSON.stringify(pcData)}`);
    }

    console.log("🎉 [全剧终] 灌库彻底完成！", pcData);
    return NextResponse.json({ success: true, message: `太猛了！成功打入 ${pcData.upsertedCount} 条数据！` });

  } catch (error: any) {
    console.error("❌ 依然失败:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}