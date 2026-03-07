// widgets/highlight-panel/HighlightPanel.tsx — 웹페이지 하이라이트 패널

import { useState, useEffect, useCallback } from 'react'
import { Highlights, HIGHLIGHT_COLORS } from '@/lib/highlights'
import type { Highlight, HighlightColor } from '@/lib/highlights'

interface Props {
  onClose: () => void
}

export function HighlightPanel({ onClose }: Props) {
  const [items, setItems] = useState<Highlight[]>([])
  const [text, setText] = useState('')
  const [color, setColor] = useState<HighlightColor>('yellow')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [currentUrl, setCurrentUrl] = useState('')
  const [viewAll, setViewAll] = useState(false)

  const load = useCallback(async () => {
    if (viewAll) {
      const all = await Highlights.listAll()
      setItems(all)
    } else {
      chrome.runtime.sendMessage({ type: 'get-page-text' }, (resp) => {
        const url = resp?.url ?? ''
        setCurrentUrl(url)
        if (url) {
          Highlights.list(url).then(setItems)
        }
      })
    }
  }, [viewAll])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    const trimmed = text.trim()
    if (!trimmed || !currentUrl) return
    await Highlights.add(currentUrl, trimmed, color)
    setText('')
    await load()
  }

  const handleDelete = async (item: Highlight) => {
    await Highlights.remove(item.url, item.id)
    await load()
  }

  const handleSaveNote = async (item: Highlight) => {
    await Highlights.updateNote(item.url, item.id, editNote)
    setEditingId(null)
    setEditNote('')
    await load()
  }

  const handleExport = () => {
    const md = Highlights.exportMarkdown(items)
    if (!md) return
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'highlights.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="panel">
      {/* Header */}
      <div className="panel-header">
        <button className="header-btn" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="panel-icon panel-icon-blue">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <span className="panel-title">Highlights</span>
        <div className="panel-actions">
          <button className="btn-ghost btn-xs" onClick={() => setViewAll(!viewAll)}>
            {viewAll ? 'Current' : 'All'}
          </button>
          <button className="btn-ghost btn-xs" onClick={handleExport} disabled={items.length === 0}>
            Export
          </button>
        </div>
      </div>

      {/* Add form */}
      {!viewAll && currentUrl && (
        <div className="highlight-add-form">
          <textarea
            className="field-textarea field-textarea-sm"
            placeholder="Highlight text..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
          />
          <div className="highlight-add-row">
            <div className="highlight-colors">
              {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map((c) => (
                <button
                  key={c}
                  className={`highlight-color-btn ${color === c ? 'highlight-color-active' : ''}`}
                  style={{ background: HIGHLIGHT_COLORS[c] }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
            <button className="btn-primary btn-xs" onClick={handleAdd} disabled={!text.trim()}>
              Add
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#9998;</div>
          <p>No highlights yet</p>
          <p className="empty-sub">Add text to highlight from the current page</p>
        </div>
      ) : (
        <div className="highlight-list">
          {items.map((item) => (
            <div key={item.id} className="highlight-item" style={{ borderLeftColor: HIGHLIGHT_COLORS[item.color] }}>
              <div className="highlight-text">{item.text}</div>
              {editingId === item.id ? (
                <div className="highlight-note-edit">
                  <input
                    className="field-input"
                    placeholder="Add a note..."
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNote(item) }}
                    autoFocus
                  />
                  <div className="highlight-note-actions">
                    <button className="btn-ghost btn-xs" onClick={() => handleSaveNote(item)}>Save</button>
                    <button className="btn-ghost btn-xs" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  {item.note && <div className="highlight-note">{item.note}</div>}
                  <div className="highlight-meta">
                    <span className="highlight-date">{formatDate(item.createdAt)}</span>
                    {viewAll && <span className="highlight-url">{new URL(item.url).hostname}</span>}
                    <div className="highlight-actions">
                      <button
                        className="btn-ghost btn-xs"
                        onClick={() => { setEditingId(item.id); setEditNote(item.note) }}
                      >
                        Note
                      </button>
                      <button className="btn-ghost btn-xs btn-danger" onClick={() => handleDelete(item)}>
                        Del
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
