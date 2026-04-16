"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
// 1. 从我们的组件库中引入核心组件和主题
import { 
  ThemeProvider, 
  framerTheme, 
  Container, 
  Grid, 
  Card, 
  Text, 
  Button, 
  airtableTheme
} from "awesome-design-ui";
import "awesome-design-ui/style.css";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/scrape",
    }),
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    // 2. 注入主题引擎 (这里可以一键切换成 appleTheme 或 airtableTheme 测试通用性)
    <ThemeProvider theme={airtableTheme}>
      
      {/* 3. 使用 Container 控制最大宽度和全局居中 */}
      <Container 
        as="main" 
        className="flex flex-col min-h-screen pt-20 md:pt-40" 
        style={{ maxWidth: '900px' }}
      >
        {/* === Header 区域 === */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {/* 使用 Grid 控制垂直间距，替代硬编码的 margin */}
          <Grid columns={1} gap={20} style={{ marginBottom: 'var(--ad-spacing-semantic-section)' }}>
            
            {/* 状态徽章 */}
            <div style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '8px', 
              padding: '6px 12px', width: 'fit-content',
              backgroundColor: 'var(--ad-colors-background-surfaceGlass)', 
              border: '1px solid var(--ad-colors-border-subtle)',
              borderRadius: 'var(--ad-radii-pill)' 
            }}>
              <span style={{ 
                width: '8px', height: '8px', borderRadius: '50%', 
                backgroundColor: 'var(--ad-colors-action-primary)',
                boxShadow: 'var(--ad-shadows-semantic-cardRingHover)' 
              }}></span>
              {/* 完美使用 Typography Token */}
              <Text variant="caption" color="secondary">React Source Code Assistant</Text>
            </div>

            {/* 标题 */}
            <Text as="h1" variant="sectionDisplay">
              React <span style={{ color: 'var(--ad-colors-text-muted)' }}>Copilot.</span>
            </Text>

          </Grid>
        </motion.div>

        {/* === Chat 交互区域 === */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex-1 flex flex-col min-h-0 pb-10"
        >
          {/* 使用我们的 Card 组件，开启 elevated 悬浮阴影 */}
          <Card 
            variant="elevated" 
            padding="none" 
            radius="card"
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            {/* 顶部 MacOS 风格控制条 */}
            <div style={{ 
              height: '48px', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '8px',
              backgroundColor: 'var(--ad-colors-background-surface)', 
              borderBottom: '1px solid var(--ad-colors-border-subtle)' 
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--ad-colors-background-surfaceGlassHover)' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--ad-colors-background-surfaceGlassHover)' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--ad-colors-background-surfaceGlassHover)' }} />
              <Text variant="microCode" color="placeholder" style={{ marginLeft: '8px' }}>
                session_connected
              </Text>
            </div>

            {/* 消息对话列表 */}
            <div style={{ 
              flex: 1, overflowY: 'auto', 
              padding: 'var(--ad-spacing-semantic-cardPadding)', 
              backgroundColor: 'var(--ad-colors-background-base)' 
            }}>
              <Grid columns={1} gap={30}>
                {messages.length === 0 && (
                  <Text variant="body" color="placeholder" style={{ textAlign: 'center', marginTop: '40px' }}>
                    等待提问，比如：“useState 可以传函数吗？”
                  </Text>
                )}

                {messages.map((m) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={m.id}
                    className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <Text variant="smallCaption" color="placeholder" style={{ marginBottom: '8px', padding: '0 8px' }}>
                      {m.role === "user" ? "You" : "AI Copilot"}
                    </Text>

                    {/* 消息气泡完全 Token 化 */}
                    <div style={{
                      maxWidth: '85%',
                      padding: '12px 20px',
                      backgroundColor: m.role === "user" ? 'var(--ad-colors-background-inverse)' : 'var(--ad-colors-background-surface)',
                      borderRadius: 'var(--ad-radii-container)',
                      borderTopRightRadius: m.role === "user" ? 'var(--ad-radii-micro)' : 'var(--ad-radii-container)',
                      borderTopLeftRadius: m.role === "user" ? 'var(--ad-radii-container)' : 'var(--ad-radii-micro)',
                      border: m.role === "user" ? 'none' : '1px solid var(--ad-colors-border-subtle)'
                    }}>
                      <Text 
                        variant="body" 
                        color={m.role === "user" ? "inverse" : "primary"} 
                        style={{ whiteSpace: 'pre-wrap' }}
                      >
                        {m.parts.filter((p) => p?.type === "text").map((item) => item.text).join("")}
                      </Text>
                    </div>
                  </motion.div>
                ))}

                {status === "streaming" && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--ad-colors-action-primary)' }} className="animate-pulse" />
                    <Text variant="bodyReadable" color="secondary" className="animate-pulse">
                      AI 正在阅读文档并思考...
                    </Text>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </Grid>
            </div>

            {/* 底部输入框区域 */}
            <div style={{ 
              padding: '16px', 
              backgroundColor: 'var(--ad-colors-background-surface)', 
              borderTop: '1px solid var(--ad-colors-border-subtle)' 
            }}>
              <form
                onSubmit={handleSubmit}
                // 使用原生的 focus-within 结合 CSS 变量实现高级交互边框
                className="group relative flex items-center w-full transition-all"
                style={{
                  backgroundColor: 'var(--ad-colors-background-base)',
                  borderRadius: 'var(--ad-radii-pill)',
                  border: '1px solid var(--ad-colors-border-input)',
                  padding: '4px 4px 4px 20px'
                }}
              >
                {/* CSS 魔法：为父级容器添加 focus 态投影 */}
                <style>{`
                  form.group:focus-within {
                    border-color: var(--ad-colors-border-focus) !important;
                    box-shadow: var(--ad-shadows-semantic-inputFocus) !important;
                  }
                `}</style>
                
                {/* 原生 Input 消费排版 Token */}
                <input
                  className="flex-grow bg-transparent outline-none placeholder-opacity-40"
                  style={{
                    color: 'var(--ad-colors-text-primary)',
                    fontFamily: 'var(--ad-typography-styles-body-fontFamily)',
                    fontSize: 'var(--ad-typography-styles-body-fontSize)',
                    lineHeight: 'var(--ad-typography-styles-body-lineHeight)',
                  }}
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask anything about React..."
                  disabled={status !== "ready" && status !== "error"}
                />
                
                <Button 
                  variant="solid" // Airtable/Apple 兼容的主按钮
                  disabled={status !== "ready" && status !== "error"}
                  style={{ borderRadius: 'var(--ad-radii-pill)' }}
                >
                  发送
                </Button>
              </form>
            </div>
          </Card>
        </motion.div>
      </Container>
    </ThemeProvider>
  );
}