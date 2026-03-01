// lib/storage.ts
// chrome.storage.local 추상화 레이어
// localStorage 대신 이것을 사용 → 팝업 닫혀도 데이터 유지

export const Storage = {
  async get<T>(key: string): Promise<T | null> {
    const result = await chrome.storage.local.get(key)
    return result[key] ?? null
  },

  async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.local.set({ [key]: value })
  },

  async remove(key: string): Promise<void> {
    await chrome.storage.local.remove(key)
  },

  async getAll<T>(prefix: string): Promise<Record<string, T>> {
    const all = await chrome.storage.local.get(null)
    const filtered: Record<string, T> = {}
    for (const [k, v] of Object.entries(all)) {
      if (k.startsWith(prefix)) filtered[k] = v as T
    }
    return filtered
  },
}
