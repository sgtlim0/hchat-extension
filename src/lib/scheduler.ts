// lib/scheduler.ts  –  nanoclaw 스타일 스케줄러
// chrome.alarms 기반 → 팝업/사이드패널이 닫혀도 실행됨
// Background Service Worker와 연동

import { Storage } from './storage'

export interface ScheduledTask {
  id: string
  label: string
  prompt: string
  conversationId: string
  schedule: CronLike
  enabled: boolean
  lastRun?: number
  nextRun: number
  createdAt: number
}

export type CronLike =
  | { type: 'interval'; minutes: number }
  | { type: 'daily'; hour: number; minute: number }
  | { type: 'weekdays'; hour: number; minute: number }

const STORE_KEY = 'hchat:scheduler:tasks'
const ALARM_PREFIX = 'hchat-task-'

// ── 유틸 ──────────────────────────────────────

export function calcNextRun(schedule: CronLike, from = Date.now()): number {
  if (schedule.type === 'interval') {
    return from + schedule.minutes * 60 * 1000
  }
  const d = new Date(from)
  const next = new Date(d)
  next.setHours(schedule.hour, schedule.minute, 0, 0)
  if (next.getTime() <= from) next.setDate(next.getDate() + 1)
  if (schedule.type === 'weekdays') {
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1)
    }
  }
  return next.getTime()
}

export function describeSchedule(schedule: CronLike): string {
  if (schedule.type === 'interval') return `${schedule.minutes}분마다`
  const t = `${String(schedule.hour).padStart(2, '0')}:${String(schedule.minute).padStart(2, '0')}`
  return schedule.type === 'daily' ? `매일 ${t}` : `평일 ${t}`
}

// ── 공개 API (UI 측에서 사용) ────────────────

export const Scheduler = {
  async list(): Promise<ScheduledTask[]> {
    return (await Storage.get<ScheduledTask[]>(STORE_KEY)) ?? []
  },

  async add(params: Omit<ScheduledTask, 'id' | 'nextRun' | 'createdAt'>): Promise<ScheduledTask> {
    const task: ScheduledTask = {
      ...params,
      id: crypto.randomUUID(),
      nextRun: calcNextRun(params.schedule),
      createdAt: Date.now(),
    }
    const tasks = await this.list()
    tasks.push(task)
    await Storage.set(STORE_KEY, tasks)

    // Background에 알람 등록 요청
    await this.registerAlarm(task)
    return task
  },

  async toggle(id: string, enabled: boolean): Promise<void> {
    const tasks = (await this.list()).map((t) =>
      t.id === id ? { ...t, enabled } : t
    )
    await Storage.set(STORE_KEY, tasks)

    const task = tasks.find((t) => t.id === id)
    if (!task) return

    if (enabled) {
      await this.registerAlarm(task)
    } else {
      await chrome.alarms.clear(ALARM_PREFIX + id)
    }
  },

  async remove(id: string): Promise<void> {
    const tasks = (await this.list()).filter((t) => t.id !== id)
    await Storage.set(STORE_KEY, tasks)
    await chrome.alarms.clear(ALARM_PREFIX + id)
  },

  async markRun(id: string): Promise<void> {
    const tasks = await this.list()
    const idx = tasks.findIndex((t) => t.id === id)
    if (idx === -1) return
    tasks[idx].lastRun = Date.now()
    tasks[idx].nextRun = calcNextRun(tasks[idx].schedule)
    await Storage.set(STORE_KEY, tasks)
    // 다음 알람 재등록
    await this.registerAlarm(tasks[idx])
  },

  async registerAlarm(task: ScheduledTask): Promise<void> {
    if (!task.enabled) return
    const alarmName = ALARM_PREFIX + task.id
    await chrome.alarms.clear(alarmName)

    if (task.schedule.type === 'interval') {
      chrome.alarms.create(alarmName, {
        delayInMinutes: task.schedule.minutes,
        periodInMinutes: task.schedule.minutes,
      })
    } else {
      const delayMs = task.nextRun - Date.now()
      const delayMins = Math.max(1, Math.ceil(delayMs / 60000))
      chrome.alarms.create(alarmName, { delayInMinutes: delayMins })
    }
  },

  async restoreAllAlarms(): Promise<void> {
    const tasks = await this.list()
    for (const task of tasks) {
      if (task.enabled) await this.registerAlarm(task)
    }
  },
}
