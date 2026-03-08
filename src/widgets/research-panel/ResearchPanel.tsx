// widgets/research-panel/ResearchPanel.tsx — 크로스 탭 AI 리서치 패널

import { useState, useCallback } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import { chat } from '@/lib/claude'

interface Props {
  onClose: () => void
}

interface TabInfo {
  tabId: number
  title: string
  url: string
  selected: boolean
}

interface ResearchResult {
  id: string
  type: 'analysis' | 'comparison'
  content: string
  tabCount: number
  createdAt: number
}

const RESEARCH_STORAGE_KEY = 'hchat:research:results'

export function ResearchPanel({ onClose }: Props) {
  const [tabs, setTabs] = useState<TabInfo[]>([])
  const [collecting, setCollecting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [savedResults, setSavedResults] = useState<ResearchResult[]>([])
  const [showSaved, setShowSaved] = useState(false)

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  // 열린 탭 수집
  const handleCollectTabs = useCallback(async () => {
    setCollecting(true)
    setError('')
    try {
      const allTabs = await chrome.tabs.query({})
      const filtered = allTabs
        .filter((t) => t.id && t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://'))
        .map((t) => ({
          tabId: t.id!,
          title: t.title ?? 'Untitled',
          url: t.url ?? '',
          selected: false,
        }))
      setTabs(filtered)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to collect tabs')
    } finally {
      setCollecting(false)
    }
  }, [])

  // 탭 선택 토글
  const toggleTab = useCallback((tabId: number) => {
    setTabs((prev) =>
      prev.map((t) => (t.tabId === tabId ? { ...t, selected: !t.selected } : t))
    )
  }, [])

  // 전체 선택/해제
  const toggleAll = useCallback(() => {
    setTabs((prev) => {
      const allSelected = prev.every((t) => t.selected)
      return prev.map((t) => ({ ...t, selected: !allSelected }))
    })
  }, [])

  // 선택된 탭에서 텍스트 추출 후 AI 분석
  const handleAnalyze = useCallback(async (mode: 'analysis' | 'comparison') => {
    const selectedTabs = tabs.filter((t) => t.selected)
    if (selectedTabs.length === 0) {
      setError('Select at least one tab')
      return
    }
    if (!config.awsAccessKeyId) {
      setError('AWS credentials required')
      return
    }

    setAnalyzing(true)
    setError('')
    setResult('')

    try {
      // background에서 탭 텍스트 수집
      const tabIds = selectedTabs.map((t) => t.tabId)
      const response: { texts: Array<{ tabId: number; title: string; url: string; text: string }> } =
        await chrome.runtime.sendMessage({ type: 'get-tab-texts', tabIds })

      if (!response.texts || response.texts.length === 0) {
        setError('No text extracted from selected tabs')
        setAnalyzing(false)
        return
      }

      // 각 탭의 텍스트를 구조화
      const pageTexts = response.texts
        .map((t, i) => `--- Page ${i + 1}: ${t.title} (${t.url}) ---\n${t.text}`)
        .join('\n\n')

      const systemPrompt = mode === 'comparison'
        ? `You are a research analyst. The user provides text from multiple web pages. Create a detailed comparison table in Markdown format. Include columns for key attributes found across the pages. Be thorough and objective.`
        : `You are a research analyst. The user provides text from multiple web pages. Provide a comprehensive analysis that synthesizes information across all sources. Include: key findings, common themes, differences, and actionable insights.`

      const userMessage = `Analyze the following ${response.texts.length} web pages:\n\n${pageTexts.slice(0, 12000)}`

      let accumulated = ''
      await chat(
        [{ role: 'user', content: userMessage }],
        {
          awsAccessKeyId: config.awsAccessKeyId,
          awsSecretAccessKey: config.awsSecretAccessKey,
          awsRegion: config.awsRegion,
          model: config.model,
          systemPrompt,
          maxTokens: 4096,
          onChunk: (chunk) => {
            accumulated += chunk
            setResult(accumulated)
          },
        }
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }, [tabs, config])

  // 결과 저장
  const handleSaveResult = useCallback(async (type: 'analysis' | 'comparison') => {
    if (!result) return
    try {
      const stored = await chrome.storage.local.get(RESEARCH_STORAGE_KEY)
      const existing = (stored[RESEARCH_STORAGE_KEY] as ResearchResult[] | undefined) ?? []
      const entry: ResearchResult = {
        id: `res-${Date.now()}`,
        type,
        content: result,
        tabCount: tabs.filter((t) => t.selected).length,
        createdAt: Date.now(),
      }
      const updated = [entry, ...existing].slice(0, 20)
      await chrome.storage.local.set({ [RESEARCH_STORAGE_KEY]: updated })
      setSavedResults(updated)
    } catch {
      setError('Failed to save result')
    }
  }, [result, tabs])

  // 저장된 결과 로드
  const handleLoadSaved = useCallback(async () => {
    try {
      const stored = await chrome.storage.local.get(RESEARCH_STORAGE_KEY)
      setSavedResults((stored[RESEARCH_STORAGE_KEY] as ResearchResult[] | undefined) ?? [])
      setShowSaved(true)
    } catch {
      setError('Failed to load saved results')
    }
  }, [])

  // 복사
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(result)
    } catch { /* noop */ }
  }, [result])

  const selectedCount = tabs.filter((t) => t.selected).length

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
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        <span className="panel-title">Multi-Tab Research</span>
        <div className="header-spacer" />
        <button className="btn-ghost btn-xs" onClick={handleLoadSaved}>
          Saved
        </button>
      </div>

      {/* Saved results view */}
      {showSaved && (
        <div className="research-saved-overlay">
          <div className="research-saved-header">
            <span className="research-saved-title">Saved Results</span>
            <button className="btn-ghost btn-xs" onClick={() => setShowSaved(false)}>Close</button>
          </div>
          {savedResults.length === 0 && (
            <div className="research-empty">No saved results</div>
          )}
          {savedResults.map((r) => (
            <div key={r.id} className="research-saved-item">
              <div className="research-saved-meta">
                <span className="research-saved-type">{r.type === 'comparison' ? 'Comparison' : 'Analysis'}</span>
                <span className="research-saved-info">{r.tabCount} tabs &middot; {new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              <button className="btn-ghost btn-xs" onClick={() => { setResult(r.content); setShowSaved(false) }}>
                View
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Collect tabs */}
      <div className="research-section">
        <button
          className="btn-primary btn-full"
          onClick={handleCollectTabs}
          disabled={collecting}
        >
          {collecting ? 'Collecting...' : 'Collect Open Tabs'}
        </button>
      </div>

      {/* Tab list */}
      {tabs.length > 0 && (
        <div className="research-tabs">
          <div className="research-tabs-header">
            <span className="research-label">{tabs.length} tabs found ({selectedCount} selected)</span>
            <button className="btn-ghost btn-xs" onClick={toggleAll}>
              {tabs.every((t) => t.selected) ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="research-tab-list">
            {tabs.map((t) => (
              <label key={t.tabId} className="research-tab-item">
                <input
                  type="checkbox"
                  checked={t.selected}
                  onChange={() => toggleTab(t.tabId)}
                  className="research-checkbox"
                />
                <div className="research-tab-info">
                  <span className="research-tab-title">{t.title}</span>
                  <span className="research-tab-url">{t.url}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Analysis buttons */}
      {selectedCount > 0 && (
        <div className="research-actions">
          <button
            className="btn-primary"
            onClick={() => handleAnalyze('analysis')}
            disabled={analyzing}
            style={{ flex: 1 }}
          >
            {analyzing ? 'Analyzing...' : 'Synthesize'}
          </button>
          <button
            className="btn-primary"
            onClick={() => handleAnalyze('comparison')}
            disabled={analyzing}
            style={{ flex: 1 }}
          >
            {analyzing ? '...' : 'Compare'}
          </button>
        </div>
      )}

      {/* Error */}
      {error && <div className="error-box">{error}</div>}

      {/* Result */}
      {result && (
        <div className="research-result">
          <div className="research-result-header">
            <span className="research-result-label">Research Result</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn-ghost btn-xs" onClick={handleCopy}>Copy</button>
              <button className="btn-ghost btn-xs" onClick={() => handleSaveResult('analysis')}>Save</button>
            </div>
          </div>
          <div className="research-result-content">{result}</div>
        </div>
      )}
    </div>
  )
}
