// widgets/code-review-panel/CodeReviewPanel.tsx — GitHub 코드 리뷰

import { useState, useCallback } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import { chat } from '@/lib/claude'

interface Props {
  onClose: () => void
}

type Aspect = 'bugs' | 'performance' | 'security' | 'readability'
type Severity = 'critical' | 'warning' | 'info'

interface ReviewItem {
  severity: Severity
  aspect: string
  message: string
  line?: string
}

const ASPECT_LABELS: Record<Aspect, string> = {
  bugs: 'Bugs',
  performance: 'Performance',
  security: 'Security',
  readability: 'Readability',
}

const SEVERITY_STYLES: Record<Severity, { color: string; bg: string; label: string }> = {
  critical: { color: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.08)', label: 'CRITICAL' },
  warning: { color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.08)', label: 'WARNING' },
  info: { color: 'var(--primary)', bg: 'var(--primary-dim)', label: 'INFO' },
}

export function CodeReviewPanel({ onClose }: Props) {
  const [code, setCode] = useState('')
  const [aspects, setAspects] = useState<Set<Aspect>>(new Set(['bugs', 'security']))
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [rawResult, setRawResult] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState('')

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  const toggleAspect = (aspect: Aspect) => {
    setAspects((prev) => {
      const next = new Set(prev)
      if (next.has(aspect)) {
        next.delete(aspect)
      } else {
        next.add(aspect)
      }
      return next
    })
  }

  const parseReviewItems = (text: string): ReviewItem[] => {
    const items: ReviewItem[] = []
    const lines = text.split('\n')
    let currentSeverity: Severity = 'info'
    let currentAspect = ''
    let currentMessage = ''

    for (const line of lines) {
      const severityMatch = line.match(/\[(CRITICAL|WARNING|INFO)]/i)
      if (severityMatch) {
        if (currentMessage.trim()) {
          items.push({ severity: currentSeverity, aspect: currentAspect, message: currentMessage.trim() })
        }
        currentSeverity = severityMatch[1].toLowerCase() as Severity
        const aspectMatch = line.match(/\[(CRITICAL|WARNING|INFO)]\s*\[([^\]]+)]/i)
        currentAspect = aspectMatch ? aspectMatch[2] : ''
        currentMessage = line.replace(/\[(CRITICAL|WARNING|INFO)]\s*(\[[^\]]+])?\s*/i, '')
      } else if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
        if (currentMessage.trim()) {
          items.push({ severity: currentSeverity, aspect: currentAspect, message: currentMessage.trim() })
        }
        currentMessage = line.trim().replace(/^[-*]\s*/, '')
      } else if (line.trim()) {
        currentMessage += ' ' + line.trim()
      }
    }

    if (currentMessage.trim()) {
      items.push({ severity: currentSeverity, aspect: currentAspect, message: currentMessage.trim() })
    }

    return items.length > 0 ? items : [{ severity: 'info', aspect: 'general', message: text }]
  }

  const handleReview = useCallback(async () => {
    if (!code.trim() || aspects.size === 0 || !config.awsAccessKeyId) return
    setReviewing(true)
    setError('')
    setRawResult('')
    setReviewItems([])

    const selectedAspects = Array.from(aspects).map((a) => ASPECT_LABELS[a]).join(', ')

    try {
      const result = await chat(
        [{
          role: 'user',
          content: `Review the following code/diff focusing on: ${selectedAspects}.

For each issue found, format as:
[SEVERITY] [ASPECT] Description of the issue and suggestion.

Use severity levels: [CRITICAL] for bugs/vulnerabilities, [WARNING] for potential issues, [INFO] for improvements.

Code:
\`\`\`
${code.slice(0, 6000)}
\`\`\``,
        }],
        {
          awsAccessKeyId: config.awsAccessKeyId,
          awsSecretAccessKey: config.awsSecretAccessKey,
          awsRegion: config.awsRegion,
          model: config.model,
          maxTokens: 2048,
          onChunk: (chunk) => setRawResult((prev) => prev + chunk),
        }
      )

      setReviewItems(parseReviewItems(result))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed')
    } finally {
      setReviewing(false)
    }
  }, [code, aspects, config])

  return (
    <div className="panel">
      {/* Header */}
      <div className="panel-header">
        <button className="header-btn" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="panel-icon code-review-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
        </div>
        <span className="panel-title">Code Review</span>
      </div>

      {/* Code input */}
      <textarea
        className="field-textarea code-review-input"
        placeholder="Paste code or diff here..."
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={8}
        spellCheck={false}
        style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
      />

      {/* Aspects */}
      <div className="code-review-aspects">
        <div className="code-review-aspects-label">Review focus:</div>
        <div className="code-review-aspects-options">
          {(Object.keys(ASPECT_LABELS) as Aspect[]).map((a) => (
            <button
              key={a}
              className={`code-review-aspect-btn ${aspects.has(a) ? 'code-review-aspect-active' : ''}`}
              onClick={() => toggleAspect(a)}
            >
              {ASPECT_LABELS[a]}
            </button>
          ))}
        </div>
      </div>

      <button
        className="btn-primary btn-full"
        onClick={handleReview}
        disabled={reviewing || !code.trim() || aspects.size === 0 || !config.awsAccessKeyId}
      >
        {reviewing ? 'Reviewing...' : 'AI Review'}
      </button>

      {/* Error */}
      {error && <div className="error-box">{error}</div>}

      {/* Results */}
      {reviewItems.length > 0 && (
        <div className="code-review-results">
          <div className="code-review-results-header">
            Review Results ({reviewItems.length} items)
          </div>
          {reviewItems.map((item, i) => {
            const style = SEVERITY_STYLES[item.severity]
            return (
              <div key={i} className="code-review-item" style={{ borderLeftColor: style.color }}>
                <div className="code-review-item-header">
                  <span className="code-review-severity" style={{ color: style.color, background: style.bg }}>
                    {style.label}
                  </span>
                  {item.aspect && (
                    <span className="code-review-aspect-tag">{item.aspect}</span>
                  )}
                </div>
                <div className="code-review-item-message">{item.message}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Raw result fallback during streaming */}
      {reviewing && rawResult && (
        <div className="code-review-raw">
          <div className="code-review-raw-content">{rawResult}</div>
        </div>
      )}
    </div>
  )
}
