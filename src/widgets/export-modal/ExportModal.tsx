// widgets/export-modal/ExportModal.tsx — 대화 내보내기

import { useState } from 'react'
import { useSessionStore } from '@/entities/session/session.store'
import type { Session } from '@/entities/session/session.types'

interface ExportModalProps {
  onClose: () => void
}

type ExportFormat = 'markdown' | 'json' | 'txt'

function formatMarkdown(session: Session): string {
  const lines = [`# ${session.title}`, `> 내보내기: ${new Date().toLocaleString('ko-KR')}`, '']
  for (const msg of session.messages) {
    const time = new Date(msg.ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    const role = msg.role === 'user' ? 'User' : 'Assistant'
    lines.push(`## ${role} (${time})`, '', msg.content, '')
  }
  return lines.join('\n')
}

function formatTxt(session: Session): string {
  const lines = [`${session.title}`, `내보내기: ${new Date().toLocaleString('ko-KR')}`, '', '---', '']
  for (const msg of session.messages) {
    const time = new Date(msg.ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    const role = msg.role === 'user' ? '[나]' : '[AI]'
    lines.push(`${role} ${time}`, msg.content, '')
  }
  return lines.join('\n')
}

function formatJson(session: Session): string {
  return JSON.stringify(
    {
      title: session.title,
      exportedAt: new Date().toISOString(),
      messages: session.messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: new Date(m.ts).toISOString(),
      })),
    },
    null,
    2
  )
}

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportModal({ onClose }: ExportModalProps) {
  const currentSession = useSessionStore((s) => s.currentSession)
  const [format, setFormat] = useState<ExportFormat>('markdown')
  const [copied, setCopied] = useState(false)

  const session = currentSession()
  if (!session) return null

  const getContent = (): string => {
    switch (format) {
      case 'markdown': return formatMarkdown(session)
      case 'json': return formatJson(session)
      case 'txt': return formatTxt(session)
    }
  }

  const getExtension = (): string => {
    switch (format) {
      case 'markdown': return 'md'
      case 'json': return 'json'
      case 'txt': return 'txt'
    }
  }

  const getMime = (): string => {
    switch (format) {
      case 'markdown': return 'text/markdown'
      case 'json': return 'application/json'
      case 'txt': return 'text/plain'
    }
  }

  const handleDownload = () => {
    const content = getContent()
    const safeName = session.title.replace(/[^a-zA-Z0-9가-힣\s-]/g, '').trim() || 'chat'
    download(content, `${safeName}.${getExtension()}`, getMime())
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getContent())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">대화 내보내기</span>
          <button className="btn-ghost btn-xs" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="export-info">
            <strong>{session.title}</strong>
            <span>{session.messages.length}개 메시지</span>
          </div>

          <div className="export-formats">
            {([
              ['markdown', 'Markdown (.md)'],
              ['json', 'JSON (.json)'],
              ['txt', 'Text (.txt)'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                className={`export-format-btn ${format === id ? 'export-format-active' : ''}`}
                onClick={() => setFormat(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="export-preview">
            <pre>{getContent().slice(0, 500)}{getContent().length > 500 ? '\n...' : ''}</pre>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost btn-sm" onClick={handleCopy}>
            {copied ? '✓ 복사됨' : '📋 클립보드'}
          </button>
          <button className="btn-primary btn-sm" onClick={handleDownload}>
            💾 다운로드
          </button>
        </div>
      </div>
    </div>
  )
}
