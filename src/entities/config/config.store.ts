// entities/config/config.store.ts — 설정 Zustand 스토어

import { create } from 'zustand'
import { Storage } from '@/lib/storage'
import { STORAGE_KEYS } from '@/shared/lib/storage-keys'

export interface ConfigState {
  awsAccessKeyId: string
  awsSecretAccessKey: string
  awsRegion: string
  model: string
  darkMode: boolean
  triggerWord: string
  loaded: boolean

  updateConfig: (patch: Partial<Omit<ConfigState, 'loaded' | 'updateConfig' | 'hydrate'>>) => Promise<void>
  hydrate: () => Promise<void>
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  awsAccessKeyId: '',
  awsSecretAccessKey: '',
  awsRegion: 'us-east-1',
  model: 'us.anthropic.claude-sonnet-4-6',
  darkMode: false,
  triggerWord: '@H',
  loaded: false,

  updateConfig: async (patch) => {
    set(patch)
    const s = get()
    const data = {
      awsAccessKeyId: s.awsAccessKeyId,
      awsSecretAccessKey: s.awsSecretAccessKey,
      awsRegion: s.awsRegion,
      model: s.model,
      darkMode: s.darkMode,
      triggerWord: s.triggerWord,
    }
    await Storage.set(STORAGE_KEYS.CONFIG, data)

    // Background SW용 별도 저장
    if (
      patch.awsAccessKeyId !== undefined ||
      patch.awsSecretAccessKey !== undefined ||
      patch.awsRegion !== undefined
    ) {
      await Storage.set(STORAGE_KEYS.CONFIG_AWS, {
        awsAccessKeyId: s.awsAccessKeyId,
        awsSecretAccessKey: s.awsSecretAccessKey,
        awsRegion: s.awsRegion,
      })
    }

    if (patch.darkMode !== undefined) {
      document.documentElement.classList.toggle('dark', s.darkMode)
      await Storage.set(STORAGE_KEYS.CONFIG_DARK_MODE, s.darkMode)
    }
  },

  hydrate: async () => {
    const saved = await Storage.get<{
      awsAccessKeyId: string
      awsSecretAccessKey: string
      awsRegion: string
      model: string
      darkMode: boolean
      triggerWord: string
    }>(STORAGE_KEYS.CONFIG)

    if (saved) {
      set({ ...saved, loaded: true })
      document.documentElement.classList.toggle('dark', !!saved.darkMode)
    } else {
      set({ loaded: true })
    }
  },
}))
