// lib/watcher.ts — 실시간 웹페이지 감시 (Page Watcher) CRUD + storage

import { Storage } from './storage'
import { STORAGE_KEYS } from '@/shared/lib/storage-keys'

export interface WatchTarget {
  id: string
  url: string
  selector?: string
  interval: number // minutes
  lastContent: string
  lastChecked: number
  enabled: boolean
  label: string
  changed: boolean
  diff?: string
}

const key = () => STORAGE_KEYS.WATCHERS

function genId(): string {
  return `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const Watcher = {
  async list(): Promise<WatchTarget[]> {
    return (await Storage.get<WatchTarget[]>(key())) ?? []
  },

  async add(target: Omit<WatchTarget, 'id' | 'lastContent' | 'lastChecked' | 'changed' | 'diff'>): Promise<WatchTarget> {
    const items = await this.list()
    const newTarget: WatchTarget = {
      ...target,
      id: genId(),
      lastContent: '',
      lastChecked: 0,
      changed: false,
    }
    await Storage.set(key(), [...items, newTarget])
    return newTarget
  },

  async update(id: string, patch: Partial<WatchTarget>): Promise<void> {
    const items = await this.list()
    const updated = items.map((t) => (t.id === id ? { ...t, ...patch } : t))
    await Storage.set(key(), updated)
  },

  async remove(id: string): Promise<void> {
    const items = await this.list()
    await Storage.set(key(), items.filter((t) => t.id !== id))
  },

  async markChecked(id: string, content: string, changed: boolean, diff?: string): Promise<void> {
    await this.update(id, {
      lastContent: content,
      lastChecked: Date.now(),
      changed,
      diff,
    })
  },
}
