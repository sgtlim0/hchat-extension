// widgets/pdf-panel/PdfPanel.tsx — PDF 분석 (텍스트 입력 방식)

import { useState, useCallback } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import { chat, type Message } from '@/lib/claude'

interface Props {
  onClose: () => void
}

type Mode = 'analyze' | 'qa'

export function PdfPanel({ onClose }: Props) {
  const [pdfText, setPdfText] = useState('')
  const [mode, setMode] = useState<Mode>('analyze')
  const [summary, setSummary] = useState('')
  const [keyPoints, setKeyPoints] = useState<string[]>([])
  const [qaQuestion, setQaQuestion] = useState('')
  const [qaHistory, setQaHistory] = useState<Array<{ q: string; a: string }>>([])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  const handleAnalyze = useCallback(async () => {
    if (!pdfText.trim() || !config.awsAccessKeyId) return
    setProcessing(true)
    setError('')
    setSummary('')
    setKeyPoints([])

    try {
      const result = await chat(
        [{
          role: 'user',
          content: `Analyze the following document text and provide:
1. A concise summary (2-3 paragraphs)
2. Key points (5-8 bullet points)
3. Main topics covered

Format:
## Summary
(summary)

## Key Points
- point 1
- point 2

## Topics
- topic 1
- topic 2

Document text:
${pdfText.slice(0, 6000)}`,
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

      const pointsMatch = result.match(/## Key Points\n([\s\S]*?)(?=## Topics|$)/i)
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
      setProcessing(false)
    }
  }, [pdfText, config])

  const handleQa = useCallback(async () => {
    if (!qaQuestion.trim() || !pdfText.trim() || !config.awsAccessKeyId) return
    setProcessing(true)
    setError('')

    const question = qaQuestion.trim()
    setQaQuestion('')

    const messages: Message[] = [
      {
        role: 'user',
        content: `Based on the following document, answer this question: "${question}"

Document:
${pdfText.slice(0, 5000)}`,
      },
    ]

    try {
      let answer = ''
      await chat(
        messages,
        {
          awsAccessKeyId: config.awsAccessKeyId,
          awsSecretAccessKey: config.awsSecretAccessKey,
          awsRegion: config.awsRegion,
          model: config.model,
          maxTokens: 1024,
          onChunk: (chunk) => { answer += chunk },
        }
      )

      setQaHistory((prev) => [...prev, { q: question, a: answer }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Q&A failed')
    } finally {
      setProcessing(false)
    }
  }, [qaQuestion, pdfText, config])

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
        <div className="panel-icon pdf-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <span className="panel-title">PDF Analysis</span>
      </div>

      {/* Text input */}
      <textarea
        className="field-textarea pdf-text-input"
        placeholder="Paste PDF text content here..."
        value={pdfText}
        onChange={(e) => setPdfText(e.target.value)}
        rows={6}
      />

      {pdfText.trim() && (
        <div className="pdf-text-info">
          {pdfText.length.toLocaleString()} characters
        </div>
      )}

      {/* Mode tabs */}
      <div className="pdf-mode-tabs">
        <button
          className={`pdf-mode-tab ${mode === 'analyze' ? 'pdf-mode-active' : ''}`}
          onClick={() => setMode('analyze')}
        >
          Analyze
        </button>
        <button
          className={`pdf-mode-tab ${mode === 'qa' ? 'pdf-mode-active' : ''}`}
          onClick={() => setMode('qa')}
        >
          Q&A
        </button>
      </div>

      {/* Analyze mode */}
      {mode === 'analyze' && (
        <>
          <button
            className="btn-primary btn-full"
            onClick={handleAnalyze}
            disabled={processing || !pdfText.trim() || !config.awsAccessKeyId}
          >
            {processing ? 'Analyzing...' : 'AI Analyze'}
          </button>

          {summary && (
            <div className="pdf-result-box">
              <div className="pdf-result-header">
                <span className="pdf-result-label">Analysis</span>
                <button className="btn-ghost btn-xs" onClick={() => handleCopy(summary)}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="pdf-result-content">{summary}</div>
            </div>
          )}

          {keyPoints.length > 0 && (
            <div className="pdf-keypoints">
              <div className="pdf-keypoints-title">Key Points</div>
              {keyPoints.map((point, i) => (
                <div key={i} className="pdf-keypoint-item">
                  <span className="pdf-keypoint-bullet">{i + 1}</span>
                  <span className="pdf-keypoint-text">{point}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Q&A mode */}
      {mode === 'qa' && (
        <>
          <div className="pdf-qa-input-row">
            <input
              className="field-input"
              placeholder="Ask a question about the document..."
              value={qaQuestion}
              onChange={(e) => setQaQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleQa() }}
            />
            <button
              className="btn-primary btn-xs"
              onClick={handleQa}
              disabled={processing || !qaQuestion.trim() || !pdfText.trim() || !config.awsAccessKeyId}
            >
              Ask
            </button>
          </div>

          {qaHistory.length > 0 && (
            <div className="pdf-qa-history">
              {qaHistory.map((item, i) => (
                <div key={i} className="pdf-qa-item">
                  <div className="pdf-qa-question">Q: {item.q}</div>
                  <div className="pdf-qa-answer">{item.a}</div>
                </div>
              ))}
            </div>
          )}

          {qaHistory.length === 0 && !processing && (
            <div className="empty-state">
              <div className="empty-icon">&#128172;</div>
              <p>Ask questions about the document</p>
              <p className="empty-sub">Paste text above, then ask questions</p>
            </div>
          )}
        </>
      )}

      {/* Error */}
      {error && <div className="error-box">{error}</div>}
    </div>
  )
}
