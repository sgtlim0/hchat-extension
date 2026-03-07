// widgets/context-stack/ContextStack.tsx — 최근 탭 컨텍스트 칩

import { useState, useEffect } from 'react'

interface TabContext {
  tabId: number
  url: string
  title: string
  timestamp: number
}

interface ContextStackProps {
  onInsert: (text: string) => void
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

function relTime(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 1000)
  if (d < 60) return '방금'
  if (d < 3600) return `${Math.floor(d / 60)}분 전`
  if (d < 86400) return `${Math.floor(d / 3600)}시간 전`
  return `${Math.floor(d / 86400)}일 전`
}

export function ContextStack({ onInsert }: ContextStackProps) {
  const [stack, setStack] = useState<TabContext[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'get-context-stack' }, (res) => {
      if (Array.isArray(res)) setStack(res)
    })

    // storage 변경 시 갱신
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes['hchat:context-stack']?.newValue) {
        setStack(changes['hchat:context-stack'].newValue)
      }
    }
    chrome.storage.local.onChanged.addListener(listener)
    return () => chrome.storage.local.onChanged.removeListener(listener)
  }, [])

  if (stack.length === 0) return null

  const handleUse = async (ctx: TabContext) => {
    // 해당 탭의 텍스트를 가져와서 프롬프트에 주입
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: ctx.tabId },
        func: () => {
          const el = document.querySelector('article') ?? document.querySelector('main') ?? document.body
          return el.innerText.replace(/\n{3,}/g, '\n\n').trim().slice(0, 4000)
        },
      })
      const text = results[0]?.result ?? ''
      if (text) {
        onInsert(`[컨텍스트: ${ctx.title}]\n[URL: ${ctx.url}]\n\n${text}`)
      }
    } catch {
      onInsert(`[컨텍스트: ${ctx.title}]\n[URL: ${ctx.url}]`)
    }
  }

  return (
    <div className="context-stack">
      <button
        className="context-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="context-toggle-icon">📑</span>
        <span>최근 탭 ({stack.length})</span>
        <span className="context-toggle-arrow">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="context-items">
          {stack.map((ctx) => (
            <button
              key={ctx.url}
              className="context-item"
              onClick={() => handleUse(ctx)}
              title={ctx.url}
            >
              <div className="context-item-info">
                <span className="context-item-title">
                  {ctx.title || getDomain(ctx.url)}
                </span>
                <span className="context-item-domain">
                  {getDomain(ctx.url)} · {relTime(ctx.timestamp)}
                </span>
              </div>
              <span className="context-item-use">사용</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
