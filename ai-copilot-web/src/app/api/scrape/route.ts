import { NextResponse } from "next/server";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { convertToModelMessages, streamText } from 'ai';
import { deepseek } from '@ai-sdk/deepseek'; // 👈 官方专属通道

export async function POST (req: Request) {
    // 1. 抓取网页与解析
    const targetUrl = 'https://zh-hans.react.dev/reference/react/useState';
    const loader = new CheerioWebBaseLoader(targetUrl, {
        selector: 'article'
    });
    const docs = await loader.load();

    // 2. 文本切块
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
    });
    const splitDocs = await splitter.splitDocuments(docs);

    // 3. 安全获取用户消息（防呆处理）
    let messages = [];
    try {
        const body = await req.json();
        messages = body.messages;
    } catch (e) {
        console.log("请求体为空或不是合法的 JSON");
    }

    if (!messages || messages.length === 0) {
        messages = [{ role: 'user', content: '简单介绍一下 useState？' }];
    }

    // 4. 组装上下文（取前 3 块）
    const promptContext = splitDocs.slice(0, 3).map(doc => doc.pageContent).join('\n\n');

    // 5. 呼叫大模型打字机
    const result = await streamText({
        model: deepseek('deepseek-chat'), 
        system: `你是一个资深的 React 源码分析专家。请根据下面的【React 官方文档内容】回答用户问题。如果文档里没写，你就说不知道。
        
        【React 官方文档内容】:
        ${promptContext}
        `,
        messages: await convertToModelMessages(messages), 
    });
    
    // 6. 返回流式响应
    return result.toUIMessageStreamResponse()
}