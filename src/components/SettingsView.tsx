// components/SettingsView.tsx
import { useState } from 'react'
import { useConfig } from '../hooks/useConfig'
import { signRequest } from '../lib/aws-sigv4'

interface SettingsViewProps {
  darkMode: boolean
  onToggleDarkMode: () => void
  onOpenProviders?: () => void
}

export function SettingsView({ darkMode, onToggleDarkMode, onOpenProviders }: SettingsViewProps) {
  const { config, updateConfig } = useConfig()
  const [saved, setSaved] = useState(false)
  const [draft, setDraft] = useState({ ...config })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [showSecretKey, setShowSecretKey] = useState(false)

  const handleSave = async () => {
    await updateConfig(draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    if (!draft.awsAccessKeyId || !draft.awsSecretAccessKey) return
    setTesting(true)
    setTestResult(null)
    try {
      const region = draft.awsRegion || 'us-east-1'
      const model = draft.model || 'us.anthropic.claude-sonnet-4-6'
      const bodyStr = JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      })
      const encodedModel = encodeURIComponent(model)
      const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodedModel}/invoke`

      const signedHeaders = await signRequest({
        method: 'POST',
        url,
        headers: { 'content-type': 'application/json' },
        body: bodyStr,
        accessKeyId: draft.awsAccessKeyId,
        secretAccessKey: draft.awsSecretAccessKey,
        region,
        service: 'bedrock',
      })

      const resp = await fetch(url, {
        method: 'POST',
        headers: signedHeaders,
        body: bodyStr,
      })
      setTestResult(resp.ok ? 'success' : 'error')
    } catch {
      setTestResult('error')
    } finally {
      setTesting(false)
    }
  }

  const models = [
    { id: 'us.anthropic.claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (권장)' },
    { id: 'us.anthropic.claude-opus-4-6-v1', label: 'Claude Opus 4.6 (최고 성능)' },
    { id: 'us.anthropic.claude-haiku-4-5-20251001-v1:0', label: 'Claude Haiku 4.5 (빠름)' },
  ]

  return (
    <div className="settings-view">
      {/* AWS Credentials */}
      <div className="settings-section">
        <div className="settings-label">AWS BEDROCK 자격증명</div>
        <input
          className="field-input"
          type="text"
          placeholder="AWS_ACCESS_KEY_ID"
          value={draft.awsAccessKeyId}
          onChange={(e) => setDraft({ ...draft, awsAccessKeyId: e.target.value })}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
        />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            className="field-input"
            type={showSecretKey ? 'text' : 'password'}
            placeholder="AWS_SECRET_ACCESS_KEY"
            value={draft.awsSecretAccessKey}
            onChange={(e) => setDraft({ ...draft, awsSecretAccessKey: e.target.value })}
            style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 11 }}
          />
          <button className="btn-ghost btn-xs" onClick={() => setShowSecretKey(!showSecretKey)}>
            {showSecretKey ? '숨김' : '표시'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            className="field-input"
            type="text"
            placeholder="us-east-1"
            value={draft.awsRegion}
            onChange={(e) => setDraft({ ...draft, awsRegion: e.target.value })}
            style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 11 }}
          />
          <button
            className="btn-test"
            onClick={handleTest}
            disabled={testing || !draft.awsAccessKeyId || !draft.awsSecretAccessKey}
            style={{ opacity: testing ? 0.6 : 1 }}
          >
            {testing ? '...' : testResult === 'success' ? '✓ 연결됨' : '테스트'}
          </button>
        </div>
        {testResult === 'error' && (
          <div className="settings-hint" style={{ color: 'var(--danger)' }}>
            연결 실패 - 자격증명과 리전을 확인하세요
          </div>
        )}
        <div className="settings-hint">
          AWS IAM에서 Bedrock 접근 권한이 있는 키를 사용하세요
        </div>
      </div>

      {/* Model */}
      <div className="settings-section">
        <div className="settings-row">
          <div className="settings-row-icon settings-row-icon-purple">✨</div>
          <div className="settings-row-content">
            <div className="settings-row-label">기본 모델</div>
          </div>
        </div>
        <select
          className="field-select"
          value={draft.model}
          onChange={(e) => setDraft({ ...draft, model: e.target.value })}
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Provider Management Link */}
      {onOpenProviders && (
        <div className="settings-section">
          <button
            className="btn-ghost btn-full"
            onClick={onOpenProviders}
            style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span style={{ fontSize: 14 }}>&#9889;</span>
            <span>프로바이더 관리 (OpenAI, Gemini)</span>
            <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }}>&gt;</span>
          </button>
        </div>
      )}

      {/* Save Button */}
      <button
        className={`btn-primary btn-full ${saved ? 'btn-saved' : ''}`}
        onClick={handleSave}
      >
        {saved ? '✓ 저장됨' : '설정 저장'}
      </button>

      <div className="settings-divider" />

      {/* Dark Mode */}
      <div className="settings-section">
        <div className="settings-row">
          <div className="settings-row-icon settings-row-icon-blue">🌙</div>
          <div className="settings-row-content">
            <div className="settings-row-label">다크 모드</div>
          </div>
          <button className={`toggle ${darkMode ? 'toggle-on' : ''}`} onClick={onToggleDarkMode}>
            <span className="toggle-knob" />
          </button>
        </div>
      </div>

      {/* Language */}
      <div className="settings-section">
        <div className="settings-row">
          <div className="settings-row-icon settings-row-icon-green">🌐</div>
          <div className="settings-row-content">
            <div className="settings-row-label">언어</div>
            <div className="settings-row-desc">한국어</div>
          </div>
        </div>
      </div>

      <div className="settings-divider" />

      {/* About */}
      <div className="settings-about">
        <div className="about-logo">H</div>
        <div>
          <div className="about-name">H Chat Extension</div>
          <div className="about-version">v1.0.0 · AWS Bedrock</div>
        </div>
      </div>
    </div>
  )
}
