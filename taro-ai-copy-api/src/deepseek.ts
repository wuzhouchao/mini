/**
 * DeepSeek API 调用（OpenAI 兼容格式）
 * 文档: https://api-docs.deepseek.com/
 */

const DEEPSEEK_BASE = 'https://api.deepseek.com'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionOptions {
  model?: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
}

export interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string }
    finish_reason?: string
  }>
  error?: { message?: string }
}

export async function createChatCompletion(
  apiKey: string,
  options: ChatCompletionOptions
): Promise<string> {
  const { model = 'deepseek-chat', messages, temperature = 0.7, max_tokens = 2048 } = options

  const res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
    }),
  })

  const data = (await res.json()) as ChatCompletionResponse

  if (!res.ok) {
    const msg = data?.error?.message ?? res.statusText ?? 'Unknown error'
    throw new Error(`DeepSeek API error: ${msg}`)
  }

  const text = data?.choices?.[0]?.message?.content?.trim()
  if (text == null) {
    throw new Error('DeepSeek API returned empty content')
  }

  return text
}
