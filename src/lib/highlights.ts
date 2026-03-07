// lib/highlights.ts — 웹페이지 하이라이트 CRUD (chrome.storage 기반)

import { Storage } from './storage'
import { STORAGE_KEYS } from '@/shared/lib/storage-keys'

export interface Highlight {
  id: string
  text: string
  color: HighlightColor
  note: string
  url: string
  createdAt: number
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'red'

export const HIGHLIGHT_COLORS: Record<HighlightColor, string> = {
  yellow: '#FDE68A',
  green: '#86EFAC',
  blue: '#93C5FD',
  red: '#FCA5A5',
}

function storageKey(url: string): string {
  try {
    const parsed = new URL(url)
    return `${STORAGE_KEYS.HIGHLIGHTS_PREFIX}${parsed.hostname}${parsed.pathname}`
  } catch {
    return `${STORAGE_KEYS.HIGHLIGHTS_PREFIX}unknown`
  }
}

function generateId(): string {
  return `hl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const Highlights = {
  async list(url: string): Promise<Highlight[]> {
    const key = storageKey(url)
    return (await Storage.get<Highlight[]>(key)) ?? []
  },

  async listAll(): Promise<Highlight[]> {
    const all = await Storage.getAll<Highlight[]>(STORAGE_KEYS.HIGHLIGHTS_PREFIX)
    const items: Highlight[] = []
    for (const arr of Object.values(all)) {
      if (Array.isArray(arr)) items.push(...arr)
    }
    return items.sort((a, b) => b.createdAt - a.createdAt)
  },

  async add(url: string, text: string, color: HighlightColor, note = ''): Promise<Highlight> {
    const key = storageKey(url)
    const existing = (await Storage.get<Highlight[]>(key)) ?? []
    const item: Highlight = {
      id: generateId(),
      text,
      color,
      note,
      url,
      createdAt: Date.now(),
    }
    await Storage.set(key, [item, ...existing])
    return item
  },

  async updateNote(url: string, id: string, note: string): Promise<void> {
    const key = storageKey(url)
    const items = (await Storage.get<Highlight[]>(key)) ?? []
    const updated = items.map((h) => (h.id === id ? { ...h, note } : h))
    await Storage.set(key, updated)
  },

  async remove(url: string, id: string): Promise<void> {
    const key = storageKey(url)
    const items = (await Storage.get<Highlight[]>(key)) ?? []
    await Storage.set(key, items.filter((h) => h.id !== id))
  },

  exportMarkdown(items: Highlight[]): string {
    if (items.length === 0) return ''
    const lines = ['# Highlights', '']
    const grouped = new Map<string, Highlight[]>()
    for (const h of items) {
      const list = grouped.get(h.url) ?? []
      list.push(h)
      grouped.set(h.url, list)
    }
    for (const [url, highlights] of grouped) {
      lines.push(`## ${url}`, '')
      for (const h of highlights) {
        lines.push(`- > ${h.text}`)
        if (h.note) lines.push(`  - Note: ${h.note}`)
        lines.push('')
      }
    }
    return lines.join('\n')
  },
}
