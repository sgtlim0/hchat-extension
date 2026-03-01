// sidepanel/App.tsx  –  사이드패널 메인 앱
import { useState, useEffect, useCallback } from 'react'
import { ChatView } from '../components/ChatView'
import { MemoryPanel } from '../components/MemoryPanel'
import { SchedulerPanel } from '../components/SchedulerPanel'
import { SwarmPanel } from '../components/SwarmPanel'
import { SettingsView } from '../components/SettingsView'
import { useConfig } from '../hooks/useConfig'
import '../styles/global.css'

type Tab = 'chat' | 'memory' | 'scheduler' | 'swarm'

const CONV_ID = 'hchat-main'

const tabs: { id: Tab; label: string }[] = [
  { id: 'chat', label: '채팅' },
  { id: 'memory', label: '메모리' },
  { id: 'scheduler', label: '스케줄' },
  { id: 'swarm', label: 'Swarms' },
]

export function App() {
  const [tab, setTab] = useState<Tab>('chat')
  const [showSettings, setShowSettings] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [pendingPrompt, setPendingPrompt] = useState('')
  const { config, loaded } = useConfig()

  useEffect(() => {
    chrome.storage.local.get('hchat:config:darkMode', (r) => {
      const isDark = !!r['hchat:config:darkMode']
      setDarkMode(isDark)
      document.documentElement.classList.toggle('dark', isDark)
    })
  }, [])

  // FAB/Popup에서 보낸 pending prompt 감지
  const checkPendingPrompt = useCallback(() => {
    chrome.storage.local.get('hchat:fab-pending', (r) => {
      const pending = r['hchat:fab-pending']
      if (!pending?.text) return

      // 5초 이내의 pending만 처리
      if (Date.now() - pending.ts > 5000) {
        chrome.storage.local.remove('hchat:fab-pending')
        return
      }

      setPendingPrompt(pending.text)
      setTab('chat')
      setShowSettings(false)
      chrome.storage.local.remove('hchat:fab-pending')
    })
  }, [])

  useEffect(() => {
    // 초기 로드 시 체크
    checkPendingPrompt()

    // storage 변경 감지 (FAB에서 새 prompt가 들어올 때)
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes['hchat:fab-pending']?.newValue) {
        checkPendingPrompt()
      }
    }
    chrome.storage.local.onChanged.addListener(listener)
    return () => chrome.storage.local.onChanged.removeListener(listener)
  }, [checkPendingPrompt])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    chrome.storage.local.set({ 'hchat:config:darkMode': darkMode })
  }, [darkMode])

  if (!loaded) {
    return (
      <div className="app" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>로딩 중...</div>
      </div>
    )
  }

  const hasCredentials = !!(config.awsAccessKeyId && config.awsSecretAccessKey)

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
          <SettingsView darkMode={darkMode} onToggleDarkMode={() => setDarkMode((d) => !d)} />
        </div>
      </div>
    )
  }

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

      <div className="content" style={tab === 'chat' ? { display: 'flex', flexDirection: 'column' } : {}}>
        {tab === 'chat' && (
          <ChatView
            conversationId={CONV_ID}
            config={config}
            pendingPrompt={pendingPrompt}
            onPendingConsumed={() => setPendingPrompt('')}
          />
        )}
        {tab === 'memory' && <MemoryPanel conversationId={CONV_ID} />}
        {tab === 'scheduler' && <SchedulerPanel conversationId={CONV_ID} />}
        {tab === 'swarm' && <SwarmPanel config={config} />}
      </div>
    </div>
  )
}
