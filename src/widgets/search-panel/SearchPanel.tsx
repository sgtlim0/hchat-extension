// widgets/search-panel/SearchPanel.tsx — 메시지 검색

import { useState, useMemo } from 'react'
import { useSessionStore } from '@/entities/session/session.store'

interface SearchResult {
  sessionId: string
  sessionTitle: string
  messageId: string
  role: 'user' | 'assistant'
  content: string
  ts: number
  matchIndex: number
}

export function SearchPanel() {
  const sessions = useSessionStore((s) => s.sessions)
  const selectSession = useSessionStore((s) => s.selectSession)
  const setView = useSessionStore((s) => s.setView)
  const [query, setQuery] = useState('')

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []

    const found: SearchResult[] = []
    for (const session of sessions) {
      for (const msg of session.messages) {
        const idx = msg.content.toLowerCase().indexOf(q)
        if (idx !== -1) {
          found.push({
            sessionId: session.id,
            sessionTitle: session.title,
            messageId: msg.id,
            role: msg.role,
            content: msg.content,
            ts: msg.ts,
            matchIndex: idx,
          })
        }
      }
    }
    return found.sort((a, b) => b.ts - a.ts).slice(0, 50)
  }, [query, sessions])

  const highlight = (text: string, q: string) => {
    if (!q) return text
    const start = Math.max(0, text.toLowerCase().indexOf(q.toLowerCase()) - 40)
    const snippet = text.slice(start, start + 120)
    const prefix = start > 0 ? '...' : ''
    const suffix = start + 120 < text.length ? '...' : ''
    return prefix + snippet + suffix
  }

  const goToResult = (r: SearchResult) => {
    selectSession(r.sessionId)
    setView('chat')
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-icon panel-icon-blue">🔍</div>
        <span className="panel-title">메시지 검색</span>
        <button className="btn-ghost btn-xs" onClick={() => setView('chat')}>닫기</button>
      </div>

      <input
        className="field-input"
        placeholder="검색어 입력 (최소 2자)..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        style={{ marginBottom: 8 }}
      />

      {query.length >= 2 && (
        <div className="search-meta">
          {results.length}건 검색됨 ({sessions.length}개 대화)
        </div>
      )}

      <div className="search-results">
        {results.map((r) => (
          <button
            key={`${r.sessionId}-${r.messageId}`}
            className="search-result-item"
            onClick={() => goToResult(r)}
          >
            <div className="search-result-header">
              <span className="search-result-session">{r.sessionTitle}</span>
              <span className="search-result-role">{r.role === 'user' ? '나' : 'AI'}</span>
              <span className="search-result-time">
                {new Date(r.ts).toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="search-result-content">
              {highlight(r.content, query)}
            </div>
          </button>
        ))}

        {query.length >= 2 && results.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p>검색 결과가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  )
}
