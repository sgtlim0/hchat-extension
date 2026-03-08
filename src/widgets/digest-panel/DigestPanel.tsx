// widgets/digest-panel/DigestPanel.tsx — AI Daily Digest (Briefing)

import { useState, useCallback } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import { chat } from '@/lib/claude'
import { Storage } from '@/lib/storage'
import { STORAGE_KEYS } from '@/shared/lib/storage-keys'

interface Props {
  onClose: () => void
}

interface DigestEntry {
  id: string
  content: string
  ts: number
  sources: Array<{ title: string; url: string }>
}

interface DigestSettings {
  tags: string[]
  autoEnabled: boolean
}

const DIGEST_DATA_KEY = STORAGE_KEYS.DIGEST_DATA
const DIGEST_SETTINGS_KEY = STORAGE_KEYS.DIGEST_SETTINGS

export function DigestPanel({ onClose }: Props) {
  const [digest, setDigest] = useState<DigestEntry | null>(null)
  const [history, setHistory] = useState<DigestEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [autoEnabled, setAutoEnabled] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  // Load settings on mount
  useState(() => {
    Storage.get<DigestSettings>(DIGEST_SETTINGS_KEY).then((s) => {
      if (s) {
        setTags(s.tags)
        setAutoEnabled(s.autoEnabled)
      }
    })
    Storage.get<DigestEntry[]>(DIGEST_DATA_KEY).then((data) => {
      if (data && data.length > 0) {
        setHistory(data)
      }
    })
  })

  const saveSettings = useCallback(async (newTags: string[], auto: boolean) => {
    await Storage.set<DigestSettings>(DIGEST_SETTINGS_KEY, { tags: newTags, autoEnabled: auto })
  }, [])

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      const newTags = [...tags, t]
      setTags(newTags)
      saveSettings(newTags, autoEnabled)
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    const newTags = tags.filter((t) => t !== tag)
    setTags(newTags)
    saveSettings(newTags, autoEnabled)
  }

  const toggleAuto = async () => {
    const newValue = !autoEnabled
    setAutoEnabled(newValue)
    await saveSettings(tags, newValue)

    if (newValue) {
      // Set alarm for daily 09:00
      chrome.runtime.sendMessage({ type: 'set-digest-alarm', enabled: true })
    } else {
      chrome.runtime.sendMessage({ type: 'set-digest-alarm', enabled: false })
    }
  }

  const handleGenerate = useCallback(async () => {
    if (!config.awsAccessKeyId) {
      setError('AWS credentials required')
      return
    }

    setLoading(true)
    setError('')
    setDigest(null)

    try {
      // Get recent history from chrome.history
      const historyItems = await chrome.history.search({
        text: '',
        maxResults: 15,
        startTime: Date.now() - 24 * 60 * 60 * 1000, // last 24h
      })

      const sources = historyItems
        .filter((h) => h.url && !h.url.startsWith('chrome://') && !h.url.startsWith('chrome-extension://'))
        .slice(0, 10)
        .map((h) => ({ title: h.title ?? '', url: h.url! }))

      if (sources.length === 0) {
        setError('No browsing history found in the last 24 hours.')
        setLoading(false)
        return
      }

      const sourceList = sources.map((s, i) => `${i + 1}. "${s.title}" - ${s.url}`).join('\n')
      const tagPrompt = tags.length > 0
        ? `\nUser's interest topics: ${tags.join(', ')}. Focus the briefing on these topics when relevant.`
        : ''

      const result = await chat(
        [{
          role: 'user',
          content: `Based on the following recently visited websites, create a concise daily briefing summary in Korean.
${tagPrompt}

Recently visited pages (last 24 hours):
${sourceList}

Create a well-structured briefing with:
1. Main themes/topics identified
2. Key highlights from the browsing activity
3. Suggested topics to follow up on

Keep it concise (under 500 words).`,
        }],
        { ...config, maxTokens: 1024, systemPrompt: 'You are a daily briefing assistant. Create concise, insightful summaries in Korean.' }
      )

      const entry: DigestEntry = {
        id: `d_${Date.now()}`,
        content: result,
        ts: Date.now(),
        sources,
      }

      setDigest(entry)

      // Save to history
      const updatedHistory = [entry, ...history].slice(0, 10)
      setHistory(updatedHistory)
      await Storage.set(DIGEST_DATA_KEY, updatedHistory)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Briefing generation failed')
    } finally {
      setLoading(false)
    }
  }, [config, tags, history])

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="digest-panel">
      {/* Header */}
      <div className="digest-header">
        <button className="digest-back" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="digest-title">Daily Digest</span>
        <div style={{ flex: 1 }} />
        <button
          className={`digest-toggle-btn ${showHistory ? 'digest-toggle-btn-active' : ''}`}
          onClick={() => setShowHistory(!showHistory)}
        >
          History
        </button>
      </div>

      {/* Tags */}
      <div className="digest-section">
        <div className="digest-section-title">Interest Tags</div>
        <div className="digest-tags">
          {tags.map((t) => (
            <span key={t} className="digest-tag">
              {t}
              <button className="digest-tag-remove" onClick={() => removeTag(t)}>&times;</button>
            </span>
          ))}
        </div>
        <div className="digest-tag-input-row">
          <input
            className="digest-input"
            placeholder="Add tag..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addTag() }}
          />
          <button className="digest-add-btn" onClick={addTag} disabled={!tagInput.trim()}>+</button>
        </div>
      </div>

      {/* Auto toggle */}
      <div className="digest-auto-row">
        <span className="digest-auto-label">Auto briefing (daily 09:00)</span>
        <button className={`digest-auto-toggle ${autoEnabled ? 'digest-auto-toggle-on' : ''}`} onClick={toggleAuto}>
          {autoEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Generate */}
      <button className="digest-generate-btn" onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating briefing...' : 'Generate Briefing'}
      </button>

      {error && <div className="digest-error">{error}</div>}

      {/* Current digest */}
      {digest && !showHistory && (
        <div className="digest-content">
          <div className="digest-content-time">{formatTime(digest.ts)}</div>
          <div className="digest-content-body">{digest.content}</div>
          <div className="digest-sources">
            <div className="digest-sources-title">Sources ({digest.sources.length})</div>
            {digest.sources.map((s, i) => (
              <div key={i} className="digest-source-item">
                <span className="digest-source-num">{i + 1}.</span>
                <span className="digest-source-title">{s.title || s.url}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {showHistory && (
        <div className="digest-history">
          {history.length === 0 && <div className="digest-empty">No briefing history yet.</div>}
          {history.map((h) => (
            <div key={h.id} className="digest-history-item" onClick={() => { setDigest(h); setShowHistory(false) }}>
              <span className="digest-history-time">{formatTime(h.ts)}</span>
              <span className="digest-history-preview">{h.content.slice(0, 80)}...</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
