// lib/memory.ts  –  nanoclaw CLAUDE.md 스타일 메모리
// chrome.storage.local 기반 (팝업 닫혀도 유지)

import { Storage } from './storage'

export interface MemoryEntry {
  conversationId: string
  content: string
  updatedAt: number
}

const PREFIX = 'hchat:memory:'

export const MemoryStore = {
  async get(conversationId: string): Promise<MemoryEntry | null> {
    return Storage.get<MemoryEntry>(PREFIX + conversationId)
  },

  async set(conversationId: string, content: string): Promise<MemoryEntry> {
    const entry: MemoryEntry = { conversationId, content, updatedAt: Date.now() }
    await Storage.set(PREFIX + conversationId, entry)
    return entry
  },

  async append(conversationId: string, text: string): Promise<MemoryEntry> {
    const existing = await this.get(conversationId)
    const newContent = existing
      ? existing.content + '\n' + text
      : `# 대화 메모리\n\n${text}`
    return this.set(conversationId, newContent)
  },

  async list(): Promise<MemoryEntry[]> {
    const all = await Storage.getAll<MemoryEntry>(PREFIX)
    return Object.values(all).sort((a, b) => b.updatedAt - a.updatedAt)
  },

  async delete(conversationId: string): Promise<void> {
    await Storage.remove(PREFIX + conversationId)
  },

  async toSystemPrompt(conversationId: string): Promise<string> {
    const entry = await this.get(conversationId)
    if (!entry) return ''
    return `\n\n---\n# 이 대화에 대한 기억 (CLAUDE.md)\n${entry.content}\n---\n`
  },
}
