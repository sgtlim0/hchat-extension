// widgets/email-panel/EmailPanel.tsx — Gmail 작성 도우미

import { useState, useCallback } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import { chat } from '@/lib/claude'

interface Props {
  onClose: () => void
}

type Tone = 'formal' | 'friendly' | 'concise'

const TONE_LABELS: Record<Tone, string> = {
  formal: 'Formal',
  friendly: 'Friendly',
  concise: 'Concise',
}

const TONE_DESCRIPTIONS: Record<Tone, string> = {
  formal: 'Professional and polished',
  friendly: 'Warm and approachable',
  concise: 'Brief and to the point',
}

export function EmailPanel({ onClose }: Props) {
  const [recipient, setRecipient] = useState('')
  const [subject, setSubject] = useState('')
  const [tone, setTone] = useState<Tone>('formal')
  const [context, setContext] = useState('')
  const [result, setResult] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  const handleGenerate = useCallback(async () => {
    if (!subject.trim() || !config.awsAccessKeyId) return
    setGenerating(true)
    setError('')
    setResult('')

    const prompt = `Write an email with the following details:
- Recipient: ${recipient.trim() || 'N/A'}
- Subject: ${subject.trim()}
- Tone: ${TONE_DESCRIPTIONS[tone]}
${context.trim() ? `- Additional context: ${context.trim()}` : ''}

Write only the email body (no subject line). Make it natural and well-structured.`

    try {
      await chat(
        [{ role: 'user', content: prompt }],
        {
          awsAccessKeyId: config.awsAccessKeyId,
          awsSecretAccessKey: config.awsSecretAccessKey,
          awsRegion: config.awsRegion,
          model: config.model,
          maxTokens: 1024,
          onChunk: (chunk) => setResult((prev) => prev + chunk),
        }
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }, [recipient, subject, tone, context, config])

  const handleToneChange = useCallback(async (newTone: Tone) => {
    if (!result.trim() || !config.awsAccessKeyId || generating) return
    setTone(newTone)
    setGenerating(true)
    setError('')
    const prevResult = result
    setResult('')

    try {
      await chat(
        [{
          role: 'user',
          content: `Rewrite the following email in a ${TONE_DESCRIPTIONS[newTone]} tone. Output only the rewritten email:\n\n${prevResult}`,
        }],
        {
          awsAccessKeyId: config.awsAccessKeyId,
          awsSecretAccessKey: config.awsSecretAccessKey,
          awsRegion: config.awsRegion,
          model: config.model,
          maxTokens: 1024,
          onChunk: (chunk) => setResult((prev) => prev + chunk),
        }
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tone change failed')
      setResult(prevResult)
    } finally {
      setGenerating(false)
    }
  }, [result, config, generating])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // fallback
    }
  }, [result])

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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <span className="panel-title">Email Writer</span>
      </div>

      {/* Form */}
      <div className="email-form">
        <input
          className="field-input"
          placeholder="Recipient name (optional)"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
        <input
          className="field-input"
          placeholder="Subject / Purpose *"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        {/* Tone selector */}
        <div className="email-tone-section">
          <div className="email-tone-label">Tone</div>
          <div className="email-tone-options">
            {(Object.keys(TONE_LABELS) as Tone[]).map((t) => (
              <button
                key={t}
                className={`email-tone-btn ${tone === t ? 'email-tone-active' : ''}`}
                onClick={() => setTone(t)}
              >
                {TONE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <textarea
          className="field-textarea field-textarea-sm"
          placeholder="Additional context or instructions..."
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={3}
        />

        <button
          className="btn-primary btn-full"
          onClick={handleGenerate}
          disabled={generating || !subject.trim() || !config.awsAccessKeyId}
        >
          {generating ? 'Writing...' : 'AI Write Email'}
        </button>
      </div>

      {/* Error */}
      {error && <div className="error-box">{error}</div>}

      {/* Result */}
      {result && (
        <div className="email-result-box">
          <div className="email-result-header">
            <span className="email-result-label">Generated Email</span>
            <button className="btn-ghost btn-xs" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="email-result-content">{result}</div>

          {/* Tone change buttons */}
          <div className="email-tone-change">
            <span className="email-tone-change-label">Change tone:</span>
            {(Object.keys(TONE_LABELS) as Tone[])
              .filter((t) => t !== tone)
              .map((t) => (
                <button
                  key={t}
                  className="btn-ghost btn-xs"
                  onClick={() => handleToneChange(t)}
                  disabled={generating}
                >
                  {TONE_LABELS[t]}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
