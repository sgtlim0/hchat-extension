// hooks/useMemory.ts
import { useState, useCallback, useEffect } from 'react'
import { MemoryStore, type MemoryEntry } from '../lib/memory'

export function useMemory(conversationId: string) {
  const [entry, setEntry] = useState<MemoryEntry | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const e = await MemoryStore.get(conversationId)
    setEntry(e)
    setLoading(false)
  }, [conversationId])

  useEffect(() => { refresh() }, [refresh])

  const update = useCallback(async (content: string) => {
    const updated = await MemoryStore.set(conversationId, content)
    setEntry(updated)
  }, [conversationId])

  const append = useCallback(async (text: string) => {
    const updated = await MemoryStore.append(conversationId, text)
    setEntry(updated)
  }, [conversationId])

  const clear = useCallback(async () => {
    await MemoryStore.delete(conversationId)
    setEntry(null)
  }, [conversationId])

  return { entry, loading, update, append, clear, refresh }
}
