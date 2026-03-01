// hooks/useChat.ts
import { useState, useCallback } from 'react'
import { chat, type Message } from '../lib/claude'
import { MemoryStore } from '../lib/memory'
import type { Config } from './useConfig'

export interface ChatMessage extends Message {
  id: string
  ts: number
  streaming?: boolean
}

export function useChat(conversationId: string, config: Config) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const hasCredentials = !!(config.awsAccessKeyId && config.awsSecretAccessKey)

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim() || !hasCredentials) return
      setError('')

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userText,
        ts: Date.now(),
      }

      const assistantId = crypto.randomUUID()
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        ts: Date.now(),
        streaming: true,
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setIsLoading(true)

      try {
        const systemPrompt =
          '당신은 도움이 되는 AI 어시스턴트입니다.' +
          (await MemoryStore.toSystemPrompt(conversationId))

        const history: Message[] = messages
          .filter((m) => m.content.trim() !== '')
          .map(({ role, content }) => ({ role, content }))
        history.push({ role: 'user', content: userText })

        await chat(history, {
          awsAccessKeyId: config.awsAccessKeyId,
          awsSecretAccessKey: config.awsSecretAccessKey,
          awsRegion: config.awsRegion,
          model: config.model,
          systemPrompt,
          onChunk: (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + chunk }
                  : m
              )
            )
          },
        })

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m
          )
        )
      } catch (err) {
        setError(String(err))
        setMessages((prev) => prev.filter((m) => m.id !== assistantId))
      } finally {
        setIsLoading(false)
      }
    },
    [messages, conversationId, config, hasCredentials]
  )

  const clearMessages = useCallback(() => setMessages([]), [])

  return { messages, isLoading, error, sendMessage, clearMessages }
}
