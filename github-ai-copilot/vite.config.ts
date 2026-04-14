import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {crx} from '@crxjs/vite-plugin'
import manifest from './manifest.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest })
  ],
  server: {
    port: 5173,
    strictPort: true, // 严格固定端口，如果 5173 被占用就报错，而不是自动切换到 5174
    hmr: {
      port: 5173,
    },
    cors: true, // 允许跨域请求，让 Chrome 插件沙箱能顺利拿到 localhost 的脚本
  }
})


// 浏览器加载插件时如果报错 blocked by CORS policy...（跨域策略拦截）。
// 你的 Vite 本地开发服务器跑在 http://localhost:5173。
// 你的 Chrome 插件运行在一个极度安全的独立沙箱里，协议是 chrome-extension://[一大串ID]。
// Vite 为了实现热更新（HMR），试图把 @vite/env 这个内部脚本强行注入到你的 Background Service Worker 里。
// Chrome 浏览器一看：“好家伙，一个插件居然敢去请求一个外部 localhost 的脚本？这是典型的跨域安全威胁，拦截！” 于是 Service Worker 直接注册失败（Status code 3）。
// 注意，是沙盒请求5173资源时发生的跨域

// 还有一个疑问，manifest.json中明明可以通过配置host_permissions配置允许跨域，这是沙盒的神仙特权，普通网页比不了
// 但是呢，Chrome 浏览器对待普通数据请求（Fetch）和加载可执行代码（Import）的标准，是完全不一样的！
// 1. 为什么大模型 API 可以靠通关文牒（host_permissions）搞定？
// 当我们去请求 DeepSeek 或通义千问时，我们在代码里用的是 fetch('https://api...')。这叫做“数据请求”。
// 对于数据请求，Chrome 给插件留了后门：只要你在 manifest.json 里写了 host_permissions，Chrome 就会赋予你最高权限，强制跳过 CORS 检查。你可以把外部拿到的 JSON 数据随便怎么用。

// 2. 为什么 Vite 的 5173 必须由 Vite 服务器自己允许跨域？
// 回想一下 Vite 那个报错，它是发生在哪里的？是 Vite 为了实现热更新，试图向你的 Background Service Worker 里注入一段运行代码。
// 它用的不是 fetch()，而是 ES6 的模块导入语法：import "http://localhost:5173/@vite/env"。 这叫做“代码执行导入”。
// 这里触碰到了 Chrome 最敏感的神经。Chrome 规定：
// “对于 Service Worker (type: "module") 动态加载外部可执行脚本，即使你有通关文牒也不管用！目标服务器（也就是 Vite 的 5173 端口）必须明确、亲口在 HTTP 响应头里说出 Access-Control-Allow-Origin: *，我才敢把这段代码塞进沙盒里执行。”