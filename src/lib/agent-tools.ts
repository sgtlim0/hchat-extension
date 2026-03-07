// lib/agent-tools.ts — 에이전트 도구 정의 + 실행

export interface ToolDef {
  name: string
  description: string
  parameters: string
}

export interface ToolCall {
  tool: string
  input: string
  output: string
}

export const TOOLS: ToolDef[] = [
  {
    name: 'web_search',
    description: 'Search the web for information. Input: search query string.',
    parameters: 'query: string',
  },
  {
    name: 'get_page_content',
    description: 'Get the text content of the current browser page.',
    parameters: 'none',
  },
  {
    name: 'calculator',
    description: 'Evaluate a mathematical expression safely. Input: math expression string (e.g. "2+3*4", "Math.sqrt(16)").',
    parameters: 'expression: string',
  },
]

export function buildSystemPrompt(): string {
  const toolDescriptions = TOOLS.map(
    (t) => `<tool name="${t.name}" parameters="${t.parameters}">${t.description}</tool>`
  ).join('\n')

  return `You are an AI assistant with access to tools. When you need to use a tool, output it in this XML format:

<tool_call>
<name>TOOL_NAME</name>
<input>INPUT_VALUE</input>
</tool_call>

Available tools:
${toolDescriptions}

Rules:
- Use at most one tool call per response
- After receiving tool results, incorporate them into your final answer
- If no tool is needed, just respond normally
- Always explain your reasoning`
}

/**
 * AI 응답에서 tool_call XML 파싱
 */
export function parseToolCall(text: string): { tool: string; input: string } | null {
  const match = text.match(/<tool_call>\s*<name>(.*?)<\/name>\s*<input>([\s\S]*?)<\/input>\s*<\/tool_call>/)
  if (!match) return null
  return {
    tool: match[1].trim(),
    input: match[2].trim(),
  }
}

/**
 * 도구 실행
 */
export async function executeTool(toolName: string, input: string): Promise<string> {
  switch (toolName) {
    case 'web_search':
      return executeWebSearch(input)
    case 'get_page_content':
      return executeGetPageContent()
    case 'calculator':
      return executeCalculator(input)
    default:
      return `Unknown tool: ${toolName}`
  }
}

async function executeWebSearch(query: string): Promise<string> {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'web-search', query })
    if (response?.results) {
      return response.results
    }
    return `Web search results for "${query}":\n(Search functionality requires background handler. Query was: ${query})`
  } catch {
    return `Web search for "${query}" - feature requires network access. Please try again.`
  }
}

async function executeGetPageContent(): Promise<string> {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'get-page-text' })
    if (response?.text) {
      const truncated = response.text.slice(0, 4000)
      return `Page: ${response.title}\nURL: ${response.url}\n\n${truncated}`
    }
    return 'Could not retrieve page content'
  } catch {
    return 'Failed to get page content'
  }
}

function executeCalculator(expression: string): string {
  try {
    // 안전한 수식 계산 — 허용된 문자만 통과
    const sanitized = expression.replace(/[^0-9+\-*/().,%^ Math.sqrtpowlogceilfloorabsroundPIE\s]/g, '')
    if (sanitized.length === 0) return 'Invalid expression'

    // Math 함수만 허용하는 안전한 평가
    const allowed = /^[0-9+\-*/().,%^ \s]|(Math\.(sqrt|pow|log|ceil|floor|abs|round|PI|E))/g
    const tokens = expression.match(allowed)
    if (!tokens) return 'Invalid expression'

    const safeExpr = tokens.join('')
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${safeExpr})`)
    const result = fn()

    if (typeof result === 'number' && !isNaN(result)) {
      return String(result)
    }
    return 'Invalid expression result'
  } catch (err) {
    return `Calculation error: ${err instanceof Error ? err.message : 'unknown'}`
  }
}
