// lib/swarm.ts  –  nanoclaw Agent Swarms (AWS Bedrock)

import { signRequest } from './aws-sigv4'

export interface AgentDef {
  id: string
  role: string
  systemPrompt: string
  emoji?: string
}

export interface SwarmResult {
  agentId: string
  role: string
  output: string
  durationMs: number
  error?: string
}

export interface SwarmOptions {
  awsAccessKeyId: string
  awsSecretAccessKey: string
  awsRegion?: string
  model?: string
  maxTokens?: number
  onAgentStart?: (agent: AgentDef) => void
  onAgentDone?: (result: SwarmResult) => void
}

const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-6-v1:0'
const DEFAULT_REGION = 'us-east-1'

const ORCHESTRATOR_PROMPT = `당신은 여러 전문 AI 에이전트들의 결과물을 종합하는 오케스트레이터입니다.
각 에이전트의 분석을 통합하여 일관성 있고 완성도 높은 최종 답변을 한국어로 작성하세요.`

async function callBedrock(
  systemPrompt: string,
  userPrompt: string,
  awsAccessKeyId: string,
  awsSecretAccessKey: string,
  awsRegion = DEFAULT_REGION,
  maxTokens = 1024,
  model = DEFAULT_MODEL
): Promise<string> {
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const encodedModel = encodeURIComponent(model)
  const url = `https://bedrock-runtime.${awsRegion}.amazonaws.com/model/${encodedModel}/invoke`

  const signedHeaders = await signRequest({
    method: 'POST',
    url,
    headers: { 'content-type': 'application/json' },
    body,
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
    region: awsRegion,
    service: 'bedrock',
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: signedHeaders,
    body,
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? data.Message ?? 'Bedrock API Error')
  return data.content?.[0]?.text ?? ''
}

export const AgentSwarm = {
  presets: {
    research: [
      {
        id: 'researcher', role: '리서처', emoji: '🔍',
        systemPrompt: '당신은 정보 수집 전문가입니다. 주어진 주제에 대해 핵심 사실, 데이터, 배경 지식을 체계적으로 수집·정리합니다.',
      },
      {
        id: 'analyst', role: '분석가', emoji: '📊',
        systemPrompt: '당신은 데이터 분석 전문가입니다. 정보를 비판적으로 분석하고 패턴, 인사이트, 리스크를 도출합니다.',
      },
      {
        id: 'writer', role: '작성자', emoji: '✍️',
        systemPrompt: '당신은 전문 작가입니다. 분석 결과를 명확하고 설득력 있는 문서로 작성합니다.',
      },
    ] as AgentDef[],

    debate: [
      {
        id: 'proponent', role: '찬성', emoji: '👍',
        systemPrompt: '당신은 주어진 주제에 대해 강력한 찬성 논거를 제시하는 토론 전문가입니다.',
      },
      {
        id: 'opponent', role: '반대', emoji: '👎',
        systemPrompt: '당신은 주어진 주제에 대해 강력한 반대 논거를 제시하는 토론 전문가입니다.',
      },
      {
        id: 'moderator', role: '중재자', emoji: '⚖️',
        systemPrompt: '당신은 양측 주장을 공정하게 평가하고 균형잡힌 결론을 도출하는 토론 중재자입니다.',
      },
    ] as AgentDef[],
  },

  async run(
    agents: AgentDef[],
    userPrompt: string,
    opts: SwarmOptions,
    sharedContext = ''
  ): Promise<{ results: SwarmResult[]; synthesis: string }> {
    const region = opts.awsRegion ?? DEFAULT_REGION
    const model = opts.model ?? DEFAULT_MODEL

    agents.forEach((a) => opts.onAgentStart?.(a))

    const results = await Promise.all(
      agents.map(async (agent): Promise<SwarmResult> => {
        const start = Date.now()
        try {
          const sysPrompt = agent.systemPrompt
            + (sharedContext ? `\n\n공유 컨텍스트:\n${sharedContext}` : '')
          const output = await callBedrock(
            sysPrompt, userPrompt,
            opts.awsAccessKeyId, opts.awsSecretAccessKey,
            region, opts.maxTokens, model
          )
          const result: SwarmResult = { agentId: agent.id, role: agent.role, output, durationMs: Date.now() - start }
          opts.onAgentDone?.(result)
          return result
        } catch (err) {
          const result: SwarmResult = { agentId: agent.id, role: agent.role, output: '', durationMs: Date.now() - start, error: String(err) }
          opts.onAgentDone?.(result)
          return result
        }
      })
    )

    const successParts = results
      .filter((r) => !r.error)
      .map((r) => `## ${r.role}의 분석\n${r.output}`)
      .join('\n\n')

    const synthesis = await callBedrock(
      ORCHESTRATOR_PROMPT,
      `원래 질문: ${userPrompt}\n\n${successParts}\n\n위 내용을 종합하여 최종 답변을 작성해주세요.`,
      opts.awsAccessKeyId, opts.awsSecretAccessKey,
      region, (opts.maxTokens ?? 1024) * 2, model
    )

    return { results, synthesis }
  },
}
