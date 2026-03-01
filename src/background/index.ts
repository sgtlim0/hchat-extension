// background/index.ts  –  Background Service Worker
// chrome.alarms 이벤트를 받아 스케줄 작업 실행 (AWS Bedrock)

import { Scheduler } from '../lib/scheduler'
import { Storage } from '../lib/storage'
import { signRequest } from '../lib/aws-sigv4'

const ALARM_PREFIX = 'hchat-task-'
const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-20250514-v1:0'
const DEFAULT_REGION = 'us-east-1'

// ── 설치/업데이트 시 알람 복원 ────────────────
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[HChat] Extension installed, restoring alarms...')
  await Scheduler.restoreAllAlarms()
})

// Service Worker 재시작 시에도 알람 복원
chrome.runtime.onStartup.addListener(async () => {
  console.log('[HChat] Browser started, restoring alarms...')
  await Scheduler.restoreAllAlarms()
})

// ── 알람 이벤트 처리 ─────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
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

// ── 아이콘 클릭 → 팝업 표시 (manifest default_popup) ──
// default_popup이 설정되어 있으므로 onClicked는 사용하지 않음

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
