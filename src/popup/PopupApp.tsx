// popup/PopupApp.tsx  –  팝업 런처 (Pencil Ext/Popup 디자인 반영)
import { useEffect, useState } from 'react'
import { Scheduler } from '../lib/scheduler'
import '../styles/global.css'

function SvgIcon({ name, size = 14, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  const icons: Record<string, string> = {
    'panel-right': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/>',
    'zap': '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    'languages': '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
    'pen-tool': '<path d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z"/><path d="m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18"/><path d="m2.7 21.3 6.573-6.573"/><circle cx="11" cy="11" r="2"/>',
  }
  const path = icons[name] ?? ''
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: path }}
    />
  )
}

export function PopupApp() {
  const [activeTasks, setActiveTasks] = useState(0)
  const [hasCredentials, setHasCredentials] = useState(false)
  const [memorySize, setMemorySize] = useState('0 KB')

  useEffect(() => {
    chrome.storage.local.get('hchat:config:aws', (r) => {
      const aws = r['hchat:config:aws']
      setHasCredentials(!!(aws?.awsAccessKeyId && aws?.awsSecretAccessKey))
    })
    Scheduler.list().then((tasks) => {
      setActiveTasks(tasks.filter((t) => t.enabled).length)
    })
    chrome.storage.local.getBytesInUse(null, (bytes) => {
      if (bytes < 1024) setMemorySize(`${bytes} B`)
      else if (bytes < 1024 * 1024) setMemorySize(`${(bytes / 1024).toFixed(1)} KB`)
      else setMemorySize(`${(bytes / (1024 * 1024)).toFixed(1)} MB`)
    })

    chrome.storage.local.get('hchat:config:darkMode', (r) => {
      document.documentElement.classList.toggle('dark', !!r['hchat:config:darkMode'])
    })
  }, [])

  const openSidePanel = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      await chrome.sidePanel.open({ tabId: tab.id })
      window.close()
    }
  }

  const quickAction = async (action: string) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return

    // background에 페이지 텍스트 요청
    const pageData = await chrome.runtime.sendMessage({ type: 'get-page-text' }) as {
      text: string; title: string; url: string
    } | undefined

    const pageText = pageData?.text ?? ''
    const pageTitle = pageData?.title ?? tab.title ?? ''
    const pageUrl = pageData?.url ?? tab.url ?? ''
    const pageInfo = `[페이지: ${pageTitle}]\n[URL: ${pageUrl}]\n\n`

    let prompt: string
    if (action === 'summarize') {
      prompt = `${pageInfo}다음 웹페이지 내용을 한국어로 요약해줘:\n\n${pageText}`
    } else if (action === 'translate') {
      prompt = `${pageInfo}다음 웹페이지 내용을 한국어로 번역해줘 (이미 한국어면 영어로):\n\n${pageText}`
    } else {
      prompt = '글쓰기를 도와줘'
    }

    // storage에 pending prompt 저장
    await chrome.storage.local.set({
      'hchat:fab-pending': {
        action,
        text: prompt,
        pageUrl,
        pageTitle,
        ts: Date.now(),
      },
    })

    // 사이드패널 열기
    await chrome.sidePanel.open({ tabId: tab.id })
    window.close()
  }

  return (
    <div className="popup">
      {/* Header */}
      <div className="popup-header">
        <div className="popup-logo">H</div>
        <div className="popup-info">
          <div className="popup-name">H Chat</div>
          <div className="popup-desc">AI 채팅 어시스턴트 · AWS Bedrock</div>
        </div>
      </div>

      <div className="divider" />

      {/* Status Card */}
      <div className="popup-section">
        <div className="popup-status-card">
          <div className="popup-status-row">
            <span className={`status-dot ${hasCredentials ? 'status-dot-green' : 'status-dot-red'}`} />
            <span className="popup-status-label">API 키</span>
            <span className="popup-status-value" style={{ color: hasCredentials ? 'var(--success)' : 'var(--danger)' }}>
              {hasCredentials ? '설정됨' : '미설정'}
            </span>
          </div>
          <div className="popup-status-row">
            <span className="status-dot status-dot-blue" />
            <span className="popup-status-label">예약 작업</span>
            <span className="popup-status-value" style={{ color: 'var(--primary)' }}>{activeTasks}개 활성</span>
          </div>
          <div className="popup-status-row">
            <span className="status-dot status-dot-gray" />
            <span className="popup-status-label">메모리</span>
            <span className="popup-status-value">{memorySize}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="popup-actions-section">
        <button className="popup-btn-primary" onClick={openSidePanel}>
          <SvgIcon name="panel-right" size={14} color="#FFFFFF" />
          <span>사이드패널 열기</span>
        </button>
        <button className="popup-btn-outlined" onClick={async () => {
          // 빠른 질문: 사이드패널 열고 입력에 포커스
          await chrome.storage.local.set({ 'hchat:focus-input': Date.now() })
          await openSidePanel()
        }}>
          <SvgIcon name="zap" size={14} />
          <span>빠른 질문</span>
        </button>
      </div>

      <div className="divider" />

      {/* Quick Actions */}
      <div className="popup-quick-list">
        <button className="popup-quick-row" onClick={() => quickAction('summarize')}>
          <span className="popup-quick-row-icon"><SvgIcon name="file-text" size={14} color="var(--text-tertiary)" /></span>
          <span>이 페이지 요약</span>
        </button>
        <button className="popup-quick-row" onClick={() => quickAction('translate')}>
          <span className="popup-quick-row-icon"><SvgIcon name="languages" size={14} color="var(--text-tertiary)" /></span>
          <span>번역하기</span>
        </button>
        <button className="popup-quick-row" onClick={() => quickAction('write')}>
          <span className="popup-quick-row-icon"><SvgIcon name="pen-tool" size={14} color="var(--text-tertiary)" /></span>
          <span>글쓰기 도우미</span>
        </button>
      </div>

      {/* Footer */}
      <div className="popup-footer">
        Ctrl+Shift+H로 빠르게 열기
      </div>
    </div>
  )
}
