/**
 * OpenAI API
 */
import { createParser } from 'eventsource-parser';
import { DEFAULT_HOST } from '@/constants';

export interface IOnTextCallbackResult {
  // 返回的文本
  text: string;
  // 取消请求
  cancel: () => void;
}

// Creates a model response for the given chat conversation.
export const completion = async (
  request: OpenAI.ChatCompletions.Request,
  onText?: (option: IOnTextCallbackResult) => void, // 回调函数
  onError?: (error: Error) => void,
) => {
  if (request.messages.length === 0) {
    throw new Error('No messages to replay');
  }

  // 是否取消 fetch
  let hasCancel = false; // 跟踪是否触发了中断操作
  // fetch 中断对象
  const controller = new AbortController(); // 中断网络请求的浏览器内置对象
  const cancel = () => {
    hasCancel = true;
    controller.abort(); // 触发终端操作
  };

  let fullText = '';
  const messages = request.messages.map(message => ({
    role: message.role,
    content: message.content,
    name: message.name,
  }));
  try {
    const response = await fetch( // 发送post请求
      `${request.host || DEFAULT_HOST}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${request.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages,
        model: request.model,
        stream: true,
      }),
      signal: controller.signal,
    });
    await handleSSE(response, (message) => { // 得到response响应
      if (message === '[DONE]') {
        return;
      }
      const data = JSON.parse(message);
      if (data.error) {
          throw new Error(`Error from OpenAI: ${JSON.stringify(data)}`);
      }
      const text = data.choices[0]?.delta?.content;
      if (text !== undefined) {
        fullText += text;
        onText?.({ text: fullText, cancel });
      }
    });
  } catch (error) {
    // 执行取消操作不抛出异常
    if (hasCancel) {
      return;
    }
    onError?.(error as Error);
    throw error;
  }
  return fullText;
};

// 处理 server-sent events/eventsource,
const handleSSE = async ( // 处理服务器发送事件
  response: Response,
  onMessage: (message: string) => void,
) => {
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error ? JSON.stringify(error) : `${response.status} ${response.statusText}`);
  }
  if (response.status !== 200) {
    throw new Error(`Error from OpenAI: ${response.status} ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error('No response body');
  }
  const parser = createParser((event) => {
    if (event.type === 'event') {
      onMessage(event.data); // 将每个事件的数据传递给调用者
    }
  });
  for await (const chunk of iterableStreamAsync(response.body)) {
    const str = new TextDecoder().decode(chunk);
    parser.feed(str);
  }
};

// 异步生成器函数：可读流转换为异步可迭代器
const iterableStreamAsync = async function* (stream: ReadableStream): AsyncIterableIterator<Uint8Array> {
  const reader = stream.getReader();
  try {
    while (true) {
      // 从流中读取数据
      const { value, done } = await reader.read();
      if (done) {
        return;
      } else {
        yield value;
      }
    }
  } finally {
    reader.releaseLock();
  }
};
