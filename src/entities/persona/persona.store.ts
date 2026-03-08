// entities/persona/persona.store.ts — 멀티 페르소나 AI Zustand 스토어

import { create } from 'zustand'
import { Storage } from '@/lib/storage'
import { STORAGE_KEYS } from '@/shared/lib/storage-keys'

export interface Persona {
  id: string
  name: string
  icon: string
  systemPrompt: string
  model: string
  isDefault: boolean
}

const PRESET_PERSONAS: Omit<Persona, 'id'>[] = [
  {
    name: 'Coding Expert',
    icon: '\u{1F4BB}',
    systemPrompt:
      'You are a senior software engineer with deep expertise in multiple programming languages, design patterns, and system architecture. Provide precise, production-ready code with clear explanations. Follow best practices and consider edge cases.',
    model: '',
    isDefault: true,
  },
  {
    name: 'Translator',
    icon: '\u{1F30D}',
    systemPrompt:
      'You are a professional translator fluent in Korean, English, Japanese, and Chinese. Provide natural, contextually appropriate translations. Preserve tone, nuance, and cultural references. When translating, always output only the translated text unless asked otherwise.',
    model: '',
    isDefault: false,
  },
  {
    name: 'Writer',
    icon: '\u{270D}\u{FE0F}',
    systemPrompt:
      'You are a professional writer skilled in various styles: technical, creative, business, and academic. Write clear, engaging, and well-structured content. Adapt your tone and style to match the context and audience.',
    model: '',
    isDefault: false,
  },
  {
    name: 'Analyst',
    icon: '\u{1F4CA}',
    systemPrompt:
      'You are a data analyst and business strategist. Analyze information systematically, identify patterns and insights, and present findings clearly. Use structured reasoning and provide actionable recommendations backed by evidence.',
    model: '',
    isDefault: false,
  },
  {
    name: 'Tutor',
    icon: '\u{1F393}',
    systemPrompt:
      'You are a patient and knowledgeable tutor. Explain concepts step by step, use analogies, and adapt your explanation level to the student. Ask guiding questions to deepen understanding. Make learning engaging and accessible.',
    model: '',
    isDefault: false,
  },
]

interface PersonaState {
  personas: Persona[]

  addPersona: (data: Omit<Persona, 'id'>) => void
  updatePersona: (id: string, patch: Partial<Omit<Persona, 'id'>>) => void
  deletePersona: (id: string) => void
  setDefault: (id: string) => void
  getDefault: () => Persona | undefined

  hydrate: () => Promise<void>
  persist: () => Promise<void>
}

export const usePersonaStore = create<PersonaState>((set, get) => ({
  personas: [],

  addPersona: (data) => {
    const persona: Persona = {
      ...data,
      id: crypto.randomUUID(),
    }
    set((state) => ({
      personas: [...state.personas, persona],
    }))
    get().persist()
  },

  updatePersona: (id, patch) => {
    set((state) => ({
      personas: state.personas.map((p) =>
        p.id === id ? { ...p, ...patch } : p
      ),
    }))
    get().persist()
  },

  deletePersona: (id) => {
    const { personas } = get()
    const target = personas.find((p) => p.id === id)
    const filtered = personas.filter((p) => p.id !== id)

    // If deleting the default, assign default to the first remaining persona
    if (target?.isDefault && filtered.length > 0) {
      filtered[0] = { ...filtered[0], isDefault: true }
    }

    set({ personas: filtered })
    get().persist()
  },

  setDefault: (id) => {
    set((state) => ({
      personas: state.personas.map((p) => ({
        ...p,
        isDefault: p.id === id,
      })),
    }))
    get().persist()
  },

  getDefault: () => {
    const { personas } = get()
    return personas.find((p) => p.isDefault) ?? personas[0]
  },

  hydrate: async () => {
    const saved = await Storage.get<{ personas: Persona[] }>(
      STORAGE_KEYS.PERSONAS
    )
    if (saved?.personas?.length) {
      set({ personas: saved.personas })
    } else {
      const presets: Persona[] = PRESET_PERSONAS.map((p) => ({
        ...p,
        id: crypto.randomUUID(),
      }))
      set({ personas: presets })
    }
  },

  persist: async () => {
    const { personas } = get()
    await Storage.set(STORAGE_KEYS.PERSONAS, { personas })
  },
}))
