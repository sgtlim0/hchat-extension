// sidepanel/App.tsx — 사이드패널 메인 앱 (Zustand + 멀티 세션)

import { useState, useEffect, useCallback } from 'react'
import { useSessionStore } from '@/entities/session/session.store'
import { useConfigStore } from '@/entities/config/config.store'
import { ChatView } from '../components/ChatView'
import { MemoryPanel } from '../components/MemoryPanel'
import { SchedulerPanel } from '../components/SchedulerPanel'
import { SwarmPanel } from '../components/SwarmPanel'
import { SettingsView } from '../components/SettingsView'
import { SessionList } from '@/widgets/session-list/SessionList'
import { SearchPanel } from '@/widgets/search-panel/SearchPanel'
import { ExportModal } from '@/widgets/export-modal/ExportModal'
import { STORAGE_KEYS } from '@/shared/lib/storage-keys'
import type { PendingPrompt } from '@/shared/types/chrome-messages'
import '../styles/global.css'

type Tab = 'chat' | 'memory' | 'scheduler' | 'swarm'

const tabs: { id: Tab; label: string }[] = [
  { id: 'chat', label: '채팅' },
  { id: 'memory', label: '메모리' },
  { id: 'scheduler', label: '스케줄' },
  { id: 'swarm', label: 'Swarms' },
]

export function App() {
  const [tab, setTab] = useState<Tab>('chat')
  const [showSettings, setShowSettings] = useState(false)
  const [showSessions, setShowSessions] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [pendingPrompt, setPendingPrompt] = useState('')

  // Zustand stores
  const view = useSessionStore((s) => s.view)
  const setView = useSessionStore((s) => s.setView)
  const hydrateSession = useSessionStore((s) => s.hydrate)
  const currentSessionId = useSessionStore((s) => s.currentSessionId)
  const createSession = useSessionStore((s) => s.createSession)

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
    triggerWord: s.triggerWord,
  }))
  const darkMode = useConfigStore((s) => s.darkMode)
  const loaded = useConfigStore((s) => s.loaded)
  const hydrateConfig = useConfigStore((s) => s.hydrate)
  const updateConfig = useConfigStore((s) => s.updateConfig)

  // Hydration
  useEffect(() => {
    Promise.all([hydrateConfig(), hydrateSession()])
  }, [hydrateConfig, hydrateSession])

  // FAB/Popup pending prompt 감지
  const checkPendingPrompt = useCallback(() => {
    chrome.storage.local.get(STORAGE_KEYS.PENDING_PROMPT, (r) => {
      const pending = r[STORAGE_KEYS.PENDING_PROMPT] as PendingPrompt | undefined
      if (!pending?.text) return
      if (Date.now() - pending.ts > 5000) {
        chrome.storage.local.remove(STORAGE_KEYS.PENDING_PROMPT)
        return
      }
      setPendingPrompt(pending.text)
      setTab('chat')
      setShowSettings(false)
      setShowSessions(false)
      setView('chat')
      chrome.storage.local.remove(STORAGE_KEYS.PENDING_PROMPT)
    })
  }, [setView])

  useEffect(() => {
    checkPendingPrompt()
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes[STORAGE_KEYS.PENDING_PROMPT]?.newValue) checkPendingPrompt()
    }
    chrome.storage.local.onChanged.addListener(listener)
    return () => chrome.storage.local.onChanged.removeListener(listener)
  }, [checkPendingPrompt])

  // 슬래시 명령어 액션 핸들러
  const handleCommandAction = useCallback((action: string) => {
    if (action === 'new-session') createSession()
    if (action === 'search') setView('search')
    if (action === 'export') setShowExport(true)
  }, [createSession, setView])

  if (!loaded) {
    return (
      <div className="app" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>로딩 중...</div>
      </div>
    )
  }

  const hasCredentials = !!(config.awsAccessKeyId && config.awsSecretAccessKey)

  // 자격증명 미설정 시
  if (!hasCredentials && !showSettings) {
    return (
      <div className="app">
        <div className="header">
          <div className="header-logo">H</div>
          <span className="header-title">H Chat</span>
          <div className="header-spacer" />
          <button className="header-btn" onClick={() => setShowSettings(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
        <div className="divider" />
        <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="empty-state">
            <div className="chat-empty-logo">H</div>
            <p style={{ fontSize: 14, fontWeight: 600 }}>H Chat에 오신 것을 환영합니다</p>
            <p className="empty-sub" style={{ fontSize: 12 }}>시작하려면 AWS Bedrock 자격증명을 설정하세요</p>
            <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => setShowSettings(true)}>
              AWS 설정하기
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 설정 화면
  if (showSettings) {
    return (
      <div className="app">
        <div className="header">
          <button className="header-btn" onClick={() => setShowSettings(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <span className="header-title">설정</span>
        </div>
        <div className="divider" />
        <div className="content">
          <SettingsView
            darkMode={darkMode}
            onToggleDarkMode={() => updateConfig({ darkMode: !darkMode })}
          />
        </div>
      </div>
    )
  }

  // 검색 뷰
  if (view === 'search') {
    return (
      <div className="app">
        <div className="content">
          <SearchPanel />
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <button className="header-btn" onClick={() => setShowSessions(!showSessions)} title="대화 목록">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="header-title">H Chat</span>
        <div className="header-spacer" />
        <button className="header-btn" onClick={() => setView('search')} title="검색">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
        <button className="header-btn" onClick={() => setShowSettings(true)} title="설정">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Session List Overlay */}
      {showSessions && (
        <div className="session-overlay" onClick={() => setShowSessions(false)}>
          <div className="session-drawer" onClick={(e) => e.stopPropagation()}>
            <SessionList />
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="tab-bar">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab-pill ${tab === t.id ? 'tab-pill-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="divider" />

      {/* Content */}
      <div className="content" style={tab === 'chat' ? { display: 'flex', flexDirection: 'column' } : {}}>
        {tab === 'chat' && currentSessionId && (
          <ChatView
            conversationId={currentSessionId}
            config={config}
            pendingPrompt={pendingPrompt}
            onPendingConsumed={() => setPendingPrompt('')}
            onCommandAction={handleCommandAction}
          />
        )}
        {tab === 'memory' && currentSessionId && <MemoryPanel conversationId={currentSessionId} />}
        {tab === 'scheduler' && currentSessionId && <SchedulerPanel conversationId={currentSessionId} />}
        {tab === 'swarm' && <SwarmPanel config={config} />}
      </div>

      {/* Export Modal */}
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </div>
  )
}
