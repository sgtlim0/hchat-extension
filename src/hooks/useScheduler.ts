// hooks/useScheduler.ts
import { useState, useCallback, useEffect } from 'react'
import { Scheduler, type ScheduledTask, type CronLike, describeSchedule } from '../lib/scheduler'

export function useScheduler(conversationId: string) {
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const all = await Scheduler.list()
    setTasks(all.filter((t) => t.conversationId === conversationId))
    setLoading(false)
  }, [conversationId])

  useEffect(() => { refresh() }, [refresh])

  const addTask = useCallback(async (params: {
    label: string
    prompt: string
    schedule: CronLike
  }) => {
    const task = await Scheduler.add({ ...params, conversationId, enabled: true })
    setTasks((prev) => [...prev, task])
    return task
  }, [conversationId])

  const toggleTask = useCallback(async (id: string, enabled: boolean) => {
    await Scheduler.toggle(id, enabled)
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, enabled } : t)))
  }, [])

  const removeTask = useCallback(async (id: string) => {
    await Scheduler.remove(id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { tasks, loading, addTask, toggleTask, removeTask, refresh, describeSchedule }
}
