// lib/code-vault.ts — Code Vault CRUD (chrome.storage)

import { Storage } from './storage'
import { STORAGE_KEYS } from '@/shared/lib/storage-keys'

export interface Snippet {
  id: string
  code: string
  language: string
  title: string
  tags: string[]
  description: string
  url: string
  createdAt: number
}

interface VaultData {
  snippets: Snippet[]
}

async function load(): Promise<Snippet[]> {
  const data = await Storage.get<VaultData>(STORAGE_KEYS.CODE_VAULT)
  return data?.snippets ?? []
}

async function save(snippets: Snippet[]): Promise<void> {
  await Storage.set<VaultData>(STORAGE_KEYS.CODE_VAULT, { snippets })
}

export const CodeVault = {
  list: load,

  add: async (
    data: Omit<Snippet, 'id' | 'createdAt'>
  ): Promise<Snippet[]> => {
    const snippets = await load()
    const snippet: Snippet = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    }
    const updated = [snippet, ...snippets]
    await save(updated)
    return updated
  },

  update: async (
    id: string,
    patch: Partial<Omit<Snippet, 'id' | 'createdAt'>>
  ): Promise<Snippet[]> => {
    const snippets = await load()
    const updated = snippets.map((s) =>
      s.id === id ? { ...s, ...patch } : s
    )
    await save(updated)
    return updated
  },

  remove: async (id: string): Promise<Snippet[]> => {
    const snippets = await load()
    const updated = snippets.filter((s) => s.id !== id)
    await save(updated)
    return updated
  },

  clear: async (): Promise<void> => {
    await save([])
  },
}
