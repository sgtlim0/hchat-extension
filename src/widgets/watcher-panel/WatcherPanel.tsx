// widgets/watcher-panel/WatcherPanel.tsx — 실시간 웹페이지 감시

import { useState, useEffect, useCallback } from 'react'
import { Watcher } from '@/lib/watcher'
import type { WatchTarget } from '@/lib/watcher'
import { useConfigStore } from '@/entities/config/config.store'
import { chat } from '@/lib/claude'

interface Props {
  onClose: () => void
}

export function WatcherPanel({ onClose }: Props) {
  const [targets, setTargets] = useState<WatchTarget[]>([])
  const [url, setUrl] = useState('')
  const [selector, setSelector] = useState('')
  const [interval, setInterval_] = useState(5)
  const [label, setLabel] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  const load = useCallback(async () => {
    const items = await Watcher.list()
    setTargets(items)
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return
    await Watcher.add({
      url: trimmedUrl,
      selector: selector.trim() || undefined,
      interval: interval,
      enabled: true,
      label: label.trim() || trimmedUrl.slice(0, 40),
    })
    setUrl('')
    setSelector('')
    setInterval_(5)
    setLabel('')
    setShowAdd(false)
    await load()
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    await Watcher.update(id, { enabled: !enabled })
    await load()
  }

  const handleDelete = async (id: string) => {
    await Watcher.remove(id)
    await load()
  }

  const handleCheckNow = async (target: WatchTarget) => {
    try {
      const res = await fetch(target.url)
      const html = await res.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')

      let content: string
      if (target.selector) {
        const el = doc.querySelector(target.selector)
        content = el?.textContent?.trim() ?? ''
      } else {
        const el = doc.querySelector('article') ?? doc.querySelector('main') ?? doc.body
        content = el?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 5000) ?? ''
      }

      const changed = target.lastContent !== '' && content !== target.lastContent
      let diff: string | undefined
      if (changed) {
        const oldSnip = target.lastContent.slice(0, 200)
        const newSnip = content.slice(0, 200)
        diff = `Before: ${oldSnip}...\nAfter: ${newSnip}...`
      }

      await Watcher.markChecked(target.id, content, changed, diff)
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fetch failed'
      await Watcher.update(target.id, { lastChecked: Date.now(), diff: `Error: ${msg}` })
      await load()
    }
  }

  const handleAnalyze = async (target: WatchTarget) => {
    if (!config.awsAccessKeyId || !target.diff) return
    setAnalyzing(target.id)
    setAnalysisResult(null)
    try {
      const result = await chat(
        [{ role: 'user', content: `Analyze the following webpage change and summarize what changed and its significance:\n\nURL: ${target.url}\n\n${target.diff}` }],
        { ...config, maxTokens: 512, systemPrompt: 'You are a concise web change analyst. Respond in Korean.' }
      )
      setAnalysisResult(result)
    } catch (err) {
      setAnalysisResult(`Error: ${err instanceof Error ? err.message : 'Analysis failed'}`)
    } finally {
      setAnalyzing(null)
    }
  }

  const formatTime = (ts: number) => {
    if (!ts) return '-'
    const d = new Date(ts)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="watcher-panel">
      {/* Header */}
      <div className="watcher-header">
        <button className="watcher-back" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="watcher-title">Page Watcher</span>
        <div style={{ flex: 1 }} />
        <button className="watcher-add-btn" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="watcher-form">
          <input
            className="watcher-input"
            placeholder="Label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            className="watcher-input"
            placeholder="URL (https://...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <input
            className="watcher-input"
            placeholder="CSS Selector (optional)"
            value={selector}
            onChange={(e) => setSelector(e.target.value)}
          />
          <div className="watcher-interval-row">
            <label className="watcher-label">Check every</label>
            <input
              className="watcher-input watcher-input-sm"
              type="number"
              min={1}
              max={1440}
              value={interval}
              onChange={(e) => setInterval_(Number(e.target.value) || 5)}
            />
            <span className="watcher-label">min</span>
          </div>
          <button className="watcher-submit" onClick={handleAdd} disabled={!url.trim()}>
            Add Target
          </button>
        </div>
      )}

      {/* List */}
      <div className="watcher-list">
        {targets.length === 0 && (
          <div className="watcher-empty">No watch targets yet. Click "+ Add" to start.</div>
        )}
        {targets.map((t) => (
          <div key={t.id} className={`watcher-item ${t.changed ? 'watcher-item-changed' : ''}`}>
            <div className="watcher-item-header">
              <span className={`watcher-dot ${t.enabled ? 'watcher-dot-active' : ''}`} />
              <span className="watcher-item-label">{t.label}</span>
              <div style={{ flex: 1 }} />
              <button className="watcher-icon-btn" onClick={() => handleToggle(t.id, t.enabled)} title={t.enabled ? 'Disable' : 'Enable'}>
                {t.enabled ? 'ON' : 'OFF'}
              </button>
              <button className="watcher-icon-btn watcher-icon-btn-danger" onClick={() => handleDelete(t.id)} title="Delete">
                &#10005;
              </button>
            </div>
            <div className="watcher-item-url">{t.url}</div>
            {t.selector && <div className="watcher-item-selector">Selector: {t.selector}</div>}
            <div className="watcher-item-meta">
              <span>Interval: {t.interval}m</span>
              <span>Last: {formatTime(t.lastChecked)}</span>
              {t.changed && <span className="watcher-badge-changed">Changed</span>}
            </div>
            <div className="watcher-item-actions">
              <button className="watcher-action-btn" onClick={() => handleCheckNow(t)}>
                Check Now
              </button>
              {t.changed && t.diff && (
                <button
                  className="watcher-action-btn watcher-action-btn-ai"
                  onClick={() => handleAnalyze(t)}
                  disabled={analyzing === t.id}
                >
                  {analyzing === t.id ? 'Analyzing...' : 'AI Analysis'}
                </button>
              )}
            </div>
            {t.diff && (
              <div className="watcher-diff">
                <pre>{t.diff}</pre>
              </div>
            )}
            {analysisResult && analyzing === null && (
              <div className="watcher-analysis">{analysisResult}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
