// entities/usage/usage.store.ts — 사용량 추적 Zustand 스토어

import { create } from 'zustand'
import { Storage } from '@/lib/storage'
import { STORAGE_KEYS } from '@/shared/lib/storage-keys'

export interface DailyUsage {
  date: string // YYYY-MM-DD
  model: string
  inputTokens: number
  outputTokens: number
  cost: number
  count: number
}

export interface UsageBudget {
  monthlyLimit: number // USD
  warningThreshold: number // 0-1 (e.g. 0.7 = 70%)
}

// 토큰 추정: 한국어 1자 ~2토큰, 영어 1단어 ~1.3토큰
export function estimateTokens(text: string): number {
  let tokens = 0
  // 한국어 문자 수 (한글 범위)
  const koreanChars = text.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g)?.length ?? 0
  // 나머지를 영어 단어 수로 추정
  const nonKorean = text.replace(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g, '')
  const englishWords = nonKorean.trim().split(/\s+/).filter(Boolean).length
  tokens = koreanChars * 2 + Math.ceil(englishWords * 1.3)
  return Math.max(tokens, 1)
}

// 비용 계산 (per 1M tokens)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'sonnet': { input: 3, output: 15 },
  'opus': { input: 15, output: 75 },
  'haiku': { input: 0.8, output: 4 },
}

export function getModelPricing(model: string): { input: number; output: number } {
  if (model.includes('opus')) return MODEL_PRICING['opus']
  if (model.includes('haiku')) return MODEL_PRICING['haiku']
  return MODEL_PRICING['sonnet']
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = getModelPricing(model)
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}

interface UsageState {
  dailyUsage: DailyUsage[]
  budget: UsageBudget

  // Actions
  recordUsage: (model: string, inputTokens: number, outputTokens: number) => void
  setBudget: (budget: Partial<UsageBudget>) => void
  clearUsage: () => void

  // Computed
  todayUsage: () => DailyUsage[]
  weekUsage: () => DailyUsage[]
  monthUsage: () => DailyUsage[]
  totalCostThisMonth: () => number
  isOverBudget: () => boolean

  // Persistence
  hydrate: () => Promise<void>
  persist: () => Promise<void>
}

export const useUsageStore = create<UsageState>((set, get) => ({
  dailyUsage: [],
  budget: { monthlyLimit: 50, warningThreshold: 0.7 },

  recordUsage: (model, inputTokens, outputTokens) => {
    const date = getToday()
    const cost = calculateCost(model, inputTokens, outputTokens)
    const existing = get().dailyUsage.find(
      (u) => u.date === date && u.model === model
    )

    if (existing) {
      set((state) => ({
        dailyUsage: state.dailyUsage.map((u) =>
          u.date === date && u.model === model
            ? {
                ...u,
                inputTokens: u.inputTokens + inputTokens,
                outputTokens: u.outputTokens + outputTokens,
                cost: u.cost + cost,
                count: u.count + 1,
              }
            : u
        ),
      }))
    } else {
      set((state) => ({
        dailyUsage: [
          ...state.dailyUsage,
          { date, model, inputTokens, outputTokens, cost, count: 1 },
        ],
      }))
    }
    get().persist()
  },

  setBudget: (patch) => {
    set((state) => ({
      budget: { ...state.budget, ...patch },
    }))
    get().persist()
  },

  clearUsage: () => {
    set({ dailyUsage: [] })
    get().persist()
  },

  todayUsage: () => {
    const today = getToday()
    return get().dailyUsage.filter((u) => u.date === today)
  },

  weekUsage: () => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    return get().dailyUsage.filter((u) => u.date >= weekAgo)
  },

  monthUsage: () => {
    const monthStart = new Date().toISOString().slice(0, 7) // YYYY-MM
    return get().dailyUsage.filter((u) => u.date.startsWith(monthStart))
  },

  totalCostThisMonth: () => {
    return get()
      .monthUsage()
      .reduce((sum, u) => sum + u.cost, 0)
  },

  isOverBudget: () => {
    const { budget } = get()
    const total = get().totalCostThisMonth()
    return total >= budget.monthlyLimit * budget.warningThreshold
  },

  hydrate: async () => {
    const saved = await Storage.get<{
      dailyUsage: DailyUsage[]
      budget: UsageBudget
    }>(STORAGE_KEYS.USAGE)
    if (saved) {
      set({
        dailyUsage: saved.dailyUsage ?? [],
        budget: saved.budget ?? { monthlyLimit: 50, warningThreshold: 0.7 },
      })
    }
  },

  persist: async () => {
    const { dailyUsage, budget } = get()
    await Storage.set(STORAGE_KEYS.USAGE, { dailyUsage, budget })
  },
}))
