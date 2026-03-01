// hooks/useSwarm.ts
import { useState, useCallback } from 'react'
import { AgentSwarm, type AgentDef, type SwarmResult } from '../lib/swarm'
import type { Config } from './useConfig'

export type SwarmStatus = 'idle' | 'running' | 'done' | 'error'

export interface AgentState extends AgentDef {
  status: 'waiting' | 'running' | 'done' | 'error'
  result?: SwarmResult
}

export function useSwarm(config: Config) {
  const [status, setStatus] = useState<SwarmStatus>('idle')
  const [agentStates, setAgentStates] = useState<AgentState[]>([])
  const [synthesis, setSynthesis] = useState('')
  const [error, setError] = useState('')

  const run = useCallback(async (agents: AgentDef[], prompt: string, ctx = '') => {
    setStatus('running')
    setError('')
    setSynthesis('')
    setAgentStates(agents.map((a) => ({ ...a, status: 'waiting' })))

    try {
      const { results, synthesis: syn } = await AgentSwarm.run(agents, prompt, {
        awsAccessKeyId: config.awsAccessKeyId,
        awsSecretAccessKey: config.awsSecretAccessKey,
        awsRegion: config.awsRegion,
        model: config.model,
        onAgentStart: (agent) =>
          setAgentStates((prev) =>
            prev.map((a) => (a.id === agent.id ? { ...a, status: 'running' } : a))
          ),
        onAgentDone: (result) =>
          setAgentStates((prev) =>
            prev.map((a) =>
              a.id === result.agentId
                ? { ...a, status: result.error ? 'error' : 'done', result }
                : a
            )
          ),
      }, ctx)

      setSynthesis(syn)
      setStatus('done')
      return { results, synthesis: syn }
    } catch (err) {
      setError(String(err))
      setStatus('error')
      return null
    }
  }, [config])

  const reset = useCallback(() => {
    setStatus('idle')
    setAgentStates([])
    setSynthesis('')
    setError('')
  }, [])

  return { status, agentStates, synthesis, error, run, reset }
}
