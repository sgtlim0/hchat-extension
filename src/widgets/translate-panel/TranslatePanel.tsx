// widgets/translate-panel/TranslatePanel.tsx — 인라인 번역 오버레이

import { useState, useCallback } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import { chat } from '@/lib/claude'

interface TranslateHistoryItem {
  id: string
  source: string
  result: string
  direction: string
  ts: number
}

interface Props {
  onClose: () => void
}

function detectLanguage(text: string): 'ko' | 'en' {
  const koreanChars = (text.match(/[\uAC00-\uD7A3]/g) || []).length
  return koreanChars > text.length * 0.2 ? 'ko' : 'en'
}

export function TranslatePanel({ onClose }: Props) {
  const [input, setInput] = useState('')
  const [result, setResult] = useState('')
  const [translating, setTranslating] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<TranslateHistoryItem[]>([])
  const [copied, setCopied] = useState(false)

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  const handleTranslate = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || !config.awsAccessKeyId) return

    setTranslating(true)
    setError('')
    setResult('')

    const lang = detectLanguage(trimmed)
    const direction = lang === 'ko' ? 'KO > EN' : 'EN > KO'
    const targetLang = lang === 'ko' ? 'English' : 'Korean'

    try {
      const translated = await chat(
        [{
          role: 'user',
          content: `Translate the following text to ${targetLang}. Only output the translation, no explanations.\n\n${trimmed}`,
        }],
        {
          awsAccessKeyId: config.awsAccessKeyId,
          awsSecretAccessKey: config.awsSecretAccessKey,
          awsRegion: config.awsRegion,
          model: config.model,
          maxTokens: 2048,
          onChunk: (chunk) => setResult((prev) => prev + chunk),
        }
      )

      setResult(translated)

      const item: TranslateHistoryItem = {
        id: `tr_${Date.now()}`,
        source: trimmed.slice(0, 100),
        result: translated.slice(0, 200),
        direction,
        ts: Date.now(),
      }
      setHistory((prev) => [item, ...prev].slice(0, 10))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed')
    } finally {
      setTranslating(false)
    }
  }, [input, config])

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // fallback
    }
  }, [])

  const handleHistoryClick = (item: TranslateHistoryItem) => {
    setInput(item.source)
    setResult(item.result)
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </div>
        <span className="panel-title">Translate</span>
        <span className="badge">KO/EN</span>
      </div>

      {/* Input */}
      <div className="translate-input-section">
        <textarea
          className="field-textarea"
          placeholder="Enter text to translate (auto-detects KO/EN)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleTranslate()
          }}
        />
        <button
          className="btn-primary btn-full"
          onClick={handleTranslate}
          disabled={translating || !input.trim() || !config.awsAccessKeyId}
        >
          {translating ? 'Translating...' : 'Translate'}
        </button>
      </div>

      {/* Error */}
      {error && <div className="error-box">{error}</div>}

      {/* Result */}
      {result && (
        <div className="translate-result-box">
          <div className="translate-result-header">
            <span className="translate-result-label">
              {detectLanguage(input) === 'ko' ? 'English' : 'Korean'}
            </span>
            <button className="btn-ghost btn-xs" onClick={() => handleCopy(result)}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="translate-result-content">{result}</div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="translate-history">
          <div className="translate-history-title">Recent ({history.length})</div>
          {history.map((item) => (
            <button
              key={item.id}
              className="translate-history-item"
              onClick={() => handleHistoryClick(item)}
            >
              <span className="translate-history-dir">{item.direction}</span>
              <span className="translate-history-text">{item.source}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
