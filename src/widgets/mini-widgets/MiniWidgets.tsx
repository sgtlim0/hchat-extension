// widgets/mini-widgets/MiniWidgets.tsx — AI Micro Widgets (Floating Widgets)

import { useState, useCallback, useRef, useEffect } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import { chat } from '@/lib/claude'

interface Props {
  onClose: () => void
}

type WidgetType = 'translator' | 'dictionary' | 'calculator' | 'timer'

interface WidgetState {
  enabled: boolean
}

export function MiniWidgets({ onClose }: Props) {
  const [widgets, setWidgets] = useState<Record<WidgetType, WidgetState>>({
    translator: { enabled: true },
    dictionary: { enabled: true },
    calculator: { enabled: true },
    timer: { enabled: true },
  })

  const toggleWidget = (type: WidgetType) => {
    setWidgets((prev) => ({
      ...prev,
      [type]: { ...prev[type], enabled: !prev[type].enabled },
    }))
  }

  return (
    <div className="mini-widget-panel">
      {/* Header */}
      <div className="mini-widget-header">
        <button className="mini-widget-back" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="mini-widget-title">Mini Widgets</span>
      </div>

      {/* Toggle controls */}
      <div className="mini-widget-toggles">
        {(Object.keys(widgets) as WidgetType[]).map((type) => (
          <button
            key={type}
            className={`mini-widget-toggle ${widgets[type].enabled ? 'mini-widget-toggle-active' : ''}`}
            onClick={() => toggleWidget(type)}
          >
            <span className="mini-widget-toggle-icon">
              {type === 'translator' && '\u{1F310}'}
              {type === 'dictionary' && '\u{1F4D6}'}
              {type === 'calculator' && '\u{1F5A9}'}
              {type === 'timer' && '\u{23F1}'}
            </span>
            <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
          </button>
        ))}
      </div>

      {/* Widgets */}
      <div className="mini-widget-grid">
        {widgets.translator.enabled && <TranslatorWidget />}
        {widgets.dictionary.enabled && <DictionaryWidget />}
        {widgets.calculator.enabled && <CalculatorWidget />}
        {widgets.timer.enabled && <TimerWidget />}
      </div>
    </div>
  )
}

/* ── Translator Widget ── */
function TranslatorWidget() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  const handleTranslate = useCallback(async () => {
    if (!input.trim() || !config.awsAccessKeyId) return
    setLoading(true)
    try {
      const res = await chat(
        [{ role: 'user', content: `Translate the following. If Korean, translate to English. If English, translate to Korean. Only output the translation:\n\n${input}` }],
        { ...config, maxTokens: 256 }
      )
      setResult(res)
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Failed'}`)
    } finally {
      setLoading(false)
    }
  }, [input, config])

  return (
    <div className="mini-widget-card">
      <div className="mini-widget-card-title">Translator</div>
      <textarea
        className="mini-widget-textarea"
        placeholder="Enter text..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={2}
      />
      <button className="mini-widget-btn" onClick={handleTranslate} disabled={loading || !input.trim()}>
        {loading ? 'Translating...' : 'Translate'}
      </button>
      {result && <div className="mini-widget-result">{result}</div>}
    </div>
  )
}

/* ── Dictionary Widget ── */
function DictionaryWidget() {
  const [word, setWord] = useState('')
  const [definition, setDefinition] = useState('')
  const [loading, setLoading] = useState(false)

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  const handleLookup = useCallback(async () => {
    if (!word.trim() || !config.awsAccessKeyId) return
    setLoading(true)
    try {
      const res = await chat(
        [{ role: 'user', content: `Define the word "${word}" concisely. Include pronunciation, part of speech, and 1-2 example sentences. Respond in Korean if the word is English, respond in English if the word is Korean.` }],
        { ...config, maxTokens: 256 }
      )
      setDefinition(res)
    } catch (err) {
      setDefinition(`Error: ${err instanceof Error ? err.message : 'Failed'}`)
    } finally {
      setLoading(false)
    }
  }, [word, config])

  return (
    <div className="mini-widget-card">
      <div className="mini-widget-card-title">Dictionary</div>
      <div className="mini-widget-input-row">
        <input
          className="mini-widget-input"
          placeholder="Enter a word..."
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleLookup() }}
        />
        <button className="mini-widget-btn mini-widget-btn-sm" onClick={handleLookup} disabled={loading || !word.trim()}>
          {loading ? '...' : 'Go'}
        </button>
      </div>
      {definition && <div className="mini-widget-result">{definition}</div>}
    </div>
  )
}

/* ── Calculator Widget ── */
function CalculatorWidget() {
  const [expr, setExpr] = useState('')
  const [result, setResult] = useState('')

  const handleCalc = useCallback(() => {
    if (!expr.trim()) return
    try {
      // Safe math evaluation: only allow numbers, operators, parentheses, spaces, and dot
      const sanitized = expr.replace(/[^0-9+\-*/().%\s]/g, '')
      if (!sanitized.trim()) {
        setResult('Invalid expression')
        return
      }
      // eslint-disable-next-line no-eval
      const val = Function(`"use strict"; return (${sanitized})`)()
      setResult(String(val))
    } catch {
      setResult('Error')
    }
  }, [expr])

  return (
    <div className="mini-widget-card">
      <div className="mini-widget-card-title">Calculator</div>
      <div className="mini-widget-input-row">
        <input
          className="mini-widget-input"
          placeholder="e.g. 123 * 456"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCalc() }}
        />
        <button className="mini-widget-btn mini-widget-btn-sm" onClick={handleCalc} disabled={!expr.trim()}>
          =
        </button>
      </div>
      {result && <div className="mini-widget-result mini-widget-result-calc">{result}</div>}
    </div>
  )
}

/* ── Timer Widget ── */
function TimerWidget() {
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1)
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="mini-widget-card">
      <div className="mini-widget-card-title">Timer</div>
      <div className="mini-widget-timer-display">{formatTime(seconds)}</div>
      <div className="mini-widget-timer-btns">
        <button className="mini-widget-btn mini-widget-btn-sm" onClick={() => setRunning(!running)}>
          {running ? 'Stop' : 'Start'}
        </button>
        <button className="mini-widget-btn mini-widget-btn-sm" onClick={() => { setRunning(false); setSeconds(0) }}>
          Reset
        </button>
      </div>
    </div>
  )
}
