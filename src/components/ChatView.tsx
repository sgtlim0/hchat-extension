// components/ChatView.tsx — Zustand 연동 채팅 뷰 + 슬래시 명령어

import { useState, useRef, useEffect } from 'react'
import { useSessionStore } from '@/entities/session/session.store'
import { chat, type Message } from '../lib/claude'
import { useUsageStore, estimateTokens } from '@/entities/usage/usage.store'
import { useAuditStore } from '@/entities/audit/audit.store'
import { MemoryStore } from '../lib/memory'
import { CommandPalette } from '@/widgets/command-palette/CommandPalette'
import { ContextStack } from '@/widgets/context-stack/ContextStack'
import { findCommand } from '@/widgets/command-palette/commands'
import type { Command } from '@/widgets/command-palette/commands'
import type { ChatMessage } from '@/entities/session/session.types'

interface ChatViewProps {
  conversationId: string
  config: {
    awsAccessKeyId: string
    awsSecretAccessKey: string
    awsRegion: string
    model: string
    triggerWord: string
  }
  pendingPrompt?: string
  onPendingConsumed?: () => void
  onCommandAction?: (action: string) => void
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`msg ${isUser ? 'msg-user' : 'msg-ai'}`}>
      {!isUser && <div className="msg-avatar">H</div>}
      <div className="msg-body">
        <div className="msg-content">
          {msg.content}
          {msg.streaming && <span className="cursor-blink">|</span>}
        </div>
        <div className="msg-time">
          {new Date(msg.ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

const suggestions = [
  { icon: '📄', text: '이 페이지 요약해줘', action: 'summarize' },
  { icon: '💻', text: '코드 리뷰 해줘', action: '' },
  { icon: '🌐', text: '오늘 AI 뉴스 알려줘', action: '' },
]

function getModelDisplayName(modelId: string): string {
  if (modelId.includes('claude-sonnet-4')) return 'Claude Sonnet 4'
  if (modelId.includes('claude-opus-4')) return 'Claude Opus 4'
  if (modelId.includes('claude-haiku')) return 'Claude Haiku'
  return modelId.split('.').pop()?.split(':')[0] ?? modelId
}

export function ChatView({
  conversationId,
  config,
  pendingPrompt,
  onPendingConsumed,
  onCommandAction,
}: ChatViewProps) {
  const currentSession = useSessionStore((s) => s.currentSession)
  const addMessage = useSessionStore((s) => s.addMessage)
  const updateMessage = useSessionStore((s) => s.updateMessage)
  const removeMessage = useSessionStore((s) => s.removeMessage)
  const clearMessages = useSessionStore((s) => s.clearMessages)
  const persist = useSessionStore((s) => s.persist)

  const recordUsage = useUsageStore((s) => s.recordUsage)
  const addAuditLog = useAuditStore((s) => s.addLog)

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const session = currentSession()
  const messages = session?.messages ?? []
  const hasCredentials = !!(config.awsAccessKeyId && config.awsSecretAccessKey)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, messages[messages.length - 1]?.content])

  useEffect(() => {
    if (pendingPrompt && !isLoading) {
      sendMessage(pendingPrompt)
      onPendingConsumed?.()
    }
  }, [pendingPrompt]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = async (userText: string) => {
    if (!userText.trim() || !hasCredentials || isLoading) return

    const cmdResult = findCommand(userText)
    if (cmdResult) {
      const { command, args } = cmdResult
      if (command.noSend && command.action) {
        onCommandAction?.(command.action)
        return
      }
      userText = command.buildPrompt(args)
      if (!userText.trim()) return
    }

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

    addMessage(userMsg)
    addMessage(assistantMsg)
    setIsLoading(true)
    const startTime = Date.now()

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
          const store = useSessionStore.getState()
          const current = store.currentSession()
          const existing = current?.messages.find((m) => m.id === assistantId)
          updateMessage(assistantId, {
            content: (existing?.content ?? '') + chunk,
          })
        },
      })

      updateMessage(assistantId, { streaming: false })

      // 사용량 및 감사 로그 기록
      const store = useSessionStore.getState()
      const finalMsg = store.currentSession()?.messages.find((m) => m.id === assistantId)
      const inputTokens = estimateTokens(userText)
      const outputTokens = estimateTokens(finalMsg?.content ?? '')
      const duration = Date.now() - startTime

      recordUsage(config.model, inputTokens, outputTokens)
      addAuditLog({
        action: 'chat',
        model: config.model,
        inputTokens,
        outputTokens,
        sessionId: conversationId,
        promptPreview: userText.slice(0, 100),
        duration,
        success: true,
      })

      persist()
    } catch (err) {
      setError(String(err))
      removeMessage(assistantId)
      addAuditLog({
        action: 'chat',
        model: config.model,
        inputTokens: estimateTokens(userText),
        outputTokens: 0,
        sessionId: conversationId,
        promptPreview: userText.slice(0, 100),
        duration: Date.now() - startTime,
        success: false,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestion = async (s: { text: string; action: string }) => {
    if (s.action === 'summarize') {
      try {
        const pageData = await chrome.runtime.sendMessage({ type: 'get-page-text' }) as {
          text: string; title: string; url: string
        } | undefined
        if (pageData?.text) {
          await sendMessage(
            `[페이지: ${pageData.title}]\n[URL: ${pageData.url}]\n\n다음 웹페이지 내용을 한국어로 요약해줘:\n\n${pageData.text}`
          )
          return
        }
      } catch { /* fallback */ }
    }
    await sendMessage(s.text)
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    await sendMessage(text)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCommandSelect = (cmd: Command) => {
    if (cmd.noSend && cmd.action) {
      onCommandAction?.(cmd.action)
      setInput('')
    } else {
      setInput(cmd.name + ' ')
      inputRef.current?.focus()
    }
  }

  const showPalette = input.startsWith('/') && input.length > 0 && !isLoading

  return (
    <div className="chat-view">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-logo">H</div>
            <div className="chat-empty-title">무엇이든 물어보세요</div>
            <div className="chat-empty-sub">
              {'AI와 대화하고, 페이지를 분석하고,\n코드 리뷰를 받아보세요\n\n/ 를 입력하면 명령어를 사용할 수 있어요'}
            </div>
            <div className="chat-suggestions">
              {suggestions.map((s) => (
                <button key={s.text} className="suggestion-chip" onClick={() => handleSuggestion(s)}>
                  <span className="suggestion-icon">{s.icon}</span>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
            {messages.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
                <button className="btn-ghost btn-xs" onClick={() => { clearMessages(); persist() }}>
                  대화 초기화
                </button>
              </div>
            )}
          </>
        )}
        {error && <div className="chat-error">{error}</div>}
        <div ref={endRef} />
      </div>

      <div className="chat-input-area">
        <ContextStack onInsert={(text) => setInput((prev) => prev + text)} />
        {showPalette && (
          <CommandPalette input={input} visible={showPalette} onSelect={handleCommandSelect} />
        )}
        <div className="chat-input-row">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지 입력... (/ 로 명령어)"
            rows={1}
            style={{ height: 'auto' }}
            onInput={(e) => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 120) + 'px'
            }}
          />
          <button className="send-btn" onClick={handleSend} disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <span className="spinner" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
        <div className="model-indicator">
          <span>✨</span>
          <span>{getModelDisplayName(config.model)} · Bedrock</span>
        </div>
      </div>
    </div>
  )
}
