// components/SchedulerPanel.tsx
import { useState } from 'react'
import { useScheduler } from '../hooks/useScheduler'
import type { CronLike } from '../lib/scheduler'

export function SchedulerPanel({ conversationId }: { conversationId: string }) {
  const { tasks, loading, addTask, toggleTask, removeTask, describeSchedule } = useScheduler(conversationId)
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [prompt, setPrompt] = useState('')
  const [schedType, setSchedType] = useState<'daily' | 'weekdays' | 'interval'>('daily')
  const [hour, setHour] = useState(9)
  const [minute, setMinute] = useState(0)
  const [intervalMins, setIntervalMins] = useState(60)

  const buildSchedule = (): CronLike => {
    if (schedType === 'interval') return { type: 'interval', minutes: intervalMins }
    if (schedType === 'daily') return { type: 'daily', hour, minute }
    return { type: 'weekdays', hour, minute }
  }

  const handleAdd = async () => {
    if (!label.trim() || !prompt.trim()) return
    await addTask({ label, prompt, schedule: buildSchedule() })
    setLabel('')
    setPrompt('')
    setShowForm(false)
  }

  const fmtDate = (ts: number) =>
    new Date(ts).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  if (loading) return <div className="panel-loading">로딩 중...</div>

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-icon panel-icon-blue">⏰</div>
        <span className="panel-title">예약 작업</span>
        <span className="badge">{tasks.filter((t) => t.enabled).length} 활성</span>
        <button className="btn-add" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ 닫기' : '+ 추가'}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <input
            className="field-input"
            placeholder="작업 이름"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <textarea
            className="field-textarea field-textarea-sm"
            placeholder="실행할 프롬프트 (예: 오늘 AI 뉴스 요약해줘)"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
          />
          <div className="row-gap">
            <select
              className="field-select"
              value={schedType}
              onChange={(e) => setSchedType(e.target.value as typeof schedType)}
            >
              <option value="daily">매일</option>
              <option value="weekdays">평일</option>
              <option value="interval">N분마다</option>
            </select>
            {schedType === 'interval' ? (
              <div className="row-gap">
                <input
                  type="number"
                  className="field-input field-input-sm"
                  value={intervalMins}
                  min={1}
                  onChange={(e) => setIntervalMins(+e.target.value)}
                />
                <span className="field-unit">분</span>
              </div>
            ) : (
              <div className="row-gap">
                <input type="number" className="field-input field-input-sm" value={hour} min={0} max={23} onChange={(e) => setHour(+e.target.value)} />
                <span className="field-unit">:</span>
                <input type="number" className="field-input field-input-sm" value={minute} min={0} max={59} onChange={(e) => setMinute(+e.target.value)} />
              </div>
            )}
          </div>
          <button className="btn-primary btn-full" onClick={handleAdd}>추가</button>
        </div>
      )}

      <div className="task-list">
        {tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⏰</div>
            <p>예약된 작업이 없습니다</p>
            <p className="empty-sub">팝업이 닫혀있어도 백그라운드에서 실행됩니다</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className={`task-item ${!task.enabled ? 'task-disabled' : ''}`}>
              <div className="task-info">
                <div className="task-label">{task.label}</div>
                <div className="task-schedule">{describeSchedule(task.schedule)}</div>
                <div className="task-next">
                  다음: {fmtDate(task.nextRun)}
                  {task.lastRun && <span className="task-last"> · 마지막: {fmtDate(task.lastRun)}</span>}
                </div>
              </div>
              <div className="task-controls">
                <button
                  className={`toggle ${task.enabled ? 'toggle-on' : ''}`}
                  onClick={() => toggleTask(task.id, !task.enabled)}
                >
                  <span className="toggle-knob" />
                </button>
                <button className="btn-ghost btn-xs btn-danger" onClick={() => removeTask(task.id)}>✕</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
