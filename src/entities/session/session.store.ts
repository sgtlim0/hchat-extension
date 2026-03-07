// entities/session/session.store.ts — 멀티 세션 + 메시지 Zustand 스토어

import { create } from 'zustand'
import { Storage } from '@/lib/storage'
import { STORAGE_KEYS } from '@/shared/lib/storage-keys'
import type { ChatMessage, Session, ViewState } from './session.types'

interface SessionState {
  sessions: Session[]
  currentSessionId: string | null
  view: ViewState

  // Session CRUD
  createSession: (title?: string) => string
  selectSession: (id: string) => void
  deleteSession: (id: string) => void
  renameSession: (id: string, title: string) => void
  setView: (view: ViewState) => void

  // Messages
  addMessage: (msg: ChatMessage) => void
  updateMessage: (msgId: string, patch: Partial<ChatMessage>) => void
  removeMessage: (msgId: string) => void
  clearMessages: () => void

  // Computed
  currentSession: () => Session | undefined

  // Persistence
  hydrate: () => Promise<void>
  persist: () => Promise<void>
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  view: 'chat',

  createSession: (title) => {
    const id = crypto.randomUUID()
    const idx = get().sessions.length + 1
    const session: Session = {
      id,
      title: title ?? `대화 ${idx}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    set((state) => ({
      sessions: [session, ...state.sessions],
      currentSessionId: id,
      view: 'chat',
    }))
    get().persist()
    return id
  },

  selectSession: (id) => {
    set({ currentSessionId: id, view: 'chat' })
  },

  deleteSession: (id) => {
    const state = get()
    const filtered = state.sessions.filter((s) => s.id !== id)
    const nextId = state.currentSessionId === id
      ? filtered[0]?.id ?? null
      : state.currentSessionId
    set({ sessions: filtered, currentSessionId: nextId })
    get().persist()
  },

  renameSession: (id, title) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, title } : s
      ),
    }))
    get().persist()
  },

  setView: (view) => set({ view }),

  addMessage: (msg) => {
    const sessionId = get().currentSessionId
    if (!sessionId) return
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, msg], updatedAt: Date.now() }
          : s
      ),
    }))
  },

  updateMessage: (msgId, patch) => {
    const sessionId = get().currentSessionId
    if (!sessionId) return
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              messages: s.messages.map((m) =>
                m.id === msgId ? { ...m, ...patch } : m
              ),
            }
          : s
      ),
    }))
  },

  removeMessage: (msgId) => {
    const sessionId = get().currentSessionId
    if (!sessionId) return
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, messages: s.messages.filter((m) => m.id !== msgId) }
          : s
      ),
    }))
  },

  clearMessages: () => {
    const sessionId = get().currentSessionId
    if (!sessionId) return
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, messages: [] } : s
      ),
    }))
    get().persist()
  },

  currentSession: () => {
    const { sessions, currentSessionId } = get()
    return sessions.find((s) => s.id === currentSessionId)
  },

  hydrate: async () => {
    const saved = await Storage.get<{ sessions: Session[]; currentSessionId: string | null }>(
      STORAGE_KEYS.SESSIONS
    )
    if (saved?.sessions?.length) {
      set({
        sessions: saved.sessions,
        currentSessionId: saved.currentSessionId ?? saved.sessions[0]?.id ?? null,
      })
    } else {
      // v1 마이그레이션: 기존 단일 대화가 없으면 첫 세션 생성
      get().createSession('첫 번째 대화')
    }
  },

  persist: async () => {
    const { sessions, currentSessionId } = get()
    await Storage.set(STORAGE_KEYS.SESSIONS, { sessions, currentSessionId })
  },
}))
