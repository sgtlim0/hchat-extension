// widgets/autopilot-panel/AutopilotPanel.tsx — AI 웹 오토메이션 패널

import { useState, useCallback, useEffect } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import { chat } from '@/lib/claude'
import {
  parseActions,
  loadMacros,
  saveMacro,
  deleteMacro,
  AUTOPILOT_SYSTEM_PROMPT,
} from '@/lib/autopilot'
import type { AutoAction, SavedMacro, ActionLog } from '@/lib/autopilot'

interface Props {
  onClose: () => void
}

type PanelTab = 'command' | 'macros'

export function AutopilotPanel({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<PanelTab>('command')
  const [command, setCommand] = useState('')
  const [actions, setActions] = useState<AutoAction[]>([])
  const [logs, setLogs] = useState<ActionLog[]>([])
  const [generating, setGenerating] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState('')
  const [macros, setMacros] = useState<SavedMacro[]>([])
  const [macroName, setMacroName] = useState('')

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  // 매크로 로드
  useEffect(() => {
    loadMacros().then(setMacros).catch(() => { /* noop */ })
  }, [])

  // AI로 명령 → 액션 변환
  const handleGenerate = useCallback(async () => {
    if (!command.trim() || !config.awsAccessKeyId) return
    setGenerating(true)
    setError('')
    setActions([])
    setLogs([])

    try {
      const result = await chat(
        [{ role: 'user', content: command }],
        {
          awsAccessKeyId: config.awsAccessKeyId,
          awsSecretAccessKey: config.awsSecretAccessKey,
          awsRegion: config.awsRegion,
          model: config.model,
          systemPrompt: AUTOPILOT_SYSTEM_PROMPT,
          maxTokens: 1024,
        }
      )

      const parsed = parseActions(result)
      if (parsed.length === 0) {
        setError('AI could not generate valid actions. Try a more specific command.')
        return
      }
      setActions(parsed)
      setLogs(parsed.map((a, i) => ({ index: i, action: a, status: 'pending' })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }, [command, config])

  // 액션 시퀀스 실행
  const handleExecute = useCallback(async () => {
    if (actions.length === 0) return
    setExecuting(true)
    setError('')

    const newLogs: ActionLog[] = actions.map((a, i) => ({
      index: i,
      action: a,
      status: 'pending' as const,
    }))
    setLogs([...newLogs])

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]

      try {
        const response: { success: boolean; message: string } =
          await chrome.runtime.sendMessage({
            type: 'execute-dom-action',
            action,
          })

        newLogs[i] = {
          ...newLogs[i],
          status: response.success ? 'success' : 'fail',
          message: response.message,
        }
      } catch (err) {
        newLogs[i] = {
          ...newLogs[i],
          status: 'fail',
          message: err instanceof Error ? err.message : 'Execution error',
        }
      }
      setLogs([...newLogs])

      // 각 액션 사이 짧은 딜레이
      if (i < actions.length - 1) {
        await new Promise((r) => setTimeout(r, action.delay ?? 300))
      }
    }

    setExecuting(false)
  }, [actions])

  // 매크로 저장
  const handleSaveMacro = useCallback(async () => {
    if (!macroName.trim() || actions.length === 0) return
    try {
      await saveMacro(macroName.trim(), actions)
      const updated = await loadMacros()
      setMacros(updated)
      setMacroName('')
    } catch {
      setError('Failed to save macro')
    }
  }, [macroName, actions])

  // 매크로 삭제
  const handleDeleteMacro = useCallback(async (id: string) => {
    try {
      await deleteMacro(id)
      const updated = await loadMacros()
      setMacros(updated)
    } catch {
      setError('Failed to delete macro')
    }
  }, [])

  // 매크로 로드 → 실행 준비
  const handleLoadMacro = useCallback((macro: SavedMacro) => {
    setActions(macro.actions)
    setLogs(macro.actions.map((a, i) => ({ index: i, action: a, status: 'pending' })))
    setActiveTab('command')
  }, [])

  const actionLabel = (a: AutoAction) => {
    switch (a.action) {
      case 'click': return `Click "${a.selector}"`
      case 'type': return `Type "${a.value}" in "${a.selector}"`
      case 'scroll': return `Scroll ${a.value ?? 'down'}`
      case 'wait': return `Wait ${a.delay ?? 500}ms`
      case 'navigate': return `Navigate to ${a.value}`
      default: return a.action
    }
  }

  const statusIcon = (status: ActionLog['status']) => {
    if (status === 'success') return '\u2705'
    if (status === 'fail') return '\u274C'
    return '\u23F3'
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span className="panel-title">Web Autopilot</span>
      </div>

      {/* Tabs */}
      <div className="autopilot-tabs">
        <button
          className={`autopilot-tab ${activeTab === 'command' ? 'autopilot-tab-active' : ''}`}
          onClick={() => setActiveTab('command')}
        >
          Command
        </button>
        <button
          className={`autopilot-tab ${activeTab === 'macros' ? 'autopilot-tab-active' : ''}`}
          onClick={() => setActiveTab('macros')}
        >
          Macros ({macros.length})
        </button>
      </div>

      {activeTab === 'command' && (
        <div className="autopilot-content">
          {/* Command Input */}
          <div className="autopilot-input-section">
            <textarea
              className="field-textarea"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Describe what to do, e.g. 'Click the search box, type AI, then click Search button'"
              rows={3}
            />
            <button
              className="btn-primary btn-full"
              onClick={handleGenerate}
              disabled={generating || !command.trim() || !config.awsAccessKeyId}
              style={{ marginTop: 6 }}
            >
              {generating ? 'Generating...' : 'Generate Actions'}
            </button>
          </div>

          {/* Actions list */}
          {actions.length > 0 && (
            <div className="autopilot-actions">
              <div className="autopilot-actions-header">
                <span className="autopilot-label">Actions ({actions.length})</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="btn-primary btn-xs"
                    onClick={handleExecute}
                    disabled={executing}
                  >
                    {executing ? 'Running...' : 'Execute'}
                  </button>
                </div>
              </div>

              <div className="autopilot-steps">
                {logs.map((log) => (
                  <div key={log.index} className={`autopilot-step autopilot-step-${log.status}`}>
                    <span className="autopilot-step-icon">{statusIcon(log.status)}</span>
                    <span className="autopilot-step-text">{actionLabel(log.action)}</span>
                    {log.message && log.status === 'fail' && (
                      <span className="autopilot-step-err">{log.message}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Save as macro */}
              <div className="autopilot-save">
                <input
                  className="field-input field-input-sm"
                  value={macroName}
                  onChange={(e) => setMacroName(e.target.value)}
                  placeholder="Macro name"
                />
                <button
                  className="btn-ghost btn-xs"
                  onClick={handleSaveMacro}
                  disabled={!macroName.trim()}
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {error && <div className="error-box">{error}</div>}
        </div>
      )}

      {activeTab === 'macros' && (
        <div className="autopilot-content">
          {macros.length === 0 && (
            <div className="autopilot-empty">No saved macros yet</div>
          )}
          {macros.map((macro) => (
            <div key={macro.id} className="autopilot-macro-item">
              <div className="autopilot-macro-info">
                <span className="autopilot-macro-name">{macro.name}</span>
                <span className="autopilot-macro-meta">{macro.actions.length} steps</span>
              </div>
              <div className="autopilot-macro-actions">
                <button className="btn-ghost btn-xs" onClick={() => handleLoadMacro(macro)}>
                  Load
                </button>
                <button className="btn-ghost btn-xs autopilot-delete" onClick={() => handleDeleteMacro(macro.id)}>
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
