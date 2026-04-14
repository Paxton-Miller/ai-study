import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatState {
  messages: Message[];
  isGenerating: boolean;
}

const initialState: ChatState = {
  messages: [],
  isGenerating: false,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    // 函数定义规定是死的，第一个是现在的state，第二个是PayloadAction{ type: ?, payload: 实际的数据 }
    addMessage(state, action: PayloadAction<Message>) {
      // 底层 immer 库帮忙自动做了浅拷贝
      state.messages.push(action.payload);
      // 传统redux写法：
      //   return {
      //     ...state,
      //     messages: [...state.messages, action.payload]
      //   }
    },
    updateLastMessage(state, action: PayloadAction<string>) {
      // 用于流式渲染时，不断拼接最后一个 assistant 的回复
      const lastMsg = state.messages[state.messages.length - 1];
      if (lastMsg && lastMsg.role === "assistant") {
        lastMsg.content += action.payload;
      }
    },
    setGenerating(state, action: PayloadAction<boolean>) {
      state.isGenerating = action.payload;
    },
  },
});

// 调用时: 
// dispatch(addMessage(msgs))

export const { addMessage, updateLastMessage, setGenerating } =
  chatSlice.actions;
export default chatSlice.reducer;
