// entities/audit/audit.store.ts — 감사 로그 Zustand 스토어

import { create } from 'zustand'
import { Storage } from '@/lib/storage'
import { STORAGE_KEYS } from '@/shared/lib/storage-keys'

export type AuditAction =
  | 'chat'
  | 'summarize'
  | 'translate'
  | 'swarm'
  | 'schedule'
  | 'screenshot'
  | 'chain'
  | 'voice'
  | 'review'
  | 'export'

export interface AuditLog {
  id: string
  action: AuditAction
  model: string
  inputTokens: number
  outputTokens: number
  sessionId: string
  promptPreview: string
  timestamp: number
  duration: number // ms
  success: boolean
}

const MAX_LOGS = 5000

interface AuditState {
  logs: AuditLog[]

  // Actions
  addLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void
  deleteLogs: (ids: string[]) => void
  clearAll: () => void

  // Computed
  filteredLogs: (filter?: {
    action?: AuditAction
    dateFrom?: string
    dateTo?: string
  }) => AuditLog[]

  // Export
  exportCsv: () => string

  // Persistence
  hydrate: () => Promise<void>
  persist: () => Promise<void>
}

export const useAuditStore = create<AuditState>((set, get) => ({
  logs: [],

  addLog: (logData) => {
    const log: AuditLog = {
      ...logData,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }
    set((state) => {
      const next = [log, ...state.logs]
      // 최대 5000건 유지
      return { logs: next.slice(0, MAX_LOGS) }
    })
    get().persist()
  },

  deleteLogs: (ids) => {
    const idSet = new Set(ids)
    set((state) => ({
      logs: state.logs.filter((l) => !idSet.has(l.id)),
    }))
    get().persist()
  },

  clearAll: () => {
    set({ logs: [] })
    get().persist()
  },

  filteredLogs: (filter) => {
    const { logs } = get()
    if (!filter) return logs

    return logs.filter((l) => {
      if (filter.action && l.action !== filter.action) return false
      if (filter.dateFrom) {
        const from = new Date(filter.dateFrom).getTime()
        if (l.timestamp < from) return false
      }
      if (filter.dateTo) {
        const to = new Date(filter.dateTo).getTime() + 86400000 // end of day
        if (l.timestamp > to) return false
      }
      return true
    })
  },

  exportCsv: () => {
    const { logs } = get()
    const header =
      'ID,Action,Model,InputTokens,OutputTokens,SessionId,PromptPreview,Timestamp,Duration(ms),Success'
    const rows = logs.map(
      (l) =>
        `${l.id},${l.action},${l.model},${l.inputTokens},${l.outputTokens},${l.sessionId},"${l.promptPreview.replace(/"/g, '""')}",${new Date(l.timestamp).toISOString()},${l.duration},${l.success}`
    )
    return [header, ...rows].join('\n')
  },

  hydrate: async () => {
    const saved = await Storage.get<{ logs: AuditLog[] }>(
      STORAGE_KEYS.AUDIT_LOGS
    )
    if (saved?.logs) {
      set({ logs: saved.logs })
    }
  },

  persist: async () => {
    const { logs } = get()
    await Storage.set(STORAGE_KEYS.AUDIT_LOGS, { logs })
  },
}))
