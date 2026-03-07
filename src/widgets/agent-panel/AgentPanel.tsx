// widgets/agent-panel/AgentPanel.tsx — 에이전트 도구 호출 패널

import { useState, useCallback } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import { chat } from '@/lib/claude'
import { buildSystemPrompt, parseToolCall, executeTool, type ToolCall } from '@/lib/agent-tools'

interface Props {
  onClose: () => void
}

const MAX_LOOPS = 5

export function AgentPanel({ onClose }: Props) {
  const [prompt, setPrompt] = useState('')
  const [running, setRunning] = useState(false)
  const [finalAnswer, setFinalAnswer] = useState('')
  const [toolLog, setToolLog] = useState<ToolCall[]>([])
  const [error, setError] = useState('')
  const [loopCount, setLoopCount] = useState(0)

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  const handleRun = useCallback(async () => {
    if (!prompt.trim() || !config.awsAccessKeyId) return
    setRunning(true)
    setError('')
    setFinalAnswer('')
    setToolLog([])
    setLoopCount(0)

    const systemPrompt = buildSystemPrompt()
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      { role: 'user', content: prompt },
    ]

    try {
      let loops = 0
      while (loops < MAX_LOOPS) {
        loops++
        setLoopCount(loops)

        const response = await chat(messages, {
          awsAccessKeyId: config.awsAccessKeyId,
          awsSecretAccessKey: config.awsSecretAccessKey,
          awsRegion: config.awsRegion,
          model: config.model,
          systemPrompt,
          maxTokens: 2048,
        })

        // Check for tool call in response
        const toolCallParsed = parseToolCall(response)

        if (!toolCallParsed) {
          // No tool call — this is the final answer
          setFinalAnswer(response)
          break
        }

        // Execute tool
        const toolOutput = await executeTool(toolCallParsed.tool, toolCallParsed.input)

        // Log tool call
        const logEntry: ToolCall = {
          tool: toolCallParsed.tool,
          input: toolCallParsed.input,
          output: toolOutput,
        }
        setToolLog((prev) => [...prev, logEntry])

        // Add to conversation
        messages.push({ role: 'assistant', content: response })
        messages.push({
          role: 'user',
          content: `<tool_result>\n<name>${toolCallParsed.tool}</name>\n<output>${toolOutput}</output>\n</tool_result>\n\nNow use the tool result to answer the original question. If you need more information, you can call another tool.`,
        })
      }

      if (loops >= MAX_LOOPS && !finalAnswer) {
        setFinalAnswer('(Maximum tool call loops reached)')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent execution failed')
    } finally {
      setRunning(false)
    }
  }, [prompt, config, finalAnswer])

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
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
        <div className="panel-icon panel-icon-blue">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span className="panel-title">Agent Tools</span>
      </div>

      {/* Input */}
      <div className="agent-input-section">
        <textarea
          className="field-textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask a question... The agent can search the web, read page content, or calculate."
          rows={3}
          disabled={running}
        />

        <div className="agent-tools-info">
          <span className="agent-tools-label">Available tools:</span>
          <span className="agent-tool-tag">web_search</span>
          <span className="agent-tool-tag">get_page_content</span>
          <span className="agent-tool-tag">calculator</span>
        </div>

        <button
          className="btn-primary btn-full"
          onClick={handleRun}
          disabled={running || !prompt.trim() || !config.awsAccessKeyId}
        >
          {running ? `Running... (loop ${loopCount}/${MAX_LOOPS})` : 'Run Agent'}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {/* Tool call log */}
      {toolLog.length > 0 && (
        <div className="agent-log">
          <div className="agent-log-title">Tool Calls ({toolLog.length})</div>
          {toolLog.map((log, idx) => (
            <div key={idx} className="agent-log-entry">
              <div className="agent-log-header">
                <span className="agent-log-tool">{log.tool}</span>
                <span className="agent-log-step">#{idx + 1}</span>
              </div>
              <div className="agent-log-row">
                <span className="agent-log-label">Input:</span>
                <span className="agent-log-value">{log.input.slice(0, 200)}</span>
              </div>
              <div className="agent-log-row">
                <span className="agent-log-label">Output:</span>
                <span className="agent-log-value">{log.output.slice(0, 300)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Final answer */}
      {finalAnswer && (
        <div className="agent-answer">
          <div className="agent-answer-header">
            <span className="agent-answer-label">Answer</span>
            <button className="btn-ghost btn-xs" onClick={() => handleCopy(finalAnswer)}>
              Copy
            </button>
          </div>
          <div className="agent-answer-content">{finalAnswer}</div>
        </div>
      )}
    </div>
  )
}
