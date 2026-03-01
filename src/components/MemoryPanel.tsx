// components/MemoryPanel.tsx
import { useState, useEffect } from 'react'
import { useMemory } from '../hooks/useMemory'

export function MemoryPanel({ conversationId }: { conversationId: string }) {
  const { entry, loading, update, clear } = useMemory(conversationId)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [storageSize, setStorageSize] = useState('0 KB')

  useEffect(() => {
    chrome.storage.local.getBytesInUse(null, (bytes) => {
      if (bytes < 1024) setStorageSize(`${bytes} B`)
      else if (bytes < 1024 * 1024) setStorageSize(`${(bytes / 1024).toFixed(1)} KB`)
      else setStorageSize(`${(bytes / (1024 * 1024)).toFixed(1)} MB`)
    })
  }, [entry])

  const startEdit = () => {
    setDraft(entry?.content ?? '# 대화 메모리\n\n')
    setEditing(true)
  }

  const save = async () => {
    await update(draft)
    setEditing(false)
  }

  const rel = (ts: number) => {
    const d = Math.floor((Date.now() - ts) / 1000)
    if (d < 60) return `${d}초 전`
    if (d < 3600) return `${Math.floor(d / 60)}분 전`
    return `${Math.floor(d / 3600)}시간 전`
  }

  if (loading) return <div className="panel-loading">로딩 중...</div>

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-icon panel-icon-purple">🧠</div>
        <span className="panel-title">대화 메모리</span>
        {entry && <span className="badge">CLAUDE.md</span>}
      </div>

      <div className="panel-desc">
        대화별 메모리를 저장하면 Claude가 다음 대화에서도 기억합니다.
      </div>

      {editing ? (
        <div className="memory-editor">
          <textarea
            className="field-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
            placeholder={'# 대화 메모리\n\n이 대화의 중요 정보를 기록하세요.\nClaude 시스템 프롬프트에 자동으로 주입됩니다.'}
          />
          <div className="editor-footer">
            <span className="field-hint">마크다운 지원 · 시스템 프롬프트 자동 주입</span>
            <div style={{ flex: 1 }} />
            <div className="row-gap">
              <button className="btn-ghost btn-sm" onClick={() => setEditing(false)}>취소</button>
              <button className="btn-primary btn-sm" onClick={save}>저장</button>
            </div>
          </div>
        </div>
      ) : entry ? (
        <>
          <div className="memory-card">
            <div className="memory-card-header">
              <span>📄</span>
              <span>CLAUDE.md</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{rel(entry.updatedAt)}</span>
            </div>
            <div className="memory-card-body">{entry.content}</div>
          </div>
          <div className="row-gap">
            <button className="btn-ghost btn-sm" onClick={startEdit}>✏️ 편집</button>
            <button className="btn-ghost btn-sm btn-danger" onClick={clear}>초기화</button>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <p>아직 메모리가 없습니다</p>
          <p className="empty-sub">저장하면 다음 대화에서도 Claude가 기억합니다</p>
          <button className="btn-primary btn-sm" onClick={startEdit} style={{ marginTop: 4 }}>
            메모리 만들기
          </button>
        </div>
      )}

      <div className="memory-stats">
        <span>💾</span>
        <span>저장 용량: {storageSize}</span>
      </div>
    </div>
  )
}
