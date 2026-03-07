// widgets/chain-panel/ChainPanel.tsx — 프롬프트 체이닝 패널

import { useState, useCallback } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import { runChain, CHAIN_PRESETS, type ChainStep, type StepResult, type StepStatus } from '@/lib/chain'

interface Props {
  onClose: () => void
}

function createStep(name?: string, prompt?: string): ChainStep {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name ?? '',
    prompt: prompt ?? '',
  }
}

const STATUS_ICONS: Record<StepStatus, string> = {
  pending: '\u25CB',   // circle
  running: '\u25CF',   // filled circle
  done: '\u2713',      // check
  error: '\u2717',     // cross
}

const STATUS_COLORS: Record<StepStatus, string> = {
  pending: 'var(--text-tertiary)',
  running: 'var(--primary)',
  done: 'var(--success)',
  error: 'var(--danger)',
}

export function ChainPanel({ onClose }: Props) {
  const [steps, setSteps] = useState<ChainStep[]>([createStep('Step 1', '')])
  const [results, setResults] = useState<Record<string, StepResult>>({})
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  const handleAddStep = useCallback(() => {
    setSteps((prev) => [...prev, createStep(`Step ${prev.length + 1}`, '')])
  }, [])

  const handleRemoveStep = useCallback((id: string) => {
    setSteps((prev) => prev.length > 1 ? prev.filter((s) => s.id !== id) : prev)
  }, [])

  const handleUpdateStep = useCallback((id: string, field: 'name' | 'prompt', value: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    )
  }, [])

  const handleLoadPreset = useCallback((presetIdx: number) => {
    const preset = CHAIN_PRESETS[presetIdx]
    if (!preset) return
    setSteps(preset.steps.map((s) => ({ ...s })))
    setResults({})
    setError('')
  }, [])

  const handleRun = useCallback(async () => {
    if (!config.awsAccessKeyId || steps.length === 0) return
    setRunning(true)
    setError('')
    setResults({})
    setExpanded({})

    try {
      const finalResults = await runChain(
        steps,
        {
          awsAccessKeyId: config.awsAccessKeyId,
          awsSecretAccessKey: config.awsSecretAccessKey,
          awsRegion: config.awsRegion,
          model: config.model,
        },
        (stepId, result) => {
          setResults((prev) => ({ ...prev, [stepId]: result }))
        }
      )

      // Auto-expand last step
      const last = finalResults[finalResults.length - 1]
      if (last) {
        setExpanded((prev) => ({ ...prev, [last.stepId]: true }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chain execution failed')
    } finally {
      setRunning(false)
    }
  }, [steps, config])

  const toggleExpand = useCallback((stepId: string) => {
    setExpanded((prev) => ({ ...prev, [stepId]: !prev[stepId] }))
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
        <div className="panel-icon panel-icon-blue">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
            <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
          </svg>
        </div>
        <span className="panel-title">Prompt Chain</span>
      </div>

      {/* Presets */}
      <div className="chain-presets">
        <span className="chain-presets-label">Presets:</span>
        {CHAIN_PRESETS.map((preset, idx) => (
          <button
            key={idx}
            className="btn-ghost btn-xs"
            onClick={() => handleLoadPreset(idx)}
            disabled={running}
            title={preset.description}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Steps */}
      <div className="chain-steps">
        {steps.map((step, idx) => {
          const stepResult = results[step.id]
          const status: StepStatus = stepResult?.status ?? 'pending'
          const isExpanded = expanded[step.id] ?? false

          return (
            <div key={step.id} className="chain-step">
              <div className="chain-step-header">
                <span
                  className="chain-step-status"
                  style={{ color: STATUS_COLORS[status] }}
                  title={status}
                >
                  {STATUS_ICONS[status]}
                </span>
                <input
                  className="chain-step-name"
                  value={step.name}
                  onChange={(e) => handleUpdateStep(step.id, 'name', e.target.value)}
                  placeholder={`Step ${idx + 1}`}
                  disabled={running}
                />
                {steps.length > 1 && (
                  <button
                    className="chain-step-remove"
                    onClick={() => handleRemoveStep(step.id)}
                    disabled={running}
                    title="Remove step"
                  >
                    &times;
                  </button>
                )}
              </div>
              <textarea
                className="field-textarea chain-step-prompt"
                value={step.prompt}
                onChange={(e) => handleUpdateStep(step.id, 'prompt', e.target.value)}
                placeholder="프롬프트 입력... ({{prev}}로 이전 결과 참조)"
                rows={2}
                disabled={running}
              />

              {/* Step result */}
              {stepResult && stepResult.output && (
                <div className="chain-step-result">
                  <button className="chain-step-result-toggle" onClick={() => toggleExpand(step.id)}>
                    <span>{isExpanded ? '\u25BC' : '\u25B6'}</span>
                    <span className="chain-step-result-label">
                      Result ({stepResult.output.length} chars)
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="chain-step-result-content">{stepResult.output}</div>
                  )}
                </div>
              )}

              {stepResult?.error && (
                <div className="error-box" style={{ marginTop: 4 }}>{stepResult.error}</div>
              )}

              {/* Chain connector */}
              {idx < steps.length - 1 && (
                <div className="chain-connector">
                  <svg width="12" height="20" viewBox="0 0 12 20">
                    <line x1="6" y1="0" x2="6" y2="14" stroke="var(--border)" strokeWidth="2"/>
                    <polygon points="2,14 10,14 6,20" fill="var(--border)"/>
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add step */}
      <button className="btn-ghost btn-full" onClick={handleAddStep} disabled={running} style={{ marginBottom: 8 }}>
        + Add Step
      </button>

      {/* Run */}
      <button
        className="btn-primary btn-full"
        onClick={handleRun}
        disabled={running || !config.awsAccessKeyId || steps.some((s) => !s.prompt.trim())}
      >
        {running ? 'Running...' : 'Run Chain'}
      </button>

      {error && <div className="error-box">{error}</div>}
    </div>
  )
}
