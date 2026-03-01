// components/SwarmPanel.tsx
import { useState } from 'react'
import { AgentSwarm, type AgentDef } from '../lib/swarm'
import { useSwarm } from '../hooks/useSwarm'
import type { Config } from '../hooks/useConfig'

export function SwarmPanel({ config }: { config: Config }) {
  const { status, agentStates, synthesis, error, run, reset } = useSwarm(config)
  const [prompt, setPrompt] = useState('')
  const [preset, setPreset] = useState<'research' | 'debate'>('research')
  const [customAgents, setCustomAgents] = useState<AgentDef[]>([])
  const [useCustom, setUseCustom] = useState(false)

  const agents = useCustom ? customAgents : AgentSwarm.presets[preset]

  const handleRun = () => {
    if (!prompt.trim() || !config.awsAccessKeyId || status === 'running') return
    run(agents, prompt)
  }

  const agentStatusIcon: Record<string, string> = {
    waiting: '○', running: '◉', done: '●', error: '✕',
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-icon panel-icon-blue">🤖</div>
        <span className="panel-title">Agent Swarms</span>
        <span className="panel-meta">병렬 에이전트 팀</span>
      </div>

      {/* Preset Tabs */}
      <div className="preset-tabs">
        {([['research', '🔍 리서치'], ['debate', '⚖️ 토론']] as const).map(([id, label]) => (
          <button
            key={id}
            className={`preset-tab ${!useCustom && preset === id ? 'preset-tab-active' : ''}`}
            onClick={() => { setUseCustom(false); setPreset(id) }}
          >
            {label}
          </button>
        ))}
        <button
          className={`preset-tab ${useCustom ? 'preset-tab-active' : ''}`}
          onClick={() => setUseCustom(true)}
        >
          ⚙️ 커스텀
        </button>
      </div>

      {/* Agent List */}
      <div className="agents-list">
        {agents.map((agent) => {
          const state = agentStates.find((a) => a.id === agent.id)
          return (
            <div key={agent.id} className={`agent-item agent-${state?.status ?? 'idle'}`}>
              <span className="agent-emoji">{agent.emoji ?? '🤖'}</span>
              <div className="agent-info">
                <span className="agent-role">{agent.role}</span>
                {state?.result?.output ? (
                  <div className="agent-output">{state.result.output.slice(0, 80)}...</div>
                ) : (
                  <div className="agent-desc">{agent.systemPrompt?.slice(0, 40)}...</div>
                )}
              </div>
              <span className="agent-status-icon">
                {agentStatusIcon[state?.status ?? 'waiting']}
              </span>
            </div>
          )
        })}
        {useCustom && (
          <button
            className="agent-add-btn"
            onClick={() => setCustomAgents((p) => [...p, {
              id: crypto.randomUUID(), role: '새 에이전트', emoji: '🤖',
              systemPrompt: '당신은 전문가입니다.',
            }])}
          >
            + 에이전트 추가
          </button>
        )}
      </div>

      {/* Prompt Area */}
      <div className="swarm-prompt-area">
        <div className="swarm-prompt-label">작업 프롬프트</div>
        <textarea
          className="field-textarea"
          placeholder="팀에게 부여할 작업 (예: 최신 AI 트렌드 분석 보고서 작성)"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          disabled={status === 'running'}
        />
      </div>

      {/* Footer */}
      <div className="swarm-footer">
        {(status === 'done' || status === 'error') && (
          <button className="btn-ghost btn-sm" onClick={reset}>초기화</button>
        )}
        <button
          className={`btn-primary btn-swarm ${status === 'running' ? 'btn-loading' : ''}`}
          onClick={handleRun}
          disabled={status === 'running' || !prompt.trim()}
        >
          {status === 'running' ? (
            <>
              <span className="spinner" style={{ width: 12, height: 12, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
              <span>실행 중</span>
            </>
          ) : (
            <>
              <span>▶</span>
              <span>팀 실행</span>
            </>
          )}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {synthesis && status === 'done' && (
        <div className="synthesis-box">
          <div className="synthesis-header">🧩 종합 결과</div>
          <div className="synthesis-content">{synthesis}</div>
        </div>
      )}
    </div>
  )
}
