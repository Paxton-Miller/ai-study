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


### 🧬 一、大模型对话协议底层：`Messages` 数组

当你向大模型发送请求时，底层传递的绝对不是一个简单的字符串，而是一个严格的 JSON 对象数组。大模型没有记忆，它每一次回答都是**根据传入的整个数组上下文重新计算概率**。

这个数组中的每一个对象，都必须包含 `role` 和 `content`。其中 `role`（角色）是底层数据结构中最核心的枚举值，通常分为四种：

#### 1. `"role": "system"` (系统指令/人设)

- **底层定义**：权重最高的系统级配置。它告诉模型“你是谁”、“你应该怎么做”。
    
- **在 RAG 中的作用**：大模型就像一个演员，`system` 就是剧本。我们在 `/api/scrape/route.ts` 中组装的【背景知识】，就是强行塞进了 `system` 里，让模型在回答前先“脑补”这些设定。
    
- **底层数据样例**：
    
    JSON
    
    ```
    { "role": "system", "content": "你是一个严厉的代码审查员，只用 Markdown 找 bug。" }
    ```
    

#### 2. `"role": "user"` (用户提问)

- **底层定义**：代表终端人类用户的输入。
    
- **底层数据样例**：
    
    JSON
    
    ```
    { "role": "user", "content": "我的 useState 报错了。" }
    ```
    

#### 3. `"role": "assistant"` (AI 助手的历史回答)

- **底层定义**：代表大模型自己曾经说的话。
    
- **为什么要传这个？** 因为大模型是“无状态 (Stateless)”的 HTTP 接口。如果用户问“那么第二个参数呢？”，你必须把之前大模型回答的关于“第一个参数”的 `assistant` 消息一并传过去，它才知道你在接着聊什么。
    

#### 4. `"role": "tool"` (工具调用结果，早期叫 `function`)

- **底层定义**：专为 Agent 准备。当大模型决定调用外部工具（比如查天气、执行代码）时，后端执行完代码后，会将结果以 `tool` 的身份塞回数组再传给大模型。
    
- **底层数据样例**：
    
    JSON
    
    ```
    { "role": "tool", "tool_call_id": "call_abc123", "content": "{ \"temp\": 24, \"city\": \"北京\" }" }
    ```
    

---

### 📡 二、SSE 流式协议：被 Vercel 封装前的真面目

你问得非常专业，前端接到的那种 `0:"字"` 的格式，绝对不是大模型原生吐出来的，而是 Vercel AI SDK 搞的一套自己的私有协议。

让我们看看底层的 **HTTP Server-Sent Events (SSE)** 到底长什么样。

#### 1. 真正的底层 HTTP 通信 (Chunked Transfer)

当你在后端请求 DeepSeek 时，HTTP 请求头里会带上 `Accept: text/event-stream`。这意味着服务器不会等所有内容生成完才返回，而是保持 TCP 连接不断开，一块一块地给你推数据（HTTP/1.1 Chunked Encoding）。

大模型原生吐出来的**原始字节流字符串**长这样：

Plaintext

```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"deepseek-chat","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"deepseek-chat","choices":[{"index":0,"delta":{"content":"use"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"deepseek-chat","choices":[{"index":0,"delta":{"content":"State"},"finish_reason":null}]}

data: [DONE]
```

**解析底层细节：**

- 每一帧数据都以 `data:` 开头，并以 `\n\n` 结尾（这是 SSE 协议规定的硬性边界）。
    
- 核心增量文本藏在极其深的层级里：`choices[0].delta.content`。
    
- 最后一帧永远是一个特殊的标志 `data: [DONE]`，表示流结束。
    

#### 2. 为什么要用 Vercel 封装的协议 (Data Stream Protocol)？

如果你在前端 `page.tsx` 中直接去解析上面那一大坨原生字符串，你需要自己处理字符串拼接、JSON 解析、各种网络异常断流。

在你的后端 `/api/scrape/route.ts` 中，`streamText()` 函数在 Node.js 服务器里接住了上面那些原生的 `data: {...}`。 接着，Vercel SDK 将其“解压、清洗、重组”，再通过网络推给前端，变成了极其精简的结构：

Plaintext

```
0:"use"
0:"State"
```

- **前缀魔数 `0:`**：Vercel 协议定义的类型，`0` 代表这是普通的文本数据 (Text chunk)。
    
- **前缀魔数 `3:`**：代表有内部报错 (Error)。
    
- **前缀魔数 `9:`**：代表大模型触发了 Tool Call（工具调用）。
    

前端的 `useChat` 钩子其实就是一个**状态机**，它监听到 `0:` 开头的数据，就把后面的字符串拼接到当前消息的气泡里，这就是你屏幕上看到的打字机效果。

---

### 📉 三、向量的底层本质：高维浮点数组

在我们的 RAG 流程中，问题经过 Embedding 变成了“向量”。这玩意儿在底层没有任何神秘感。

当我们通过 `fetch` 调用 OpenAI/代理接口时，底层返回的 JSON 结构如下：

JSON

```
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": [
        -0.006929283495992422,
        -0.005336422007530928,
        -0.009327292000000000,
        ... (包含 1024 或 1536 个这样的浮点数)
      ]
    }
  ],
  "model": "text-embedding-3-small",
  "usage": { "prompt_tokens": 8, "total_tokens": 8 }
}
```

- **本质**：一段文本在这个高维空间中就是一个“坐标”。
    
- **Pinecone 在底层干了什么？** 它就是把用户问题的这个 1024 个小数的坐标拿进去，与数据库里几万个 1024 维的坐标，两两计算**余弦相似度 (Cosine Similarity)** 公式：
    
    similarity=cos(θ)=∥A∥∥B∥A⋅B​
    
    底层就是疯狂地做浮点数点乘运算，找出这个值最接近 `1`（夹角最小，语义最相近）的几个数据块。