// widgets/session-list/SessionList.tsx — 세션 목록 사이드바

import { useState } from 'react'
import { useSessionStore } from '@/entities/session/session.store'

export function SessionList() {
  const sessions = useSessionStore((s) => s.sessions)
  const currentSessionId = useSessionStore((s) => s.currentSessionId)
  const selectSession = useSessionStore((s) => s.selectSession)
  const createSession = useSessionStore((s) => s.createSession)
  const deleteSession = useSessionStore((s) => s.deleteSession)
  const renameSession = useSessionStore((s) => s.renameSession)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const startRename = (id: string, title: string) => {
    setEditingId(id)
    setEditTitle(title)
  }

  const commitRename = () => {
    if (editingId && editTitle.trim()) {
      renameSession(editingId, editTitle.trim())
    }
    setEditingId(null)
  }

  const fmtDate = (ts: number) => {
    const d = new Date(ts)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="session-list">
      <div className="session-list-header">
        <span className="session-list-title">대화 목록</span>
        <button className="btn-add" onClick={() => createSession()}>+ 새 대화</button>
      </div>

      <div className="session-list-items">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`session-item ${session.id === currentSessionId ? 'session-item-active' : ''}`}
            onClick={() => selectSession(session.id)}
          >
            {editingId === session.id ? (
              <input
                className="session-rename-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename()
                  if (e.key === 'Escape') setEditingId(null)
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <div className="session-item-content">
                  <div className="session-item-title">{session.title}</div>
                  <div className="session-item-meta">
                    {session.messages.length}개 메시지 · {fmtDate(session.updatedAt)}
                  </div>
                </div>
                <div className="session-item-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn-ghost btn-xs"
                    onClick={() => startRename(session.id, session.title)}
                    title="이름 변경"
                  >
                    ✏️
                  </button>
                  {sessions.length > 1 && (
                    <button
                      className="btn-ghost btn-xs btn-danger"
                      onClick={() => deleteSession(session.id)}
                      title="삭제"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
