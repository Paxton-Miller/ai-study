'use client'
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

export default function ChatPage() {
  // 1. 自己管理输入框状态
  const [input, setInput] = useState('');

  // 2. 调用最新版的 useChat
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/scrape', // 指向你的后端接口
    }),
  });

  // 3. 各种事件处理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // 阻止表单默认刷新行为
    if (!input.trim()) return; // 防空发
    
    sendMessage({ text: input }); // 发送给后端
    setInput(''); // 清空输入框
  }

  // 4. UI 渲染
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>📖 React `useState` 源码助教</h2>
      
      {/* 聊天记录展示区 */}
      <div style={{ height: '400px', overflowY: 'auto', border: '1px solid #ccc', marginBottom: '20px', padding: '15px', borderRadius: '8px' }}>
        {messages.length === 0 && <p style={{ color: '#888' }}>等待提问...</p>}
        
        {messages.map(m => (
          <div key={m.id} style={{ margin: '15px 0', color: m.role === 'user' ? '#1890ff' : '#333' }}>
            <strong>{m.role === 'user' ? '你：' : 'AI：'}</strong> 
            <span style={{ whiteSpace: 'pre-wrap' }}>{m.parts.filter(p => p?.type === 'text').map(item => item.text).join('')}</span>
          </div>
        ))}
        {status === 'streaming' && <div style={{ color: 'gray', marginTop: '10px' }}>AI 正在阅读文档并思考...</div>}
      </div>

      {/* 完美的表单提交区 */}
      <form 
        onSubmit={handleSubmit} 
        style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
      >
        <input 
          style={{ flexGrow: 1, padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
          value={input} 
          onChange={handleInputChange}
          placeholder="问点什么吧，比如：useState 可以传函数吗？"
          disabled={status !== 'ready' && status !== 'error'} // 状态防抖
        />
        <button 
          type="submit" 
          disabled={status !== 'ready' && status !== 'error'} 
          style={{ marginLeft: '10px', padding: '12px 24px', cursor: 'pointer', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '4px' }}
        >
          发送
        </button>
      </form>
    </div>
  )
}