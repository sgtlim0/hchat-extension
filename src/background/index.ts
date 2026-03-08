// background/index.ts  –  Background Service Worker
// chrome.alarms 이벤트를 받아 스케줄 작업 실행 (AWS Bedrock)

import { Scheduler } from '../lib/scheduler'
import { Storage } from '../lib/storage'
import { signRequest } from '../lib/aws-sigv4'

const ALARM_PREFIX = 'hchat-task-'
const WATCHER_ALARM = 'hchat-watcher-check'
const DIGEST_ALARM = 'hchat-digest-daily'
const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-6'
const DEFAULT_REGION = 'us-east-1'

// ── 설치/업데이트 시 알람 복원 ────────────────
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[HChat] Extension installed, restoring alarms...')
  await Scheduler.restoreAllAlarms()
  // Restore watcher alarm
  await restoreWatcherAlarm()
})

// Service Worker 재시작 시에도 알람 복원
chrome.runtime.onStartup.addListener(async () => {
  console.log('[HChat] Browser started, restoring alarms...')
  await Scheduler.restoreAllAlarms()
  await restoreWatcherAlarm()
})

// ── Watcher 알람 복원 헬퍼 ────────────────────
async function restoreWatcherAlarm() {
  const watchers = await Storage.get<Array<{ enabled: boolean; interval: number }>>('hchat:watchers')
  if (watchers && watchers.some((w) => w.enabled)) {
    const minInterval = Math.max(1, Math.min(...watchers.filter((w) => w.enabled).map((w) => w.interval)))
    chrome.alarms.create(WATCHER_ALARM, { periodInMinutes: minInterval })
    console.log('[HChat] Watcher alarm restored, interval:', minInterval, 'min')
  }
}

// ── 알람 이벤트 처리 ─────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  // Watcher alarm: check watched pages
  if (alarm.name === WATCHER_ALARM) {
    await checkWatchTargets()
    return
  }

  // Digest alarm: notify for daily briefing
  if (alarm.name === DIGEST_ALARM) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/icon48.png',
      title: 'H Chat Daily Digest',
      message: 'Your daily briefing is ready. Open H Chat to view.',
    })
    return
  }

  if (!alarm.name.startsWith(ALARM_PREFIX)) return

  const taskId = alarm.name.slice(ALARM_PREFIX.length)
  const tasks = await Scheduler.list()
  const task = tasks.find((t) => t.id === taskId)

  if (!task || !task.enabled) return

  console.log(`[HChat] Running scheduled task: ${task.label}`)

  // AWS 자격증명 가져오기
  const awsCreds = await Storage.get<{
    awsAccessKeyId: string
    awsSecretAccessKey: string
    awsRegion: string
  }>('hchat:config:aws')

  if (!awsCreds?.awsAccessKeyId || !awsCreds?.awsSecretAccessKey) {
    console.warn('[HChat] No AWS credentials configured, skipping task:', task.label)
    return
  }

  const region = awsCreds.awsRegion || DEFAULT_REGION
  const model = DEFAULT_MODEL

  try {
    const bodyStr = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      messages: [{ role: 'user', content: task.prompt }],
    })

    const encodedModel = encodeURIComponent(model)
    const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodedModel}/invoke`

    const signedHeaders = await signRequest({
      method: 'POST',
      url,
      headers: { 'content-type': 'application/json' },
      body: bodyStr,
      accessKeyId: awsCreds.awsAccessKeyId,
      secretAccessKey: awsCreds.awsSecretAccessKey,
      region,
      service: 'bedrock',
    })

    const res = await fetch(url, {
      method: 'POST',
      headers: signedHeaders,
      body: bodyStr,
    })

    const data = await res.json()
    const result = data.content?.[0]?.text ?? ''

    // 결과를 대화 기록에 저장
    const convKey = `hchat:scheduled-results:${task.conversationId}`
    const existing = (await Storage.get<Array<{ label: string; result: string; ts: number }>>(convKey)) ?? []
    existing.unshift({ label: task.label, result, ts: Date.now() })
    await Storage.set(convKey, existing.slice(0, 20)) // 최근 20개 유지

    // 알림 표시
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/icon48.png',
      title: `H Chat · ${task.label}`,
      message: result.slice(0, 120) + (result.length > 120 ? '...' : ''),
    })

    // 다음 실행 시간 업데이트
    await Scheduler.markRun(taskId)
  } catch (err) {
    console.error('[HChat] Task execution failed:', err)
  }
})

// ── Page Watcher: 주기적 페이지 체크 ───────────
interface WatchTarget {
  id: string
  url: string
  selector?: string
  interval: number
  lastContent: string
  lastChecked: number
  enabled: boolean
  label: string
  changed: boolean
  diff?: string
}

async function checkWatchTargets() {
  const watchers = await Storage.get<WatchTarget[]>('hchat:watchers')
  if (!watchers || watchers.length === 0) return

  const now = Date.now()
  let updated = false

  const newWatchers = await Promise.all(
    watchers.map(async (target) => {
      if (!target.enabled) return target
      // Check if interval has elapsed
      if (target.lastChecked && now - target.lastChecked < target.interval * 60 * 1000 * 0.9) {
        return target
      }

      try {
        const res = await fetch(target.url)
        const html = await res.text()
        // Simple text extraction from HTML
        const textMatch = html.replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 5000)

        const content = target.selector ? textMatch : textMatch
        const changed = target.lastContent !== '' && content !== target.lastContent

        if (changed) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: '/icons/icon48.png',
            title: `Page Changed: ${target.label}`,
            message: `Changes detected on ${target.url.slice(0, 60)}`,
          })
        }

        updated = true
        return {
          ...target,
          lastContent: content,
          lastChecked: now,
          changed,
          diff: changed ? `Content changed at ${new Date(now).toLocaleString()}` : target.diff,
        }
      } catch {
        return { ...target, lastChecked: now }
      }
    })
  )

  if (updated) {
    await Storage.set('hchat:watchers', newWatchers)
  }
}

// ── 컨텍스트 스택 (최근 5개 탭 추적) ────────────
const CONTEXT_STACK_KEY = 'hchat:context-stack'
const MAX_CONTEXT = 5

interface TabContext {
  tabId: number
  url: string
  title: string
  timestamp: number
}

async function updateContextStack(tabId: number) {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return

    const entry: TabContext = {
      tabId,
      url: tab.url,
      title: tab.title ?? '',
      timestamp: Date.now(),
    }

    const existing = (await Storage.get<TabContext[]>(CONTEXT_STACK_KEY)) ?? []
    // 같은 URL 중복 제거 후 앞에 추가
    const filtered = existing.filter((e) => e.url !== entry.url)
    const stack = [entry, ...filtered].slice(0, MAX_CONTEXT)
    await Storage.set(CONTEXT_STACK_KEY, stack)
  } catch {
    // 탭이 이미 닫힌 경우 무시
  }
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  updateContextStack(tabId)
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    updateContextStack(tabId)
  }
})

// ── 메시지 라우터 ─────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'open-sidepanel') {
    const tabId = sender.tab?.id
    if (tabId) {
      chrome.sidePanel.open({ tabId })
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) chrome.sidePanel.open({ tabId: tabs[0].id })
      })
    }
    return
  }

  // 컨텍스트 스택 조회
  if (msg.type === 'get-context-stack') {
    Storage.get<TabContext[]>(CONTEXT_STACK_KEY).then((stack) => {
      sendResponse(stack ?? [])
    })
    return true
  }

  // YouTube 자막 추출
  if (msg.type === 'get-youtube-captions') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0]
      const tabId = tab?.id
      const tabUrl = tab?.url ?? ''

      if (!tabId || !tabUrl.includes('youtube.com/watch')) {
        sendResponse({ isYouTube: false, title: '', captions: '' })
        return
      }

      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            const title = document.title.replace(/ - YouTube$/, '')
            // Try to extract transcript text from the page
            // Method 1: Look for transcript panel text
            const transcriptItems = document.querySelectorAll(
              'ytd-transcript-segment-renderer .segment-text, ' +
              'yt-formatted-string.segment-text'
            )
            if (transcriptItems.length > 0) {
              const captions = Array.from(transcriptItems)
                .map((el) => (el as HTMLElement).innerText.trim())
                .filter(Boolean)
                .join(' ')
              return { title, captions: captions.slice(0, 8000) }
            }
            // Method 2: Extract from video description and main content
            const descEl = document.querySelector(
              'ytd-text-inline-expander #plain-snippet-text, ' +
              'ytd-text-inline-expander .content, ' +
              '#description-inline-expander'
            )
            const desc = descEl ? (descEl as HTMLElement).innerText.trim() : ''
            // Method 3: Get all text from the info section
            const infoEl = document.querySelector('#above-the-fold, #info-contents')
            const info = infoEl ? (infoEl as HTMLElement).innerText.trim() : ''
            const combined = [desc, info].filter(Boolean).join('\n\n')
            return { title, captions: combined.slice(0, 8000) }
          },
        })
        const data = results[0]?.result
        sendResponse({
          isYouTube: true,
          title: data?.title ?? '',
          captions: data?.captions ?? '',
        })
      } catch {
        sendResponse({ isYouTube: true, title: '', captions: '' })
      }
    })
    return true
  }

  // 스크린샷 캡처
  if (msg.type === 'capture-screenshot') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tabId = tabs[0]?.id
      if (!tabId) {
        sendResponse({ error: 'No active tab' })
        return
      }
      try {
        const dataUrl = await chrome.tabs.captureVisibleTab(
          undefined as unknown as number,
          { format: 'png' }
        )
        sendResponse({ dataUrl })
      } catch (err) {
        sendResponse({ error: err instanceof Error ? err.message : 'Capture failed' })
      }
    })
    return true
  }

  // 웹 검색 (에이전트 도구용)
  if (msg.type === 'web-search') {
    const query = msg.query ?? ''
    // DuckDuckGo instant answer API (간이 검색)
    fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`)
      .then((res) => res.json())
      .then((data) => {
        const results: string[] = []
        if (data.AbstractText) results.push(data.AbstractText)
        if (data.RelatedTopics) {
          for (const topic of data.RelatedTopics.slice(0, 5)) {
            if (topic.Text) results.push(topic.Text)
          }
        }
        sendResponse({ results: results.join('\n\n') || `No instant results for "${query}"` })
      })
      .catch(() => {
        sendResponse({ results: `Search failed for "${query}"` })
      })
    return true
  }

  // Digest alarm 설정/해제
  if (msg.type === 'set-digest-alarm') {
    if (msg.enabled) {
      // Calculate minutes until next 09:00
      const now = new Date()
      const target = new Date(now)
      target.setHours(9, 0, 0, 0)
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1)
      }
      const delayMinutes = (target.getTime() - now.getTime()) / 60000
      chrome.alarms.create(DIGEST_ALARM, { delayInMinutes: delayMinutes, periodInMinutes: 24 * 60 })
      console.log('[HChat] Digest alarm set, next in', Math.round(delayMinutes), 'min')
    } else {
      chrome.alarms.clear(DIGEST_ALARM)
      console.log('[HChat] Digest alarm cleared')
    }
    return
  }

  // Watcher alarm 업데이트 (감시 대상 변경 시)
  if (msg.type === 'update-watcher-alarm') {
    restoreWatcherAlarm()
    return
  }

  // 사이드패널/팝업에서 현재 탭의 페이지 텍스트 요청
  if (msg.type === 'get-page-text') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tabId = tabs[0]?.id
      if (!tabId) {
        sendResponse({ text: '', title: '', url: '' })
        return
      }

      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            // 페이지의 주요 텍스트 추출 (최대 8000자)
            const el = document.querySelector('article') ?? document.querySelector('main') ?? document.body
            const text = el.innerText.replace(/\n{3,}/g, '\n\n').trim()
            return {
              text: text.slice(0, 8000),
              title: document.title,
              url: location.href,
            }
          },
        })
        sendResponse(results[0]?.result ?? { text: '', title: '', url: '' })
      } catch {
        sendResponse({ text: '', title: '', url: '' })
      }
    })
    return true // async sendResponse
  }
})
