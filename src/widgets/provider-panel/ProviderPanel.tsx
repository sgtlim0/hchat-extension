// widgets/provider-panel/ProviderPanel.tsx — 멀티 프로바이더 관리 패널

import { useState, useEffect } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import {
  createBedrockProvider,
  createOpenAIProvider,
  createGeminiProvider,
} from '@/lib/providers'
import type { Provider } from '@/lib/providers'

interface Props {
  onClose: () => void
}

type ProviderId = 'bedrock' | 'openai' | 'gemini'

interface ProviderStatus {
  testing: boolean
  result: 'success' | 'error' | null
}

export function ProviderPanel({ onClose }: Props) {
  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
    openaiApiKey: s.openaiApiKey,
    geminiApiKey: s.geminiApiKey,
    defaultProvider: s.defaultProvider,
  }))
  const updateConfig = useConfigStore((s) => s.updateConfig)

  const [openaiKey, setOpenaiKey] = useState(config.openaiApiKey ?? '')
  const [geminiKey, setGeminiKey] = useState(config.geminiApiKey ?? '')
  const [statuses, setStatuses] = useState<Record<ProviderId, ProviderStatus>>({
    bedrock: { testing: false, result: null },
    openai: { testing: false, result: null },
    gemini: { testing: false, result: null },
  })
  const [showKeys, setShowKeys] = useState<Record<ProviderId, boolean>>({
    bedrock: false,
    openai: false,
    gemini: false,
  })

  useEffect(() => {
    setOpenaiKey(config.openaiApiKey ?? '')
    setGeminiKey(config.geminiApiKey ?? '')
  }, [config.openaiApiKey, config.geminiApiKey])

  const getProvider = (id: ProviderId): Provider | null => {
    if (id === 'bedrock' && config.awsAccessKeyId && config.awsSecretAccessKey) {
      return createBedrockProvider({
        awsAccessKeyId: config.awsAccessKeyId,
        awsSecretAccessKey: config.awsSecretAccessKey,
        awsRegion: config.awsRegion,
      })
    }
    if (id === 'openai' && openaiKey) {
      return createOpenAIProvider(openaiKey)
    }
    if (id === 'gemini' && geminiKey) {
      return createGeminiProvider(geminiKey)
    }
    return null
  }

  const handleTest = async (id: ProviderId) => {
    const provider = getProvider(id)
    if (!provider) return

    setStatuses((prev) => ({
      ...prev,
      [id]: { testing: true, result: null },
    }))

    try {
      const ok = await provider.testConnection()
      setStatuses((prev) => ({
        ...prev,
        [id]: { testing: false, result: ok ? 'success' : 'error' },
      }))
    } catch {
      setStatuses((prev) => ({
        ...prev,
        [id]: { testing: false, result: 'error' },
      }))
    }
  }

  const handleSaveKeys = async () => {
    await updateConfig({
      openaiApiKey: openaiKey,
      geminiApiKey: geminiKey,
    })
  }

  const handleSetDefault = async (id: ProviderId) => {
    await updateConfig({ defaultProvider: id })
  }

  const providers: {
    id: ProviderId
    name: string
    icon: string
    configured: boolean
    models: { id: string; name: string }[]
  }[] = [
    {
      id: 'bedrock',
      name: 'AWS Bedrock',
      icon: 'B',
      configured: !!(config.awsAccessKeyId && config.awsSecretAccessKey),
      models: [
        { id: 'us.anthropic.claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
        { id: 'us.anthropic.claude-opus-4-6-v1', name: 'Claude Opus 4.6' },
        { id: 'us.anthropic.claude-haiku-4-5-20251001-v1:0', name: 'Claude Haiku 4.5' },
      ],
    },
    {
      id: 'openai',
      name: 'OpenAI',
      icon: 'O',
      configured: !!openaiKey,
      models: [
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'gpt-4o-mini', name: 'GPT-4o mini' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
        { id: 'o3-mini', name: 'o3-mini' },
      ],
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      icon: 'G',
      configured: !!geminiKey,
      models: [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      ],
    },
  ]

  return (
    <div className="provider-panel">
      <div className="provider-header">
        <button className="header-btn" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="provider-title">프로바이더 관리</span>
      </div>

      <div className="provider-list">
        {providers.map((p) => {
          const status = statuses[p.id]
          const isDefault = (config.defaultProvider ?? 'bedrock') === p.id
          return (
            <div key={p.id} className="provider-card">
              <div className="provider-card-top">
                <span className={`provider-icon provider-icon-${p.id}`}>{p.icon}</span>
                <div className="provider-card-info">
                  <div className="provider-card-name">{p.name}</div>
                  <div className="provider-card-status">
                    {p.configured ? (
                      <span style={{ color: 'var(--success)', fontSize: 11 }}>&#9679; 설정됨</span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>&#9679; 미설정</span>
                    )}
                    {isDefault && (
                      <span className="provider-default-badge">기본</span>
                    )}
                  </div>
                </div>
                <div className="provider-card-actions">
                  {!isDefault && p.configured && (
                    <button className="btn-ghost btn-xs" onClick={() => handleSetDefault(p.id)}>
                      기본 설정
                    </button>
                  )}
                  <button
                    className="btn-test"
                    onClick={() => handleTest(p.id)}
                    disabled={!p.configured || status.testing}
                  >
                    {status.testing
                      ? '...'
                      : status.result === 'success'
                        ? '&#10003;'
                        : '테스트'}
                  </button>
                </div>
              </div>

              {/* API Key Input */}
              {p.id === 'openai' && (
                <div className="provider-key-row">
                  <input
                    className="field-input"
                    type={showKeys.openai ? 'text' : 'password'}
                    placeholder="sk-..."
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 11 }}
                  />
                  <button className="btn-ghost btn-xs" onClick={() => setShowKeys((s) => ({ ...s, openai: !s.openai }))}>
                    {showKeys.openai ? '숨김' : '표시'}
                  </button>
                </div>
              )}
              {p.id === 'gemini' && (
                <div className="provider-key-row">
                  <input
                    className="field-input"
                    type={showKeys.gemini ? 'text' : 'password'}
                    placeholder="AIza..."
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 11 }}
                  />
                  <button className="btn-ghost btn-xs" onClick={() => setShowKeys((s) => ({ ...s, gemini: !s.gemini }))}>
                    {showKeys.gemini ? '숨김' : '표시'}
                  </button>
                </div>
              )}

              {status.result === 'error' && (
                <div className="provider-error">연결 실패 - API 키를 확인하세요</div>
              )}

              {/* 모델 목록 */}
              <div className="provider-models">
                {p.models.map((m) => (
                  <div key={m.id} className="provider-model-item">
                    <span className="provider-model-dot">&#8226;</span>
                    <span>{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* 저장 버튼 */}
      <button className="btn-primary btn-full" onClick={handleSaveKeys}>
        API 키 저장
      </button>
    </div>
  )
}
