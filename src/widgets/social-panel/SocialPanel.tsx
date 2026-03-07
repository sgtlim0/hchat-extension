// widgets/social-panel/SocialPanel.tsx — 소셜 미디어 도우미

import { useState, useCallback } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import { chat } from '@/lib/claude'

interface Props {
  onClose: () => void
}

type Platform = 'twitter' | 'linkedin' | 'general'
type SocialTone = 'professional' | 'witty' | 'empathetic' | 'concise'

const PLATFORM_LABELS: Record<Platform, string> = {
  twitter: 'Twitter/X',
  linkedin: 'LinkedIn',
  general: 'General',
}

const PLATFORM_LIMITS: Record<Platform, number> = {
  twitter: 280,
  linkedin: 3000,
  general: 5000,
}

const TONE_LABELS: Record<SocialTone, string> = {
  professional: 'Professional',
  witty: 'Witty',
  empathetic: 'Empathetic',
  concise: 'Concise',
}

export function SocialPanel({ onClose }: Props) {
  const [platform, setPlatform] = useState<Platform>('twitter')
  const [tone, setTone] = useState<SocialTone>('professional')
  const [input, setInput] = useState('')
  const [result, setResult] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  const charLimit = PLATFORM_LIMITS[platform]

  const handleGenerate = useCallback(async () => {
    if (!input.trim() || !config.awsAccessKeyId) return
    setGenerating(true)
    setError('')
    setResult('')
    setHashtags([])

    const prompt = `Create a ${PLATFORM_LABELS[platform]} post based on the following idea/text.

Requirements:
- Platform: ${PLATFORM_LABELS[platform]}
- Tone: ${TONE_LABELS[tone]}
- Character limit: ${charLimit} characters
${platform === 'twitter' ? '- Keep it concise and impactful. Stay well under 280 characters.' : ''}
${platform === 'linkedin' ? '- Professional format with line breaks for readability.' : ''}

Output only the post text, no explanations or quotes around it.

Idea/Text:
${input.trim()}`

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
  }, [input, platform, tone, charLimit, config])

  const handleHashtags = useCallback(async () => {
    if (!result.trim() || !config.awsAccessKeyId || generating) return
    setGenerating(true)
    setError('')

    try {
      const hashResult = await chat(
        [{
          role: 'user',
          content: `Suggest 5-8 relevant hashtags for this ${PLATFORM_LABELS[platform]} post. Output only hashtags separated by spaces:\n\n${result}`,
        }],
        {
          awsAccessKeyId: config.awsAccessKeyId,
          awsSecretAccessKey: config.awsSecretAccessKey,
          awsRegion: config.awsRegion,
          model: config.model,
          maxTokens: 256,
        }
      )

      const tags = hashResult
        .split(/\s+/)
        .filter((t) => t.startsWith('#'))
        .map((t) => t.trim())
      setHashtags(tags.length > 0 ? tags : hashResult.split(/\s+/).map((t) => `#${t.replace(/^#/, '')}`))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hashtag generation failed')
    } finally {
      setGenerating(false)
    }
  }, [result, platform, config, generating])

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // fallback
    }
  }, [])

  const handleAppendHashtags = () => {
    if (hashtags.length > 0) {
      setResult((prev) => prev + '\n\n' + hashtags.join(' '))
    }
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
        <div className="panel-icon social-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <span className="panel-title">Social Media</span>
      </div>

      {/* Platform selector */}
      <div className="social-section">
        <div className="social-section-label">Platform</div>
        <div className="social-options">
          {(Object.keys(PLATFORM_LABELS) as Platform[]).map((p) => (
            <button
              key={p}
              className={`social-option-btn ${platform === p ? 'social-option-active' : ''}`}
              onClick={() => setPlatform(p)}
            >
              {PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Tone selector */}
      <div className="social-section">
        <div className="social-section-label">Tone</div>
        <div className="social-options">
          {(Object.keys(TONE_LABELS) as SocialTone[]).map((t) => (
            <button
              key={t}
              className={`social-option-btn ${tone === t ? 'social-option-active' : ''}`}
              onClick={() => setTone(t)}
            >
              {TONE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <textarea
        className="field-textarea"
        placeholder="Enter your idea or text..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={4}
      />

      <button
        className="btn-primary btn-full"
        onClick={handleGenerate}
        disabled={generating || !input.trim() || !config.awsAccessKeyId}
      >
        {generating ? 'Writing...' : 'AI Write Post'}
      </button>

      {/* Error */}
      {error && <div className="error-box">{error}</div>}

      {/* Result */}
      {result && (
        <div className="social-result-box">
          <div className="social-result-header">
            <span className="social-result-label">{PLATFORM_LABELS[platform]} Post</span>
            <button className="btn-ghost btn-xs" onClick={() => handleCopy(result)}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="social-result-content">{result}</div>
          <div className="social-result-footer">
            <span className={`social-char-count ${result.length > charLimit ? 'social-char-over' : ''}`}>
              {result.length} / {charLimit}
            </span>
            <button className="btn-ghost btn-xs" onClick={handleHashtags} disabled={generating}>
              Hashtags
            </button>
          </div>
        </div>
      )}

      {/* Hashtags */}
      {hashtags.length > 0 && (
        <div className="social-hashtags">
          <div className="social-hashtags-header">
            <span className="social-hashtags-title">Suggested Hashtags</span>
            <button className="btn-ghost btn-xs" onClick={handleAppendHashtags}>
              Add to post
            </button>
          </div>
          <div className="social-hashtags-list">
            {hashtags.map((tag, i) => (
              <button
                key={i}
                className="social-hashtag-chip"
                onClick={() => handleCopy(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
