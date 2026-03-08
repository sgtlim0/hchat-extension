// entities/template/template.store.ts — 프롬프트 라이브러리 Zustand 스토어

import { create } from 'zustand'
import { Storage } from '@/lib/storage'
import { STORAGE_KEYS } from '@/shared/lib/storage-keys'

export type TemplateCategory =
  | 'coding'
  | 'translate'
  | 'writing'
  | 'analysis'
  | 'general'

export interface PromptTemplate {
  id: string
  name: string
  category: TemplateCategory
  prompt: string
  variables: string[]
  usageCount: number
  favorite: boolean
  createdAt: number
}

// {{variable}} 파서
export function parseVariables(prompt: string): string[] {
  const matches = prompt.match(/\{\{(\w+)\}\}/g)
  if (!matches) return []
  const unique = [...new Set(matches.map((m) => m.slice(2, -2)))]
  return unique
}

// 변수 치환
export function renderTemplate(
  prompt: string,
  values: Record<string, string>
): string {
  return prompt.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? `{{${key}}}`)
}

const PRESET_TEMPLATES: Omit<PromptTemplate, 'id' | 'createdAt'>[] = [
  {
    name: '코드 리뷰',
    category: 'coding',
    prompt:
      '다음 {{language}} 코드를 리뷰해주세요. 버그, 성능 이슈, 개선점을 찾아주세요:\n\n```{{language}}\n{{code}}\n```',
    variables: ['language', 'code'],
    usageCount: 0,
    favorite: false,
  },
  {
    name: '이메일 작성',
    category: 'writing',
    prompt:
      '{{recipient}}에게 보내는 이메일을 작성해주세요.\n\n주제: {{topic}}\n톤: {{tone}}\n\n전문적이고 명확하게 작성해주세요.',
    variables: ['recipient', 'topic', 'tone'],
    usageCount: 0,
    favorite: false,
  },
  {
    name: '번역',
    category: 'translate',
    prompt:
      '다음 텍스트를 {{targetLang}}로 번역해주세요. 자연스럽고 정확하게 번역해주세요:\n\n{{text}}',
    variables: ['text', 'targetLang'],
    usageCount: 0,
    favorite: false,
  },
  {
    name: '요약',
    category: 'analysis',
    prompt:
      '다음 텍스트를 {{length}} 분량으로 요약해주세요. 핵심 내용을 빠짐없이 포함해주세요:\n\n{{text}}',
    variables: ['text', 'length'],
    usageCount: 0,
    favorite: false,
  },
  {
    name: '블로그 작성',
    category: 'writing',
    prompt:
      '{{topic}}에 대한 블로그 글을 작성해주세요.\n\n대상 독자: {{audience}}\n스타일: {{style}}\n\nSEO에 최적화되고, 읽기 쉬운 구조로 작성해주세요.',
    variables: ['topic', 'audience', 'style'],
    usageCount: 0,
    favorite: false,
  },
]

interface TemplateState {
  templates: PromptTemplate[]

  // Actions
  addTemplate: (
    data: Pick<PromptTemplate, 'name' | 'category' | 'prompt'>
  ) => void
  updateTemplate: (id: string, patch: Partial<PromptTemplate>) => void
  deleteTemplate: (id: string) => void
  toggleFavorite: (id: string) => void
  incrementUsage: (id: string) => void

  // Persistence
  hydrate: () => Promise<void>
  persist: () => Promise<void>
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],

  addTemplate: (data) => {
    const template: PromptTemplate = {
      id: crypto.randomUUID(),
      name: data.name,
      category: data.category,
      prompt: data.prompt,
      variables: parseVariables(data.prompt),
      usageCount: 0,
      favorite: false,
      createdAt: Date.now(),
    }
    set((state) => ({
      templates: [template, ...state.templates],
    }))
    get().persist()
  },

  updateTemplate: (id, patch) => {
    set((state) => ({
      templates: state.templates.map((t) => {
        if (t.id !== id) return t
        const updated = { ...t, ...patch }
        if (patch.prompt !== undefined) {
          updated.variables = parseVariables(updated.prompt)
        }
        return updated
      }),
    }))
    get().persist()
  },

  deleteTemplate: (id) => {
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== id),
    }))
    get().persist()
  },

  toggleFavorite: (id) => {
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === id ? { ...t, favorite: !t.favorite } : t
      ),
    }))
    get().persist()
  },

  incrementUsage: (id) => {
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === id ? { ...t, usageCount: t.usageCount + 1 } : t
      ),
    }))
    get().persist()
  },

  hydrate: async () => {
    const saved = await Storage.get<{ templates: PromptTemplate[] }>(
      STORAGE_KEYS.TEMPLATES
    )
    if (saved?.templates?.length) {
      set({ templates: saved.templates })
    } else {
      // 프리셋으로 초기화
      const presets: PromptTemplate[] = PRESET_TEMPLATES.map((p) => ({
        ...p,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      }))
      set({ templates: presets })
    }
  },

  persist: async () => {
    const { templates } = get()
    await Storage.set(STORAGE_KEYS.TEMPLATES, { templates })
  },
}))
