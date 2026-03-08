// widgets/sync-panel/SyncPanel.tsx — hchat-pwa 동기화 패널

import { useState, useEffect, useCallback } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import { useTemplateStore } from '@/entities/template/template.store'

interface Props {
  onClose: () => void
}

interface SyncData {
  model: string
  darkMode: boolean
  templates: unknown[]
  syncedAt: number
}

const SYNC_KEY = 'hchat:sync-settings'
const HCHAT_PWA_URL = 'https://hchat-desktop.vercel.app'

export function SyncPanel({ onClose }: Props) {
  const model = useConfigStore((s) => s.model)
  const darkMode = useConfigStore((s) => s.darkMode)
  const updateConfig = useConfigStore((s) => s.updateConfig)
  const templates = useTemplateStore((s) => s.templates)

  const [lastSync, setLastSync] = useState<number | null>(null)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [autoSync, setAutoSync] = useState(false)
  const [syncDirection, setSyncDirection] = useState<'upload' | 'download'>('upload')

  // 마지막 동기화 시간 로드
  const loadSyncStatus = useCallback(async () => {
    try {
      const result = await chrome.storage.sync.get(SYNC_KEY)
      const data = result[SYNC_KEY] as SyncData | undefined
      if (data?.syncedAt) {
        setLastSync(data.syncedAt)
      }
    } catch {
      // sync storage 사용 불가 시 무시
    }
  }, [])

  useEffect(() => {
    loadSyncStatus()
  }, [loadSyncStatus])

  // 업로드 동기화 (로컬 → sync)
  const handleUpload = async () => {
    setSyncStatus('syncing')
    try {
      const syncData: SyncData = {
        model,
        darkMode,
        templates: templates.map((t) => ({
          id: t.id,
          name: t.name,
          category: t.category,
          prompt: t.prompt,
          variables: t.variables,
          favorite: t.favorite,
        })),
        syncedAt: Date.now(),
      }
      await chrome.storage.sync.set({ [SYNC_KEY]: syncData })
      setLastSync(syncData.syncedAt)
      setSyncStatus('success')
      setTimeout(() => setSyncStatus('idle'), 2000)
    } catch {
      setSyncStatus('error')
      setTimeout(() => setSyncStatus('idle'), 3000)
    }
  }

  // 다운로드 동기화 (sync → 로컬)
  const handleDownload = async () => {
    setSyncStatus('syncing')
    try {
      const result = await chrome.storage.sync.get(SYNC_KEY)
      const data = result[SYNC_KEY] as SyncData | undefined
      if (!data) {
        setSyncStatus('error')
        setTimeout(() => setSyncStatus('idle'), 3000)
        return
      }
      await updateConfig({ model: data.model, darkMode: data.darkMode })
      setLastSync(data.syncedAt)
      setSyncStatus('success')
      setTimeout(() => setSyncStatus('idle'), 2000)
    } catch {
      setSyncStatus('error')
      setTimeout(() => setSyncStatus('idle'), 3000)
    }
  }

  const handleSync = () => {
    if (syncDirection === 'upload') handleUpload()
    else handleDownload()
  }

  // 자동 동기화 (설정 변경 시)
  useEffect(() => {
    if (!autoSync) return
    const timer = setTimeout(() => {
      handleUpload()
    }, 2000)
    return () => clearTimeout(timer)
  }, [model, darkMode, autoSync]) // eslint-disable-line react-hooks/exhaustive-deps

  const statusIcon = syncStatus === 'success'
    ? '&#10003;'
    : syncStatus === 'error'
      ? '&#10007;'
      : syncStatus === 'syncing'
        ? '&#8635;'
        : '&#9679;'

  const statusColor = syncStatus === 'success'
    ? 'var(--success)'
    : syncStatus === 'error'
      ? 'var(--danger)'
      : 'var(--text-tertiary)'

  return (
    <div className="sync-panel">
      <div className="sync-header">
        <button className="header-btn" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="sync-title">동기화</span>
      </div>

      {/* 상태 */}
      <div className="sync-status">
        <span
          className="sync-status-icon"
          style={{ color: statusColor }}
          dangerouslySetInnerHTML={{ __html: statusIcon }}
        />
        <div className="sync-status-text">
          {lastSync
            ? `마지막 동기화: ${new Date(lastSync).toLocaleString('ko-KR')}`
            : '동기화 이력 없음'}
        </div>
      </div>

      {/* 동기화 방향 */}
      <div className="sync-section">
        <div className="sync-section-title">동기화 방향</div>
        <div className="sync-direction-row">
          <button
            className={`sync-direction-btn ${syncDirection === 'upload' ? 'sync-direction-active' : ''}`}
            onClick={() => setSyncDirection('upload')}
          >
            Extension → Cloud
          </button>
          <button
            className={`sync-direction-btn ${syncDirection === 'download' ? 'sync-direction-active' : ''}`}
            onClick={() => setSyncDirection('download')}
          >
            Cloud → Extension
          </button>
        </div>
      </div>

      {/* 동기화 대상 */}
      <div className="sync-section">
        <div className="sync-section-title">동기화 대상</div>
        <div className="sync-targets">
          <div className="sync-target-item">
            <span className="sync-target-icon">&#9881;</span>
            <span>모델 설정</span>
            <span className="sync-target-value">{model.split('.').pop()?.split(':')[0]}</span>
          </div>
          <div className="sync-target-item">
            <span className="sync-target-icon">&#127769;</span>
            <span>다크 모드</span>
            <span className="sync-target-value">{darkMode ? 'ON' : 'OFF'}</span>
          </div>
          <div className="sync-target-item">
            <span className="sync-target-icon">&#128221;</span>
            <span>프롬프트 템플릿</span>
            <span className="sync-target-value">{templates.length}개</span>
          </div>
        </div>
        <div className="sync-note">
          chrome.storage.sync 사용 (100KB 제한, 설정만 동기화)
        </div>
      </div>

      {/* 동기화 버튼 */}
      <button
        className="btn-primary btn-full"
        onClick={handleSync}
        disabled={syncStatus === 'syncing'}
      >
        {syncStatus === 'syncing'
          ? '동기화 중...'
          : syncStatus === 'success'
            ? '동기화 완료!'
            : '지금 동기화'}
      </button>

      {/* 자동 동기화 */}
      <div className="sync-section">
        <div className="sync-auto-row">
          <span>자동 동기화</span>
          <button
            className={`toggle ${autoSync ? 'toggle-on' : ''}`}
            onClick={() => setAutoSync(!autoSync)}
          >
            <span className="toggle-knob" />
          </button>
        </div>
        <div className="sync-note">설정 변경 시 자동으로 Cloud에 업로드합니다</div>
      </div>

      {/* PWA 링크 */}
      <div className="sync-section">
        <div className="sync-section-title">H Chat PWA</div>
        <a
          href={HCHAT_PWA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="sync-pwa-link"
        >
          <span className="sync-pwa-icon">H</span>
          <div>
            <div className="sync-pwa-name">H Chat Desktop</div>
            <div className="sync-pwa-url">{HCHAT_PWA_URL}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>
    </div>
  )
}
