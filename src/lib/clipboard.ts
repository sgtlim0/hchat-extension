// lib/clipboard.ts — 클립보드 히스토리 관리 (chrome.storage 기반)

import { Storage } from './storage'
import { STORAGE_KEYS } from '@/shared/lib/storage-keys'

export interface ClipboardItem {
  id: string
  text: string
  createdAt: number
  processed?: {
    type: 'summary' | 'translate' | 'cleanup'
    result: string
  }
}

const MAX_ITEMS = 10

function generateId(): string {
  return `cb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const ClipboardHistory = {
  async list(): Promise<ClipboardItem[]> {
    return (await Storage.get<ClipboardItem[]>(STORAGE_KEYS.CLIPBOARD_HISTORY)) ?? []
  },

  async add(text: string): Promise<ClipboardItem[]> {
    const items = await this.list()
    // 중복 텍스트 제거
    const filtered = items.filter((i) => i.text !== text)
    const newItem: ClipboardItem = {
      id: generateId(),
      text,
      createdAt: Date.now(),
    }
    const updated = [newItem, ...filtered].slice(0, MAX_ITEMS)
    await Storage.set(STORAGE_KEYS.CLIPBOARD_HISTORY, updated)
    return updated
  },

  async updateProcessed(
    id: string,
    processed: { type: 'summary' | 'translate' | 'cleanup'; result: string }
  ): Promise<ClipboardItem[]> {
    const items = await this.list()
    const updated = items.map((i) => (i.id === id ? { ...i, processed } : i))
    await Storage.set(STORAGE_KEYS.CLIPBOARD_HISTORY, updated)
    return updated
  },

  async remove(id: string): Promise<ClipboardItem[]> {
    const items = await this.list()
    const updated = items.filter((i) => i.id !== id)
    await Storage.set(STORAGE_KEYS.CLIPBOARD_HISTORY, updated)
    return updated
  },

  async clear(): Promise<void> {
    await Storage.set(STORAGE_KEYS.CLIPBOARD_HISTORY, [])
  },
}
