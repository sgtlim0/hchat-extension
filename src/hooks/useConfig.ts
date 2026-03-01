// hooks/useConfig.ts
import { useState, useEffect, useCallback } from 'react'
import { Storage } from '../lib/storage'

export interface Config {
  awsAccessKeyId: string
  awsSecretAccessKey: string
  awsRegion: string
  model: string
  triggerWord: string
}

const DEFAULT_CONFIG: Config = {
  awsAccessKeyId: '',
  awsSecretAccessKey: '',
  awsRegion: 'us-east-1',
  model: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  triggerWord: '@H',
}

export function useConfig() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Storage.get<Config>('hchat:config').then((saved) => {
      if (saved) setConfig({ ...DEFAULT_CONFIG, ...saved })
      setLoaded(true)
    })
  }, [])

  const updateConfig = useCallback(async (patch: Partial<Config>) => {
    const updated = { ...config, ...patch }
    setConfig(updated)
    await Storage.set('hchat:config', updated)
    // AWS 자격증명 별도 저장 (background SW용)
    if (patch.awsAccessKeyId !== undefined || patch.awsSecretAccessKey !== undefined || patch.awsRegion !== undefined) {
      await Storage.set('hchat:config:aws', {
        awsAccessKeyId: updated.awsAccessKeyId,
        awsSecretAccessKey: updated.awsSecretAccessKey,
        awsRegion: updated.awsRegion,
      })
    }
  }, [config])

  return { config, updateConfig, loaded }
}
