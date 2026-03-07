// lib/chain.ts — 프롬프트 체이닝 실행 엔진

import { chat, type ChatOptions } from './claude'

export interface ChainStep {
  id: string
  name: string
  prompt: string
  dependsOn?: string
}

export type StepStatus = 'pending' | 'running' | 'done' | 'error'

export interface StepResult {
  stepId: string
  status: StepStatus
  output: string
  error?: string
}

export interface ChainPreset {
  name: string
  description: string
  steps: ChainStep[]
}

export const CHAIN_PRESETS: ChainPreset[] = [
  {
    name: '논문 분석',
    description: '추출 → 비판 → 종합',
    steps: [
      { id: 'extract', name: '핵심 추출', prompt: '다음 내용에서 핵심 주장, 방법론, 결과를 추출해줘:\n\n{{input}}' },
      { id: 'critique', name: '비판적 분석', prompt: '다음 핵심 내용을 비판적으로 분석해줘. 강점, 약점, 한계를 지적해줘:\n\n{{prev}}' },
      { id: 'synthesis', name: '종합 정리', prompt: '다음 분석을 바탕으로 최종 종합 정리를 작성해줘:\n\n{{prev}}' },
    ],
  },
  {
    name: '콘텐츠 작성',
    description: '아이디어 → 초안 → 편집',
    steps: [
      { id: 'idea', name: '아이디어 발굴', prompt: '다음 주제에 대해 5가지 창의적인 글쓰기 아이디어를 제안해줘:\n\n{{input}}' },
      { id: 'draft', name: '초안 작성', prompt: '다음 아이디어를 바탕으로 블로그 포스트 초안을 작성해줘:\n\n{{prev}}' },
      { id: 'edit', name: '편집 & 개선', prompt: '다음 초안을 편집하고 개선해줘. 문법, 흐름, 가독성을 향상시켜줘:\n\n{{prev}}' },
    ],
  },
]

/**
 * 체인 순차 실행
 * onStepUpdate 콜백으로 각 스텝 상태를 실시간 보고
 */
export async function runChain(
  steps: ChainStep[],
  chatOpts: ChatOptions,
  onStepUpdate: (stepId: string, result: StepResult) => void
): Promise<StepResult[]> {
  const results: StepResult[] = []
  const resultMap: Record<string, string> = {}

  for (const step of steps) {
    onStepUpdate(step.id, { stepId: step.id, status: 'running', output: '' })

    // {{prev}} 치환: 이전 스텝 결과로 대체
    let resolvedPrompt = step.prompt
    if (step.dependsOn && resultMap[step.dependsOn]) {
      resolvedPrompt = resolvedPrompt.replace(/\{\{prev\}\}/g, resultMap[step.dependsOn])
    } else if (results.length > 0) {
      const lastOutput = results[results.length - 1].output
      resolvedPrompt = resolvedPrompt.replace(/\{\{prev\}\}/g, lastOutput)
    }

    try {
      let output = ''
      const result = await chat(
        [{ role: 'user', content: resolvedPrompt }],
        {
          ...chatOpts,
          maxTokens: 2048,
          onChunk: (chunk) => {
            output += chunk
            onStepUpdate(step.id, { stepId: step.id, status: 'running', output })
          },
        }
      )

      const finalOutput = result || output
      resultMap[step.id] = finalOutput
      const stepResult: StepResult = { stepId: step.id, status: 'done', output: finalOutput }
      results.push(stepResult)
      onStepUpdate(step.id, stepResult)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error'
      const stepResult: StepResult = { stepId: step.id, status: 'error', output: '', error: errMsg }
      results.push(stepResult)
      onStepUpdate(step.id, stepResult)
      break // 에러 시 체인 중단
    }
  }

  return results
}
