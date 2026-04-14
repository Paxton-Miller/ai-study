// npm install @types/chrome -D
// 侧边栏初始化逻辑 (保持不变)
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("侧边栏初始化失败:", error));


const handleSend = (port: chrome.runtime.Port) => {
    port.onMessage.addListener(async msg => {
        if (msg.type === 'SEND_PROMPT') {
            const API_KEY = 'sk-c5585fc0317a47699a21519cd5fd214b';
            const response = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [{ role: 'user', content: msg.payload }],
                    stream: true // 开启流式输出！
                })
            });
            console.log(response)

            // 手撕处理 SSE 返回的数据
            // 1.有可能data: {id:
            // 2.有可能data: [DONE]
            // 3.有可能多个data
            // 每个消息结尾都是\n\n，且不会影响content内部\n换行，因为消息结尾的换行\n本质上是一个字符，content内部的\n本质上是两个字符，
            // JSON 协议有一个死规定：JSON 的双引号内部，绝对不允许出现真实的不可见控制符（比如那个 ASCII 10 号的回车）！ 如果有，这个 JSON 就是非法的，解析器会直接报错。所以，最终通过网线传到你前端浏览器里的文本是："A\nB"。这完全是一串扁平的、安全的、没有任何控制字符的纯文本。
            // 不管怎么变，他们都是通过换行符连接的
            const reader = response.body.getReader()
            const decoder = new TextDecoder('utf-8');
            let { done, value } = await reader.read()
            let buffer = ''
            while(!done) {
                const val = decoder.decode(value, {stream: true})
                buffer += val
                const lines = buffer.split('\n')
                // 防止最后一行不靠谱
                buffer = lines.pop()
                try {
                    for (const line of lines) {
                        if (line.startsWith('data:')) {
                            const content = line.slice(5).trim()
                            if (content.trim() === '[DONE]') {
                                port.postMessage({type: 'DONE', payload: ''})
                                break
                            }
                            const chunk = JSON.parse(content).choices[0].delta.content
                            port.postMessage({type: 'CHUNK', payload: chunk})
                        }
                        // 自动跳过了‘’
                    }
                } catch (error) {
                    port.postMessage({type: 'ERROR', payload: error})
                    return
                }
                
                const res = await reader.read()
                done = res.done
                value = res.value
            }
        }
    })
}


chrome.runtime.onConnect.addListener(port => {
    switch (port.name) {
        case 'chat-stream':
            handleSend(port)
            break
    }
})