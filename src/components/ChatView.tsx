// components/ChatView.tsx
import { useState, useRef, useEffect } from 'react'
import { useChat, type ChatMessage } from '../hooks/useChat'
import type { Config } from '../hooks/useConfig'

interface ChatViewProps {
  conversationId: string
  config: Config
  pendingPrompt?: string
  onPendingConsumed?: () => void
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`msg ${isUser ? 'msg-user' : 'msg-ai'}`}>
      {!isUser && (
        <div className="msg-avatar">H</div>
      )}
      <div className="msg-body">
        <div className="msg-content">
          {msg.content}
          {msg.streaming && <span className="cursor-blink">▌</span>}
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
  if (modelId.includes('claude-sonnet')) return 'Claude Sonnet'
  return modelId.split('.').pop()?.split(':')[0] ?? modelId
}

export function ChatView({ conversationId, config, pendingPrompt, onPendingConsumed }: ChatViewProps) {
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat(conversationId, config)
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // FAB/Popup에서 받은 pending prompt 자동 전송
  useEffect(() => {
    if (pendingPrompt && !isLoading) {
      sendMessage(pendingPrompt)
      onPendingConsumed?.()
    }
  }, [pendingPrompt]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSuggestion = async (s: { text: string; action: string }) => {
    if (s.action === 'summarize') {
      // background에 페이지 텍스트 요청
      try {
        const pageData = await chrome.runtime.sendMessage({ type: 'get-page-text' }) as {
          text: string; title: string; url: string
        } | undefined

        if (pageData?.text) {
          const prompt = `[페이지: ${pageData.title}]\n[URL: ${pageData.url}]\n\n다음 웹페이지 내용을 한국어로 요약해줘:\n\n${pageData.text}`
          await sendMessage(prompt)
          return
        }
      } catch {
        // 페이지 텍스트 가져오기 실패 시 기본 텍스트로 전송
      }
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

  return (
    <div className="chat-view">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-logo">H</div>
            <div className="chat-empty-title">무엇이든 물어보세요</div>
            <div className="chat-empty-sub">
              {'AI와 대화하고, 페이지를 분석하고,\n코드 리뷰를 받아보세요'}
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
                <button className="btn-ghost btn-xs" onClick={clearMessages}>대화 초기화</button>
              </div>
            )}
          </>
        )}
        {error && <div className="chat-error">{error}</div>}
        <div ref={endRef} />
      </div>

      <div className="chat-input-area">
        <div className="chat-input-row">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지 입력..."
            rows={1}
            style={{ height: 'auto' }}
            onInput={(e) => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 120) + 'px'
            }}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
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
