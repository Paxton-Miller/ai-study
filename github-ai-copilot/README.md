# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## 构建过程
```bash
# 1. 初始化 Vite 项目 (选择 React + TypeScript)
npm create vite@latest github-ai-copilot -- --template react-ts
cd github-ai-copilot

# 2. 安装你指定的核心技术栈
npm install @reduxjs/toolkit react-redux react-router-dom

# 3. 安装开发 Chrome 插件的神器 (处理 Manifest V3 和热更新)
npm install @crxjs/vite-plugin@beta -D

# 4. 安装流式请求处理库 (为了后面 AI 打字机效果做准备)
npm install @microsoft/fetch-event-source
```

在普通的网页开发中，无论是业务代码还是 Vite 的热更新（HMR）客户端代码，**确实都是统统塞进浏览器主线程（UI 大堂）里运行的。**

那为什么在 Chrome 插件里，后厨（Background）也跑去请求 Vite 资源，甚至因为跨域直接“炸”了呢？

核心原因在于：**普通网页是“单核”运作，而 Chrome 插件是“多核”运作。Vite 为了让你开发爽，强行给所有的“核”都塞了代码。**

让我为你彻底解开这个谜团：

### 1. 为什么（Background）需要请求 Vite 资源？

在普通网页里，你只有一个入口：`index.html`。 但在 Chrome 插件里，你有**多个完全独立的入口**：

1. `index.html` (Side Panel UI 大堂)
    
2. `background.ts` (Service Worker 后厨)
    
3. `content_script.ts` (如果你写了的话，注入到普通网页里的间谍)
    

你装的那个神仙插件 `@crxjs/vite-plugin`，它的终极目标是：**无论你修改了哪个文件，都能实现“热更新（HMR）”。**

- 你改了 `App.tsx`，它希望 Side Panel 局部刷新。
    
- **你改了 `background.ts`，它希望 Background 自动重启！**
    

为了实现这一点，Vite 必须在**每个独立的环境**里都安插一个“内应”（HMR Client，也就是报错里的 `/@vite/env`）。

所以，真相是：**不仅 UI 大堂请求了 Vite 资源，后厨也请求了 Vite 资源！它们俩是同时、独立地向 Vite 5173 端口要代码的。**

### 2. 那为什么你只看到了（Background）的跨域报错？

这是 Chrome 浏览器对不同环境的**容忍度差异**造成的。

- **UI 大堂（Side Panel）的容忍度较高：** 当 UI 试图去 `localhost:5173` 拉取脚本时，如果遇到跨域，它会在侧边栏的控制台（F12）里报一个红色的 CORS 错误。但侧边栏这个页面本身还是能打开的（只是白屏或失去热更新能力）。如果你当时没按 F12 检查侧边栏，你可能根本注意不到。
    
- **后厨（Service Worker）是“零容忍”：** Chrome 对 Service Worker 的安全要求达到了变态的级别。Chrome 在**安装**后厨（注册 Service Worker）时，会提前扫描它里面所有的 `import` 语句。 只要 Chrome 发现其中有一个 `import`（比如引入 Vite 热更新脚本）跨域失败了，Chrome 的态度是：**“有安全隐患！这整个后厨我都不要了！”** 于是，Chrome 直接抛出致命的 `Status code 3` 错误，并**拒绝启动整个扩展的后台逻辑**。这个错误极其刺眼，直接显示在 `chrome://extensions/` 的管理面板上。
    

### 总结：打破普通 Web 开发的思维定式

你之所以会有这个疑问，是因为你把 Chrome 插件当成了一个“大网页”。

在普通的 Web 开发中，前端就是一堆运行在主线程的 JS 代码，后端在远端的服务器上。 但在 Chrome 插件的开发中：

- **Side Panel** 是你的前端（主线程，负责 UI）。
    
- **Background** 是你的**“本地前端服务器”**（Service Worker 线程，负责后台常驻逻辑）。
    
- **Vite** 是你的**“开发构建服务器”**。
    

在开发模式下，Vite 这个“开发构建服务器”必须同时给你的“前端”和“本地前端服务器”派发代码（发热更新包）。因为它们俩属于不同的沙盒环境（不同的 Origin），所以 Vite 必须全量开启 `cors: true`，才能让这两兄弟都顺利拿到快递。