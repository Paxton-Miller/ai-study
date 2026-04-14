import { useState } from 'react';
import { type RootState } from './store';
import { useDispatch, useSelector } from 'react-redux';
import { addMessage, setGenerating, updateLastMessage } from './store/chatSlice';

function App() {
  // 在 React 中，所有“和外界打交道的事情”（发网络请求、建 WebSocket、拉 Chrome 专线、操作真实的 DOM），统称为副作用 (Side Effects)。
  // 为什么把port写到组件函数里会引发灾难？因为每次content变化，都会出发setContent，setContent React内部会重新渲染这个组件函数，由此又建立一条port专线
  // 正确做法是把这个副作用封装到handleSend里面，或者用useEffect
  const [content, setContent] = useState('')
  const messages = useSelector((state: RootState) => state.chat.messages)
  const isGenerating = useSelector((state: RootState) => state.chat.isGenerating)
  const dispatch = useDispatch()

  // const port = chrome.runtime.connect({
  //   name: 'chat-stream'
  // })
  // port.onMessage.addListener((msg) => {
  //   console.log(msg)
  //   // 请求与响应数据处理
  //   if (msg.type === 'CHUNK') {
  //     dispatch(updateLastMessage(msg.payload))
  //   } else if (msg.type === 'DONE') {
  //     dispatch(setGenerating(false))
  //     // port.disconnect()
  //   } else if (msg.type === 'ERROR') {
  //     alert(msg.payload)
  //     dispatch(setGenerating(false))
  //   }
  // })

  const handleSend = () => {
    const port = chrome.runtime.connect({
      name: 'chat-stream'
    })
    port.onMessage.addListener((msg) => {
      console.log(msg)
      // 请求与响应数据处理
      if (msg.type === 'CHUNK') {
        dispatch(updateLastMessage(msg.payload))
      } else if (msg.type === 'DONE') {
        dispatch(setGenerating(false))
        port.disconnect()
      } else if (msg.type === 'ERROR') {
        alert(msg.payload)
        dispatch(setGenerating(false))
        port.disconnect()
      }
    })

    port.postMessage({
      type: 'SEND_PROMPT',
      payload: content
    })
    dispatch(addMessage({role: 'user', content: content}))
    dispatch(addMessage({role: 'assistant', content: ''}))
    dispatch(setGenerating(true))
  }

  const handleInputChange = (e) => {
    setContent(e.target.value)
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          justifyContent: 'start',
          alignItems: 'center',
          margin: '1rem'
        }}
      >
        <input style={{ flexGrow: 1 }} value={content} onChange={handleInputChange} placeholder='请输入prompt'/>
        <button style={{ marginLeft: '1rem' }} onClick={handleSend} disabled={isGenerating}>Send</button>
      </div>
      <div>{ messages.map((m, idx) => <p key={idx}>{m.content}</p>) }</div>
    </div>
  );
}

export default App;