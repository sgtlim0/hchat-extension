// widgets/reading-mode/ReadingMode.tsx — 리딩 모드 + AI 요약

import { useState, useEffect, useCallback } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import { chat } from '@/lib/claude'
import type { GetPageTextResponse } from '@/shared/types/chrome-messages'

interface Props {
  onClose: () => void
}

function estimateReadTime(text: string): string {
  // 한국어 감지: 한글 유니코드 범위
  const koreanChars = (text.match(/[\uAC00-\uD7A3]/g) || []).length
  const totalChars = text.length
  const koreanRatio = totalChars > 0 ? koreanChars / totalChars : 0

  if (koreanRatio > 0.3) {
    // 한국어 기준: 500자/분
    const minutes = Math.ceil(totalChars / 500)
    return `${minutes}min`
  }
  // 영어 기준: 200단어/분
  const words = text.split(/\s+/).filter(Boolean).length
  const minutes = Math.ceil(words / 200)
  return `${minutes}min`
}

export function ReadingMode({ onClose }: Props) {
  const [pageData, setPageData] = useState<GetPageTextResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState('')
  const [summarizing, setSummarizing] = useState(false)
  const [error, setError] = useState('')

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  const fetchPage = useCallback(() => {
    setLoading(true)
    chrome.runtime.sendMessage({ type: 'get-page-text' }, (resp: GetPageTextResponse) => {
      setPageData(resp && resp.text ? resp : null)
      setLoading(false)
    })
  }, [])

  useEffect(() => { fetchPage() }, [fetchPage])

  const handleSummarize = async () => {
    if (!pageData?.text || !config.awsAccessKeyId) return
    setSummarizing(true)
    setError('')
    setSummary('')

    try {
      const result = await chat(
        [{ role: 'user', content: `Summarize the following web page content in a clear, concise manner (3-5 bullet points). If the content is in Korean, respond in Korean. If in English, respond in English.\n\nTitle: ${pageData.title}\n\n${pageData.text.slice(0, 6000)}` }],
        {
          awsAccessKeyId: config.awsAccessKeyId,
          awsSecretAccessKey: config.awsSecretAccessKey,
          awsRegion: config.awsRegion,
          model: config.model,
          maxTokens: 1024,
          onChunk: (chunk) => setSummary((prev) => prev + chunk),
        }
      )
      setSummary(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Summary generation failed')
    } finally {
      setSummarizing(false)
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
        <div className="panel-icon panel-icon-blue">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        </div>
        <span className="panel-title">Reading Mode</span>
      </div>

      {loading && <div className="panel-loading">Loading page content...</div>}

      {!loading && !pageData && (
        <div className="empty-state">
          <div className="empty-icon">&#128214;</div>
          <p>Cannot extract page content</p>
          <p className="empty-sub">Navigate to a web page first</p>
        </div>
      )}

      {!loading && pageData && (
        <>
          {/* Page info */}
          <div className="reading-info">
            <div className="reading-title">{pageData.title || 'Untitled'}</div>
            <div className="reading-meta">
              <span>{estimateReadTime(pageData.text)} read</span>
              <span>{pageData.text.length.toLocaleString()} chars</span>
            </div>
          </div>

          {/* AI Summary */}
          <div className="reading-summary-section">
            <button
              className="btn-primary btn-sm"
              onClick={handleSummarize}
              disabled={summarizing || !config.awsAccessKeyId}
              style={{ width: '100%' }}
            >
              {summarizing ? 'Summarizing...' : 'AI Summary'}
            </button>
            {error && <div className="error-box">{error}</div>}
            {summary && (
              <div className="reading-summary-box">
                <div className="reading-summary-label">Summary</div>
                <div className="reading-summary-content">{summary}</div>
              </div>
            )}
          </div>

          {/* Body text */}
          <div className="reading-body">
            {pageData.text}
          </div>
        </>
      )}
    </div>
  )
}
