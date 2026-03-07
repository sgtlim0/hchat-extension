// widgets/youtube-panel/YouTubePanel.tsx — YouTube 자막 분석 패널

import { useState, useEffect, useCallback } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import { chat } from '@/lib/claude'

interface Props {
  onClose: () => void
}

interface CaptionData {
  title: string
  captions: string
}

export function YouTubePanel({ onClose }: Props) {
  const [captionData, setCaptionData] = useState<CaptionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [isYouTube, setIsYouTube] = useState(false)
  const [summary, setSummary] = useState('')
  const [keyPoints, setKeyPoints] = useState<string[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  // YouTube 탭 감지 및 자막 가져오기
  const fetchCaptions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await chrome.runtime.sendMessage({ type: 'get-youtube-captions' })
      if (response?.isYouTube) {
        setIsYouTube(true)
        setCaptionData({
          title: response.title ?? '',
          captions: response.captions ?? '',
        })
      } else {
        setIsYouTube(false)
      }
    } catch {
      setError('Failed to get page data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCaptions()
  }, [fetchCaptions])

  const handleSummarize = useCallback(async () => {
    if (!captionData?.captions || !config.awsAccessKeyId) return
    setAnalyzing(true)
    setError('')
    setSummary('')
    setKeyPoints([])

    try {
      const result = await chat(
        [{
          role: 'user',
          content: `Analyze the following YouTube video transcript and provide:
1. A concise summary (2-3 paragraphs)
2. Key points (bullet points, 5-8 items)

Format your response as:
## Summary
(summary here)

## Key Points
- point 1
- point 2
...

Video title: ${captionData.title}
Transcript:
${captionData.captions.slice(0, 6000)}`,
        }],
        {
          awsAccessKeyId: config.awsAccessKeyId,
          awsSecretAccessKey: config.awsSecretAccessKey,
          awsRegion: config.awsRegion,
          model: config.model,
          maxTokens: 2048,
          onChunk: (chunk) => setSummary((prev) => prev + chunk),
        }
      )

      // Parse key points from result
      const pointsMatch = result.match(/## Key Points\n([\s\S]*?)$/i)
      if (pointsMatch) {
        const points = pointsMatch[1]
          .split('\n')
          .filter((l) => l.trim().startsWith('-'))
          .map((l) => l.trim().replace(/^-\s*/, ''))
        setKeyPoints(points)
      }

      const summaryMatch = result.match(/## Summary\n([\s\S]*?)(?=## Key Points|$)/i)
      if (summaryMatch) {
        setSummary(summaryMatch[1].trim())
      } else {
        setSummary(result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }, [captionData, config])

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // fallback
    }
  }, [])

  return (
    <div className="panel">
      {/* Header */}
      <div className="panel-header">
        <button className="header-btn" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="panel-icon youtube-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </div>
        <span className="panel-title">YouTube Analysis</span>
        <button className="btn-ghost btn-xs" onClick={fetchCaptions} disabled={loading}>
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && <div className="panel-loading">Detecting YouTube page...</div>}

      {/* Not YouTube */}
      {!loading && !isYouTube && (
        <div className="empty-state">
          <div className="empty-icon">&#127909;</div>
          <p>Not a YouTube video page</p>
          <p className="empty-sub">Navigate to a YouTube video to use this feature</p>
        </div>
      )}

      {/* YouTube detected */}
      {!loading && isYouTube && captionData && (
        <>
          {/* Video title */}
          <div className="youtube-title-box">
            <div className="youtube-title">{captionData.title || 'Untitled Video'}</div>
          </div>

          {/* Captions preview */}
          {captionData.captions ? (
            <div className="youtube-captions-box">
              <div className="youtube-captions-header">
                <span className="youtube-captions-label">Transcript</span>
                <span className="youtube-captions-count">
                  {captionData.captions.length.toLocaleString()} chars
                </span>
              </div>
              <div className="youtube-captions-body">
                {captionData.captions.slice(0, 500)}
                {captionData.captions.length > 500 ? '...' : ''}
              </div>
            </div>
          ) : (
            <div className="youtube-no-captions">
              No transcript available for this video
            </div>
          )}

          {/* AI Summarize button */}
          {captionData.captions && (
            <button
              className="btn-primary btn-full"
              onClick={handleSummarize}
              disabled={analyzing || !config.awsAccessKeyId}
            >
              {analyzing ? 'Analyzing...' : 'AI Summarize'}
            </button>
          )}

          {/* Error */}
          {error && <div className="error-box">{error}</div>}

          {/* Summary result */}
          {summary && (
            <div className="youtube-result-box">
              <div className="youtube-result-header">
                <span className="youtube-result-label">Summary</span>
                <button className="btn-ghost btn-xs" onClick={() => handleCopy(summary)}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="youtube-result-content">{summary}</div>
            </div>
          )}

          {/* Key Points */}
          {keyPoints.length > 0 && (
            <div className="youtube-keypoints">
              <div className="youtube-keypoints-title">Key Points</div>
              {keyPoints.map((point, i) => (
                <div key={i} className="youtube-keypoint-item">
                  <span className="youtube-keypoint-bullet">{i + 1}</span>
                  <span className="youtube-keypoint-text">{point}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
