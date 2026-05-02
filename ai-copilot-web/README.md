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


# Next.js 核心架构与运行机制学习总结

本文档总结了关于 Next.js (App Router 架构) 的核心底层原理、编译打包机制、文件路由系统以及与传统 Node.js 的关键差异。

---

## 1. 核心底线：编译期 (Build Time) vs 运行期 (Run Time)

Next.js 的很多“反直觉”报错（如无法在配置中使用变量），本质上是因为框架将代码的生命周期严格分为了两部分。

### 1.1 编译期 (Build Time / AST 扫描)
- **执行者**：Next.js 内置的 SWC 编译器（Rust 编写）。
- **行为**：在执行 `npm run build` 或本地启动 `npm run dev` 构建沙盒时，编译器会进行**静态语法分析 (AST 解析)**。
- **目的**：提取出基础设施配置（IaC - 基础设施即代码），例如生成供 Vercel 或 AWS 使用的 JSON 配置文件（`.vc-config.json`），以此来分配服务器类型、设置超时时间等。
- **限制**：由于此时 **JavaScript 代码并未真正执行**，编译器只会“看文本”，因此底层的路由配置变量必须是**写死的静态字面量**，绝不能使用动态变量或跨文件引入。

### 1.2 运行期 (Run Time)
- **执行者**：真正的 V8 引擎（Node.js 进程或 Edge 沙盒）。
- **行为**：当真实用户的 HTTP 请求到达时，服务器开始逐行执行业务逻辑代码（如 API 处理、数据库查询、大模型调用）。
- **能力**：此时可以随意使用变量、动态 `import`、读取 `process.env` 等传统编程范式。

---

## 2. 核心配置变量 (Route Segment Config)

这些变量被称为“魔法变量”，它们不是写给业务代码看的，而是**写给 Next.js 编译器和云平台看的指令**。

| 变量名 | 常见取值 | 核心作用 |
| :--- | :--- | :--- |
| **`runtime`** | `'nodejs'` 或 `'edge'` | 决定当前路由分配何种底层容器环境。 |
| **`maxDuration`** | 数字 (如 `60`) | 设置 Serverless 函数的最大执行时间（秒），防止网关过早切断（如 504 错误）。 |
| **`dynamic`** | `'auto'`, `'force-dynamic'` 等 | 控制页面/接口是使用构建时缓存，还是每次请求都强制动态执行。 |
| **`revalidate`** | `false`, `0`, 数字 | 设置缓存的过期时间（单位：秒）。 |

> **注意**：以上变量只有写在**特定的路由文件**最顶层才会被识别，写在普通组件里无效。

---

## 3. 文件路由系统 (File-system Based Routing)

在 Next.js 中，**“文件路径即路由地址”**。目录下的文件被分为两类：

### 3.1 官方钦定的“魔法文件”
只有这些特定命名的文件，才能作为路由节点，且 `runtime` 等配置才会生效：
- `page.tsx`: 网页 UI 的入口。
- `route.ts`: 后端 API 接口的入口（没有 UI）。
- `layout.tsx`: 页面通用外壳（导航栏等）。
- `loading.tsx` / `error.tsx`: 加载状态与错误边界 UI。

### 3.2 普通文件 (Colocation)
除了上述名称之外的所有文件（如 `Button.tsx`, `utils.ts`, `config.ts`）。它们只是普通的 JavaScript/TypeScript 文件，没有路由特权。

---

## 4. 前后端边界划分："use client"

Next.js 默认采用了 **Server Components (服务端组件)** 架构。

- **默认后端运行**：所有的 `.tsx` 页面和组件默认都在服务器上渲染。它们可以直接查数据库、读密钥，但**无法绑定任何交互事件**（没有 `onClick`，不能用 `useState`）。
- **划定前端边界**：只有在文件的**第一行**写下 `"use client";`，Next.js 才明白这是一个需要交互的前端组件，进而将其打包成 JS 发送给用户的浏览器执行。

---

## 5. Next.js 后端 vs 传统 Node.js (Express)

在 `route.ts` 中写 API 时，必须适应 Next.js 的四个特殊设定：

1. **拥抱 Web 规范**：摒弃了 Node.js 原生的 `req/res` 对象，强制使用标准 Web API 的 `Request` 和 `Response` 对象。
2. **激进的默认缓存**：Next.js 重写了底层的 `fetch`，默认会对网络请求进行持久化缓存。如果不想使用旧数据，必须显式配置 `no-store`。
3. **Edge Runtime 的存在**：如果配置了 `runtime = 'edge'`，代码将运行在轻量级沙盒中，不支持绝大多数 Node.js 内置模块（如 `fs`, `path`），以此换取近乎 0 毫秒的冷启动速度。
4. **Serverless 优先**：API 路由通常被部署为按需拉起的云函数。**切勿依赖全局内存**来保存长期的持久化状态。

---

## 6. AI 助手后端实战亮点 (附加回顾)

结合项目源码，我们还探讨了如何构建一个生产级的 AI Agent 后端：
- **Rate Limit (频率限制)**：使用基于内存的“固定时间窗口算法 (Fixed Window)”，通过拼接 `IP:UserID:ToolName` 实现防刷和精细化控制。
- **Audit Log (审计日志)**：贯穿生命周期的埋点机制，不仅记录执行状态，还区分了内部追踪的 `requestId` 与用于外部厂商对账的 `modelRequestId`。
- **按需拉起的 MCP Server**：不作为独立端口常驻，而是利用 Next.js API Route + SSE (Server-Sent Events) 长连接机制，实现了依附于 HTTP 请求的轻量化 Server 生命周期管理。


## 7. Next的几种部署方式
### 一、 完全托管的 Serverless 模式 (推荐/官方路线)

这是 Next.js 设计的初衷，也是目前出海项目和独立开发者最常用的模式。典型代表是 **Vercel**、**Netlify** 或 **AWS Amplify**。

- **工作原理**：代码推送后，平台自动剥离静态文件到全球 CDN，将 API 路由（如你的 `route.ts`）打包成按需拉起的 Serverless 云函数，将中间件打包成 Edge Function。
    
- **特性与优势**：
    
    - **零运维 (NoOps)**：无需配置 Nginx、无需管理端口、自带 SSL 证书和全球负载均衡。
        
    - **极致弹性**：0 访问时 0 费用；突发 10 万并发也能瞬间扛住（Scale to Infinity）。
        
    - **开箱即用的边缘计算**：完美支持 `runtime = 'edge'`，实现毫秒级冷启动。
        
- **代价与限制**：
    
    - **状态丢失**：无法使用内存全局变量持久化数据，必须依赖外部 Redis/数据库。
        
    - **生态要求苛刻**：数据库通常需要暴露公网端点，且最好是 Serverless 架构（如 Neon、Supabase）以防连接池爆满。
        
    - **厂商锁定 (Vendor Lock-in)**：深度绑定 Vercel 后，想无缝迁移到自己的裸机服务器会比较痛苦。
        

---

### 二、 独立 Node.js 服务模式 (传统主机路线)

如果你有一台传统的云服务器（如阿里云 ECS、腾讯云轻量应用服务器），并且想把代码像普通 Express 应用一样跑起来。

- **工作原理**：在服务器上执行 `npm run build`，然后执行 `npm run start`。这会启动一个长连接的 Node.js 常驻进程（通常配合 PM2 来做进程守护）。
    
- **特性与优势**：
    
    - **数据绝对安全**：数据库可以部署在同一台机器或同一个 VPC（内网）下，无需暴露公网，安全性极高。
        
    - **长连接友好**：可以轻松在代码里使用原生的 WebSocket，也可以在内存里放心地暂存变量。
        
    - **成本可控**：不管多少流量，每个月就是固定的服务器租金。
        
- **代价与限制**：
    
    - **手动挡运维**：你需要自己装 Nginx 做反向代理、自己配 HTTPS 证书、自己写守护进程脚本。
        
    - **失去 Edge 能力**：Next.js 的 Edge Runtime 会退化成普通的 Node 模拟运行，失去全球边缘加速的特性。
        

---

### 三、 Docker + K8s 容器编排模式 (企业级大厂路线)

当公司业务极其庞大，且有专业的运维团队（DevOps）时，通常会采用这种路线。

- **工作原理**：编写 `Dockerfile`，将 Next.js 应用（Standalone 模式）打包成不可变的镜像，推送到私有镜像仓库，最后由 Kubernetes (K8s) 调度到各个节点上运行。
    
- **特性与优势**：
    
    - **云中立 (Cloud Agnostic)**：不绑定任何云厂商，随时可以从阿里云迁移到 AWS。
        
    - **标准化交付**：与公司现有的 Java、Go 微服务体系完全打通，统一监控、统一日志。
        
- **代价与限制**：
    
    - **Next.js 缓存地狱**：这是自建 K8s 最大的痛点！Next.js 默认将页面缓存写在本地磁盘（`.next/cache`）。在 K8s 中有多个 Pod 时，用户第一次请求打到 Pod A（缓存了旧数据），第二次请求打到 Pod B（没缓存），会导致页面数据反复横跳。你**必须**额外部署 Redis 并修改 Next.js 底层配置来实现“分布式缓存共享”。
        

---

### 四、 纯静态导出模式 (Static Export)

如果你的项目只是一个纯前端的官网、博客或文档中心。

- **工作原理**：在 `next.config.ts` 中配置 `output: 'export'`。执行 Build 后，Next.js 会把所有页面预渲染成纯粹的 HTML、CSS 和 JS 文件（生成一个 `out` 文件夹）。
    
- **特性与优势**：
    
    - **极度便宜且安全**：可以直接把文件夹扔到 GitHub Pages、阿里云 OSS、AWS S3 上托管，连 Node.js 环境都不需要，黑客根本无从入侵（因为没有后端进程）。
        
- **代价与限制 (致命限制)**：
    
    - **后端能力全毁**：**无法使用任何 `route.ts` API 路由！** 无法使用依赖服务器的图像优化 (`next/image`)，不支持动态服务端渲染 (SSR)。像你当前项目中对接大模型的 `/api/scrape/route.ts` 在这种模式下会直接失效。