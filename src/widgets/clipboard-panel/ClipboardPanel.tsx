// widgets/clipboard-panel/ClipboardPanel.tsx — 스마트 클립보드

import { useState, useEffect, useCallback } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import { ClipboardHistory } from '@/lib/clipboard'
import { chat } from '@/lib/claude'
import type { ClipboardItem } from '@/lib/clipboard'

interface Props {
  onClose: () => void
}

type ProcessType = 'summary' | 'translate' | 'cleanup'

const PROCESS_LABELS: Record<ProcessType, string> = {
  summary: 'Summarize',
  translate: 'Translate',
  cleanup: 'Cleanup',
}

const PROCESS_PROMPTS: Record<ProcessType, string> = {
  summary: 'Summarize the following text concisely in the same language:\n\n',
  translate: 'Translate the following text. If Korean, translate to English. If English, translate to Korean. Output only the translation:\n\n',
  cleanup: 'Clean up and improve the following text. Fix grammar, spelling, and improve clarity. Keep the same language. Output only the improved text:\n\n',
}

export function ClipboardPanel({ onClose }: Props) {
  const [items, setItems] = useState<ClipboardItem[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [addText, setAddText] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  const load = useCallback(async () => {
    const list = await ClipboardHistory.list()
    setItems(list)
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    const trimmed = addText.trim()
    if (!trimmed) return
    const updated = await ClipboardHistory.add(trimmed)
    setItems(updated)
    setAddText('')
  }

  const handleDelete = async (id: string) => {
    const updated = await ClipboardHistory.remove(id)
    setItems(updated)
  }

  const handleProcess = async (item: ClipboardItem, type: ProcessType) => {
    if (!config.awsAccessKeyId || processingId) return
    setProcessingId(item.id)

    try {
      const result = await chat(
        [{ role: 'user', content: PROCESS_PROMPTS[type] + item.text }],
        {
          awsAccessKeyId: config.awsAccessKeyId,
          awsSecretAccessKey: config.awsSecretAccessKey,
          awsRegion: config.awsRegion,
          model: config.model,
          maxTokens: 1024,
        }
      )
      const updated = await ClipboardHistory.updateProcessed(item.id, { type, result })
      setItems(updated)
    } catch {
      // fail silently
    } finally {
      setProcessingId(null)
    }
  }

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      // fallback
    }
  }

  const handleClear = async () => {
    await ClipboardHistory.clear()
    setItems([])
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
        </div>
        <span className="panel-title">Clipboard</span>
        <div className="panel-actions">
          <button className="btn-ghost btn-xs btn-danger" onClick={handleClear} disabled={items.length === 0}>
            Clear
          </button>
        </div>
      </div>

      {/* Add text */}
      <div className="clipboard-add">
        <div className="clipboard-add-row">
          <input
            className="field-input"
            placeholder="Paste or type text..."
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          />
          <button className="btn-primary btn-xs" onClick={handleAdd} disabled={!addText.trim()}>
            Add
          </button>
        </div>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#128203;</div>
          <p>No clipboard items</p>
          <p className="empty-sub">Add text above to get started</p>
        </div>
      ) : (
        <div className="clipboard-list">
          {items.map((item) => (
            <div key={item.id} className="clipboard-item">
              <div className="clipboard-item-text">{item.text.slice(0, 200)}{item.text.length > 200 ? '...' : ''}</div>
              <div className="clipboard-item-meta">
                <span className="clipboard-item-time">{formatTime(item.createdAt)}</span>
                <button
                  className="btn-ghost btn-xs"
                  onClick={() => handleCopy(item.text, item.id)}
                >
                  {copied === item.id ? 'Copied!' : 'Copy'}
                </button>
                <button className="btn-ghost btn-xs btn-danger" onClick={() => handleDelete(item.id)}>
                  Del
                </button>
              </div>

              {/* AI Process buttons */}
              <div className="clipboard-process-row">
                {(Object.keys(PROCESS_LABELS) as ProcessType[]).map((type) => (
                  <button
                    key={type}
                    className="btn-ghost btn-xs"
                    onClick={() => handleProcess(item, type)}
                    disabled={processingId === item.id || !config.awsAccessKeyId}
                  >
                    {processingId === item.id ? '...' : PROCESS_LABELS[type]}
                  </button>
                ))}
              </div>

              {/* Processed result */}
              {item.processed && (
                <div className="clipboard-result">
                  <div className="clipboard-result-label">{PROCESS_LABELS[item.processed.type]}</div>
                  <div className="clipboard-result-text">{item.processed.result}</div>
                  <button
                    className="btn-ghost btn-xs"
                    onClick={() => handleCopy(item.processed!.result, `${item.id}-result`)}
                  >
                    {copied === `${item.id}-result` ? 'Copied!' : 'Copy Result'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
