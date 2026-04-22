This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


### 🧠 核心灵魂：Embedding（向量化）与高维空间

RAG 的魔法基石在于**数据结构的转化**，也就是让机器“懂”语义：

- **什么是 Embedding：** 它是通过 OpenAI 等顶级深度神经网络（Transformer 架构）“压榨”出来的超级翻译官。它把人类的自然语言，压缩提取成机器能懂的“语义特征”。
    
- **1024维坐标：** 一个文本块会被转化为包含 1024 个小数的数组（即高维坐标点）。
    
- **空间距离法则：** 在这个高维空间里，**意思越相近的文本，它们的坐标距离就越近**。
    
- **分工明确的存储原则：** * **向量（数字）：** 专门给 Pinecone 数据库用来做海量数学比对和搜索。
    
    - **源文本（Metadata）：** 专门用来在搜到结果后，提取出来拿给大模型（如 DeepSeek）“阅读”。大模型看不懂坐标，只认文字。
        

---

### 🏗️ 第一阶段：离线知识灌库 (Data Ingestion)

这是把外部资料变成大模型“外挂记忆”的流水线，分为经典的 4 步：

1. **爬虫 (Loader)：** 抓取目标数据（例如 React 官网的 `useState` 文档），将其转化为纯文本。
    
2. **切块 (Chunking/Splitter)：** 因为大模型存在上下文窗口限制，且整篇文章无法提取精确坐标，所以使用“切肉刀”将长文档切分成若干个小肉块（例如 52 个约 1000 字符的文本块）。
    
3. **向量化 (Embedding)：** 将这 52 个肉块发送给 Embedding 模型（如 OpenAI），换取 52 个对应的 1024 维数字数组。
    
4. **入库 (Vector DB)：** 将这 52 个数组（作为搜索用的索引）连同它们的原文（存放在 Metadata 中），一起永久锁定在 Pinecone 向量数据库中。
    

---

### 🚀 第二阶段：在线问答与生成 (Query & Augmented Generation)

这是用户发起对话时的完整业务流：

1. **问题向量化：** 当用户提出问题时，后端首先将“用户的提问”发送给 Embedding 模型，将问题也转化为一个 1024 维的坐标。
    
2. **空间搜索 (Retrieval)：** 后端拿着这个“问题坐标”去敲 Pinecone 的门，让数据库通过**余弦相似度计算**，找出距离该问题坐标最近的几个数据块（即最相关的背景知识）。
    
3. **喂给大模型 (Augmented Generation)：** Pinecone 返回了最匹配的 3 段原文。后端将这 **3 段原文（背景知识） + 用户的提问** 组装成一个巨大的提示词（Prompt），打包发给 DeepSeek，相当于告诉大模型：“这是开卷考试，请结合我提供的资料来回答用户。”