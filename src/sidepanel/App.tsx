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
import { HighlightPanel } from '@/widgets/highlight-panel/HighlightPanel'
import { ReadingMode } from '@/widgets/reading-mode/ReadingMode'
import { TranslatePanel } from '@/widgets/translate-panel/TranslatePanel'
import { ClipboardPanel } from '@/widgets/clipboard-panel/ClipboardPanel'
import { YouTubePanel } from '@/widgets/youtube-panel/YouTubePanel'
import { EmailPanel } from '@/widgets/email-panel/EmailPanel'
import { CodeReviewPanel } from '@/widgets/code-review-panel/CodeReviewPanel'
import { PdfPanel } from '@/widgets/pdf-panel/PdfPanel'
import { SocialPanel } from '@/widgets/social-panel/SocialPanel'
import { ScreenshotPanel } from '@/widgets/screenshot-panel/ScreenshotPanel'
import { VoicePanel } from '@/widgets/voice-panel/VoicePanel'
import { ChainPanel } from '@/widgets/chain-panel/ChainPanel'
import { KnowledgePanel } from '@/widgets/knowledge-panel/KnowledgePanel'
import { AgentPanel } from '@/widgets/agent-panel/AgentPanel'
import { UsagePanel } from '@/widgets/usage-panel/UsagePanel'
import { AuditPanel } from '@/widgets/audit-panel/AuditPanel'
import { SyncPanel } from '@/widgets/sync-panel/SyncPanel'
import { TemplatePanel } from '@/widgets/template-panel/TemplatePanel'
import { ProviderPanel } from '@/widgets/provider-panel/ProviderPanel'
import { WatcherPanel } from '@/widgets/watcher-panel/WatcherPanel'
import { MiniWidgets } from '@/widgets/mini-widgets/MiniWidgets'
import { TabOrganizer } from '@/widgets/tab-organizer/TabOrganizer'
import { DigestPanel } from '@/widgets/digest-panel/DigestPanel'
import { TutorPanel } from '@/widgets/tutor-panel/TutorPanel'
import { useUsageStore } from '@/entities/usage/usage.store'
import { useAuditStore } from '@/entities/audit/audit.store'
import { useTemplateStore } from '@/entities/template/template.store'
import { STORAGE_KEYS } from '@/shared/lib/storage-keys'
import type { PendingPrompt } from '@/shared/types/chrome-messages'
import '../styles/global.css'

type Tab = 'chat' | 'memory' | 'scheduler' | 'swarm'
type ToolView = 'highlight' | 'reading' | 'translate' | 'clipboard' | 'youtube' | 'email' | 'codeReview' | 'pdf' | 'social' | 'screenshot' | 'voice' | 'chain' | 'knowledge' | 'agentTool' | 'usage' | 'audit' | 'sync' | 'templates' | 'providers' | 'watcher' | 'miniWidgets' | 'tabOrganizer' | 'digest' | 'tutor' | null

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
  const [toolView, setToolView] = useState<ToolView>(null)
  const [showMore, setShowMore] = useState(false)

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

  const hydrateUsage = useUsageStore((s) => s.hydrate)
  const hydrateAudit = useAuditStore((s) => s.hydrate)
  const hydrateTemplates = useTemplateStore((s) => s.hydrate)

  // Hydration
  useEffect(() => {
    Promise.all([hydrateConfig(), hydrateSession(), hydrateUsage(), hydrateAudit(), hydrateTemplates()])
  }, [hydrateConfig, hydrateSession, hydrateUsage, hydrateAudit, hydrateTemplates])

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

  // 사이드패널 내 키보드 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'n') {
        e.preventDefault()
        createSession()
      }
      if (mod && e.key === 'f') {
        e.preventDefault()
        setView('search')
      }
      if (e.key === 'Escape') {
        if (showMore) { setShowMore(false); return }
        if (toolView) { setToolView(null); return }
        if (showSettings) { setShowSettings(false); return }
        if (showSessions) { setShowSessions(false); return }
        if (showExport) { setShowExport(false); return }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [createSession, setView, toolView, showMore, showSettings, showSessions, showExport])

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
            onOpenProviders={() => { setShowSettings(false); setToolView('providers') }}
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

  // 도구 뷰 (highlight, reading, translate, clipboard)
  if (toolView) {
    return (
      <div className="app">
        <div className="content">
          {toolView === 'highlight' && <HighlightPanel onClose={() => setToolView(null)} />}
          {toolView === 'reading' && <ReadingMode onClose={() => setToolView(null)} />}
          {toolView === 'translate' && <TranslatePanel onClose={() => setToolView(null)} />}
          {toolView === 'clipboard' && <ClipboardPanel onClose={() => setToolView(null)} />}
          {toolView === 'youtube' && <YouTubePanel onClose={() => setToolView(null)} />}
          {toolView === 'email' && <EmailPanel onClose={() => setToolView(null)} />}
          {toolView === 'codeReview' && <CodeReviewPanel onClose={() => setToolView(null)} />}
          {toolView === 'pdf' && <PdfPanel onClose={() => setToolView(null)} />}
          {toolView === 'social' && <SocialPanel onClose={() => setToolView(null)} />}
          {toolView === 'screenshot' && <ScreenshotPanel onClose={() => setToolView(null)} />}
          {toolView === 'voice' && <VoicePanel onClose={() => setToolView(null)} />}
          {toolView === 'chain' && <ChainPanel onClose={() => setToolView(null)} />}
          {toolView === 'knowledge' && <KnowledgePanel onClose={() => setToolView(null)} />}
          {toolView === 'agentTool' && <AgentPanel onClose={() => setToolView(null)} />}
          {toolView === 'usage' && <UsagePanel onClose={() => setToolView(null)} />}
          {toolView === 'audit' && <AuditPanel onClose={() => setToolView(null)} />}
          {toolView === 'sync' && <SyncPanel onClose={() => setToolView(null)} />}
          {toolView === 'templates' && <TemplatePanel onClose={() => setToolView(null)} />}
          {toolView === 'providers' && <ProviderPanel onClose={() => setToolView(null)} />}
          {toolView === 'watcher' && <WatcherPanel onClose={() => setToolView(null)} />}
          {toolView === 'miniWidgets' && <MiniWidgets onClose={() => setToolView(null)} />}
          {toolView === 'tabOrganizer' && <TabOrganizer onClose={() => setToolView(null)} />}
          {toolView === 'digest' && <DigestPanel onClose={() => setToolView(null)} />}
          {toolView === 'tutor' && <TutorPanel onClose={() => setToolView(null)} />}
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
        {/* Tool buttons */}
        <button className="header-btn" onClick={() => setToolView('highlight')} title="Highlights">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/>
          </svg>
        </button>
        <button className="header-btn" onClick={() => setToolView('reading')} title="Reading Mode">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </button>
        <button className="header-btn" onClick={() => setToolView('translate')} title="Translate">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </button>
        <button className="header-btn" onClick={() => setToolView('clipboard')} title="Clipboard">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          </svg>
        </button>
        {/* More tools menu */}
        <div className="more-menu-wrapper">
          <button className="header-btn" onClick={() => setShowMore(!showMore)} title="More tools">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
            </svg>
          </button>
          {showMore && (
            <>
              <div className="more-menu-backdrop" onClick={() => setShowMore(false)} />
              <div className="more-menu-dropdown">
                <button className="more-menu-item" onClick={() => { setToolView('youtube'); setShowMore(false) }}>
                  <span className="more-menu-item-icon">&#9654;</span>
                  <span>YouTube Analysis</span>
                </button>
                <button className="more-menu-item" onClick={() => { setToolView('email'); setShowMore(false) }}>
                  <span className="more-menu-item-icon">&#9993;</span>
                  <span>Email Writer</span>
                </button>
                <button className="more-menu-item" onClick={() => { setToolView('codeReview'); setShowMore(false) }}>
                  <span className="more-menu-item-icon">&#60;/&#62;</span>
                  <span>Code Review</span>
                </button>
                <button className="more-menu-item" onClick={() => { setToolView('pdf'); setShowMore(false) }}>
                  <span className="more-menu-item-icon">&#128196;</span>
                  <span>PDF Analysis</span>
                </button>
                <button className="more-menu-item" onClick={() => { setToolView('social'); setShowMore(false) }}>
                  <span className="more-menu-item-icon">&#128227;</span>
                  <span>Social Media</span>
                </button>
                <div className="more-menu-divider" />
                <button className="more-menu-item" onClick={() => { setToolView('screenshot'); setShowMore(false) }}>
                  <span className="more-menu-item-icon">&#128247;</span>
                  <span>Screenshot AI</span>
                </button>
                <button className="more-menu-item" onClick={() => { setToolView('voice'); setShowMore(false) }}>
                  <span className="more-menu-item-icon">&#127908;</span>
                  <span>Voice I/O</span>
                </button>
                <button className="more-menu-item" onClick={() => { setToolView('chain'); setShowMore(false) }}>
                  <span className="more-menu-item-icon">&#128279;</span>
                  <span>Prompt Chain</span>
                </button>
                <button className="more-menu-item" onClick={() => { setToolView('knowledge'); setShowMore(false) }}>
                  <span className="more-menu-item-icon">&#128218;</span>
                  <span>Knowledge Base</span>
                </button>
                <button className="more-menu-item" onClick={() => { setToolView('agentTool'); setShowMore(false) }}>
                  <span className="more-menu-item-icon">&#129302;</span>
                  <span>Agent Tools</span>
                </button>
                <div className="more-menu-divider" />
                <button className="more-menu-item" onClick={() => { setToolView('usage'); setShowMore(false) }}>
                  <span className="more-menu-item-icon">&#128200;</span>
                  <span>Usage Tracking</span>
                </button>
                <button className="more-menu-item" onClick={() => { setToolView('audit'); setShowMore(false) }}>
                  <span className="more-menu-item-icon">&#128203;</span>
                  <span>Audit Logs</span>
                </button>
                <button className="more-menu-item" onClick={() => { setToolView('sync'); setShowMore(false) }}>
                  <span className="more-menu-item-icon">&#128259;</span>
                  <span>Sync</span>
                </button>
                <button className="more-menu-item" onClick={() => { setToolView('templates'); setShowMore(false) }}>
                  <span className="more-menu-item-icon">&#128221;</span>
                  <span>Prompt Library</span>
                </button>
                <button className="more-menu-item" onClick={() => { setToolView('providers'); setShowMore(false) }}>
                  <span className="more-menu-item-icon">&#9889;</span>
                  <span>Providers</span>
                </button>
                <div className="more-menu-divider" />
                <div className="more-menu-section-label">Bonus</div>
                <button className="more-menu-item" onClick={() => { setToolView('watcher'); setShowMore(false) }}>
                  <span className="more-menu-item-icon">&#128065;</span>
                  <span>Page Watcher</span>
                </button>
                <button className="more-menu-item" onClick={() => { setToolView('miniWidgets'); setShowMore(false) }}>
                  <span className="more-menu-item-icon">&#127922;</span>
                  <span>Mini Widgets</span>
                </button>
                <button className="more-menu-item" onClick={() => { setToolView('tabOrganizer'); setShowMore(false) }}>
                  <span className="more-menu-item-icon">&#128193;</span>
                  <span>Tab Organizer</span>
                </button>
                <button className="more-menu-item" onClick={() => { setToolView('digest'); setShowMore(false) }}>
                  <span className="more-menu-item-icon">&#128240;</span>
                  <span>Daily Digest</span>
                </button>
                <button className="more-menu-item" onClick={() => { setToolView('tutor'); setShowMore(false) }}>
                  <span className="more-menu-item-icon">&#127891;</span>
                  <span>AI Tutor</span>
                </button>
              </div>
            </>
          )}
        </div>
        <button className="header-btn" onClick={() => setView('search')} title="검색 (Ctrl+F)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
        <button className="header-btn" onClick={() => setShowSettings(true)} title="설정">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            onClick={() => { setTab(t.id); setToolView(null) }}
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
