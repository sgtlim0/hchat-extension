// widgets/screenshot-panel/ScreenshotPanel.tsx — 스크린샷 AI 분석 패널

import { useState, useCallback } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import { chatWithImage } from '@/lib/claude-vision'

interface Props {
  onClose: () => void
}

export function ScreenshotPanel({ onClose }: Props) {
  const [imageData, setImageData] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [prompt, setPrompt] = useState('이 스크린샷을 분석해줘. 화면에 보이는 내용을 설명하고 핵심 정보를 정리해줘.')

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  const handleCapture = useCallback(async () => {
    setCapturing(true)
    setError('')
    setResult('')
    try {
      const response = await chrome.runtime.sendMessage({ type: 'capture-screenshot' })
      if (response?.dataUrl) {
        setImageData(response.dataUrl)
      } else {
        setError(response?.error ?? 'Failed to capture screenshot')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Capture failed')
    } finally {
      setCapturing(false)
    }
  }, [])

  const handleAnalyze = useCallback(async () => {
    if (!imageData || !config.awsAccessKeyId) return
    setAnalyzing(true)
    setError('')
    setResult('')

    try {
      await chatWithImage(
        imageData,
        prompt,
        {
          awsAccessKeyId: config.awsAccessKeyId,
          awsSecretAccessKey: config.awsSecretAccessKey,
          awsRegion: config.awsRegion,
          model: config.model,
          maxTokens: 2048,
          onChunk: (chunk) => setResult((prev) => prev + chunk),
        }
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }, [imageData, prompt, config])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(result)
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
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <span className="panel-title">Screenshot AI</span>
      </div>

      {/* Capture button */}
      <div className="screenshot-actions">
        <button
          className="btn-primary btn-full"
          onClick={handleCapture}
          disabled={capturing}
        >
          {capturing ? 'Capturing...' : 'Capture Screenshot'}
        </button>
      </div>

      {/* Preview */}
      {imageData && (
        <div className="screenshot-preview">
          <img
            src={imageData}
            alt="Captured screenshot"
            className="screenshot-img"
          />
        </div>
      )}

      {/* Prompt */}
      {imageData && (
        <div className="screenshot-prompt-section">
          <textarea
            className="field-textarea field-textarea-sm"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="분석 프롬프트를 입력하세요..."
            rows={2}
          />
          <button
            className="btn-primary btn-full"
            onClick={handleAnalyze}
            disabled={analyzing || !config.awsAccessKeyId}
            style={{ marginTop: 6 }}
          >
            {analyzing ? 'Analyzing...' : 'AI Analyze'}
          </button>
        </div>
      )}

      {/* Error */}
      {error && <div className="error-box">{error}</div>}

      {/* Result */}
      {result && (
        <div className="screenshot-result-box">
          <div className="screenshot-result-header">
            <span className="screenshot-result-label">Analysis Result</span>
            <button className="btn-ghost btn-xs" onClick={handleCopy}>
              Copy
            </button>
          </div>
          <div className="screenshot-result-content">{result}</div>
        </div>
      )}
    </div>
  )
}
