// lib/providers.ts — 멀티 프로바이더 추상화

import { chat as bedrockChat, type Message } from './claude'

export interface ProviderModel {
  id: string
  name: string
}

export interface ChatOptions {
  model: string
  systemPrompt?: string
  maxTokens?: number
  onChunk?: (text: string) => void
}

export interface Provider {
  id: string
  name: string
  models: ProviderModel[]
  chat: (messages: Message[], opts: ChatOptions) => Promise<string>
  testConnection: () => Promise<boolean>
}

// ── Bedrock Provider ──

export function createBedrockProvider(credentials: {
  awsAccessKeyId: string
  awsSecretAccessKey: string
  awsRegion: string
}): Provider {
  return {
    id: 'bedrock',
    name: 'AWS Bedrock',
    models: [
      { id: 'us.anthropic.claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
      { id: 'us.anthropic.claude-opus-4-6-v1', name: 'Claude Opus 4.6' },
      {
        id: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
        name: 'Claude Haiku 4.5',
      },
    ],
    chat: async (messages, opts) => {
      return bedrockChat(messages, {
        ...credentials,
        model: opts.model,
        systemPrompt: opts.systemPrompt,
        maxTokens: opts.maxTokens,
        onChunk: opts.onChunk,
      })
    },
    testConnection: async () => {
      try {
        await bedrockChat(
          [{ role: 'user', content: 'Hi' }],
          {
            ...credentials,
            maxTokens: 10,
          }
        )
        return true
      } catch {
        return false
      }
    },
  }
}

// ── OpenAI Provider ──

export function createOpenAIProvider(apiKey: string): Provider {
  return {
    id: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'o3-mini', name: 'o3-mini' },
    ],
    chat: async (messages, opts) => {
      const body: Record<string, unknown> = {
        model: opts.model,
        messages: [
          ...(opts.systemPrompt
            ? [{ role: 'system' as const, content: opts.systemPrompt }]
            : []),
          ...messages,
        ],
        max_tokens: opts.maxTokens ?? 2048,
        stream: !!opts.onChunk,
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`OpenAI error: ${err}`)
      }

      if (opts.onChunk && res.body) {
        return readSSEStream(res.body, opts.onChunk, 'openai')
      }

      const data = await res.json()
      return data.choices?.[0]?.message?.content ?? ''
    },
    testConnection: async () => {
      try {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        return res.ok
      } catch {
        return false
      }
    },
  }
}

// ── Gemini Provider ──

export function createGeminiProvider(apiKey: string): Provider {
  return {
    id: 'gemini',
    name: 'Google Gemini',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    ],
    chat: async (messages, opts) => {
      const contents = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

      const body: Record<string, unknown> = {
        contents,
        generationConfig: {
          maxOutputTokens: opts.maxTokens ?? 2048,
        },
      }

      if (opts.systemPrompt) {
        body.systemInstruction = {
          parts: [{ text: opts.systemPrompt }],
        }
      }

      const streamSuffix = opts.onChunk ? 'streamGenerateContent?alt=sse' : 'generateContent'
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:${streamSuffix}&key=${apiKey}`

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Gemini error: ${err}`)
      }

      if (opts.onChunk && res.body) {
        return readSSEStream(res.body, opts.onChunk, 'gemini')
      }

      const data = await res.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    },
    testConnection: async () => {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        )
        return res.ok
      } catch {
        return false
      }
    },
  }
}

// ── SSE Stream Reader ──

async function readSSEStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (text: string) => void,
  provider: 'openai' | 'gemini'
): Promise<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue

      try {
        const parsed = JSON.parse(data)
        let text = ''

        if (provider === 'openai') {
          text = parsed.choices?.[0]?.delta?.content ?? ''
        } else if (provider === 'gemini') {
          text = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        }

        if (text) {
          fullText += text
          onChunk(text)
        }
      } catch {
        // skip malformed data
      }
    }
  }

  return fullText
}
