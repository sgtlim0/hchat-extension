// widgets/audit-panel/AuditPanel.tsx — 감사 로그 패널

import { useState, useEffect } from 'react'
import { useAuditStore } from '@/entities/audit/audit.store'
import type { AuditAction } from '@/entities/audit/audit.store'

interface Props {
  onClose: () => void
}

const ACTION_LABELS: Record<AuditAction, string> = {
  chat: '채팅',
  summarize: '요약',
  translate: '번역',
  swarm: '스웜',
  schedule: '스케줄',
  screenshot: '스크린샷',
  chain: '체인',
  voice: '음성',
  review: '리뷰',
  export: '내보내기',
}

const ALL_ACTIONS: AuditAction[] = [
  'chat', 'summarize', 'translate', 'swarm', 'schedule',
  'screenshot', 'chain', 'voice', 'review', 'export',
]

export function AuditPanel({ onClose }: Props) {
  const hydrate = useAuditStore((s) => s.hydrate)
  const filteredLogs = useAuditStore((s) => s.filteredLogs)
  const deleteLogs = useAuditStore((s) => s.deleteLogs)
  const clearAll = useAuditStore((s) => s.clearAll)
  const exportCsv = useAuditStore((s) => s.exportCsv)
  const logs = useAuditStore((s) => s.logs)

  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const filtered = filteredLogs({
    action: actionFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((l) => l.id)))
    }
  }

  const handleDeleteSelected = () => {
    deleteLogs([...selectedIds])
    setSelectedIds(new Set())
  }

  const handleExportCsv = () => {
    const csv = exportCsv()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClearAll = () => {
    if (confirmClear) {
      clearAll()
      setConfirmClear(false)
      setSelectedIds(new Set())
    } else {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
    }
  }

  return (
    <div className="audit-panel">
      <div className="audit-header">
        <button className="header-btn" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="audit-title">감사 로그</span>
        <div style={{ flex: 1 }} />
        <span className="audit-count">{logs.length}건</span>
      </div>

      {/* 필터 */}
      <div className="audit-filters">
        <select
          className="field-select audit-filter-select"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as AuditAction | '')}
        >
          <option value="">전체 액션</option>
          {ALL_ACTIONS.map((a) => (
            <option key={a} value={a}>{ACTION_LABELS[a]}</option>
          ))}
        </select>
        <input
          className="field-input audit-filter-date"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="시작일"
        />
        <input
          className="field-input audit-filter-date"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="종료일"
        />
      </div>

      {/* 액션 바 */}
      <div className="audit-actions">
        <button className="btn-ghost btn-xs" onClick={toggleSelectAll}>
          {selectedIds.size === filtered.length && filtered.length > 0 ? '전체 해제' : '전체 선택'}
        </button>
        {selectedIds.size > 0 && (
          <button className="btn-ghost btn-xs" style={{ color: 'var(--danger)' }} onClick={handleDeleteSelected}>
            선택 삭제 ({selectedIds.size})
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn-ghost btn-xs" onClick={handleExportCsv}>CSV 내보내기</button>
        <button
          className="btn-ghost btn-xs"
          style={{ color: confirmClear ? 'var(--danger)' : undefined }}
          onClick={handleClearAll}
        >
          {confirmClear ? '정말 삭제?' : '전체 삭제'}
        </button>
      </div>

      {/* 로그 목록 */}
      <div className="audit-list">
        {filtered.length === 0 ? (
          <div className="audit-empty">감사 로그가 없습니다</div>
        ) : (
          filtered.slice(0, 100).map((log) => (
            <div
              key={log.id}
              className={`audit-item ${selectedIds.has(log.id) ? 'audit-item-selected' : ''}`}
              onClick={() => toggleSelect(log.id)}
            >
              <div className="audit-item-top">
                <span className={`audit-action-badge audit-action-${log.action}`}>
                  {ACTION_LABELS[log.action]}
                </span>
                <span className="audit-item-model">{log.model.split('.').pop()?.split(':')[0]}</span>
                <span className={`audit-item-status ${log.success ? 'audit-status-ok' : 'audit-status-fail'}`}>
                  {log.success ? 'OK' : 'FAIL'}
                </span>
              </div>
              <div className="audit-item-preview">{log.promptPreview}</div>
              <div className="audit-item-meta">
                <span>In: {log.inputTokens.toLocaleString()} / Out: {log.outputTokens.toLocaleString()}</span>
                <span>{log.duration}ms</span>
                <span>{new Date(log.timestamp).toLocaleString('ko-KR')}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
