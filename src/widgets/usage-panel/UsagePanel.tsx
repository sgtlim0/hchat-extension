// widgets/usage-panel/UsagePanel.tsx — 사용량 추적 패널

import { useState, useEffect, useCallback } from 'react'
import { useUsageStore, getModelPricing } from '@/entities/usage/usage.store'
import type { DailyUsage } from '@/entities/usage/usage.store'

interface Props {
  onClose: () => void
}

type Period = 'today' | 'week' | 'month'

function getModelShortName(model: string): string {
  if (model.includes('opus')) return 'Opus'
  if (model.includes('haiku')) return 'Haiku'
  if (model.includes('sonnet')) return 'Sonnet'
  if (model.includes('gpt-4o-mini')) return 'GPT-4o mini'
  if (model.includes('gpt-4o')) return 'GPT-4o'
  if (model.includes('gpt-4')) return 'GPT-4'
  if (model.includes('gemini')) return 'Gemini'
  return model.split('.').pop()?.split(':')[0] ?? model
}

function aggregateByModel(usage: DailyUsage[]): Record<string, { input: number; output: number; cost: number; count: number }> {
  const result: Record<string, { input: number; output: number; cost: number; count: number }> = {}
  for (const u of usage) {
    const key = getModelShortName(u.model)
    if (!result[key]) result[key] = { input: 0, output: 0, cost: 0, count: 0 }
    result[key].input += u.inputTokens
    result[key].output += u.outputTokens
    result[key].cost += u.cost
    result[key].count += u.count
  }
  return result
}

function getLast7Days(): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function aggregateByDate(usage: DailyUsage[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const u of usage) {
    result[u.date] = (result[u.date] ?? 0) + u.cost
  }
  return result
}

export function UsagePanel({ onClose }: Props) {
  const hydrate = useUsageStore((s) => s.hydrate)
  const dailyUsage = useUsageStore((s) => s.dailyUsage)
  const budget = useUsageStore((s) => s.budget)
  const setBudget = useUsageStore((s) => s.setBudget)
  const todayUsage = useUsageStore((s) => s.todayUsage)
  const weekUsage = useUsageStore((s) => s.weekUsage)
  const monthUsage = useUsageStore((s) => s.monthUsage)
  const totalCostThisMonth = useUsageStore((s) => s.totalCostThisMonth)
  const isOverBudget = useUsageStore((s) => s.isOverBudget)
  const clearUsage = useUsageStore((s) => s.clearUsage)

  const [period, setPeriod] = useState<Period>('today')
  const [editBudget, setEditBudget] = useState(false)
  const [budgetDraft, setBudgetDraft] = useState(budget.monthlyLimit)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const getUsage = useCallback((): DailyUsage[] => {
    if (period === 'today') return todayUsage()
    if (period === 'week') return weekUsage()
    return monthUsage()
  }, [period, todayUsage, weekUsage, monthUsage])

  const usage = getUsage()
  const totals = usage.reduce(
    (acc, u) => ({
      input: acc.input + u.inputTokens,
      output: acc.output + u.outputTokens,
      cost: acc.cost + u.cost,
      count: acc.count + u.count,
    }),
    { input: 0, output: 0, cost: 0, count: 0 }
  )

  const byModel = aggregateByModel(usage)
  const maxCost = Math.max(...Object.values(byModel).map((v) => v.cost), 0.001)

  // 일별 추이 (최근 7일)
  const last7 = getLast7Days()
  const byDate = aggregateByDate(dailyUsage)
  const maxDailyCost = Math.max(...last7.map((d) => byDate[d] ?? 0), 0.001)

  const monthCost = totalCostThisMonth()
  const budgetWarning = isOverBudget()

  const handleSaveBudget = () => {
    setBudget({ monthlyLimit: budgetDraft })
    setEditBudget(false)
  }

  return (
    <div className="usage-panel">
      <div className="usage-header">
        <button className="header-btn" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="usage-title">사용량 추적</span>
        <div style={{ flex: 1 }} />
        <button className="btn-ghost btn-xs" onClick={clearUsage}>초기화</button>
      </div>

      {/* 예산 경고 */}
      {budgetWarning && (
        <div className="usage-warning">
          이번 달 사용량이 예산의 {Math.round((monthCost / budget.monthlyLimit) * 100)}%에 도달했습니다
        </div>
      )}

      {/* 기간 선택 */}
      <div className="usage-period-bar">
        {(['today', 'week', 'month'] as Period[]).map((p) => (
          <button
            key={p}
            className={`usage-period-btn ${period === p ? 'usage-period-active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {p === 'today' ? '오늘' : p === 'week' ? '이번 주' : '이번 달'}
          </button>
        ))}
      </div>

      {/* 요약 카드 */}
      <div className="usage-summary">
        <div className="usage-stat">
          <div className="usage-stat-label">토큰</div>
          <div className="usage-stat-value">{(totals.input + totals.output).toLocaleString()}</div>
          <div className="usage-stat-sub">입력 {totals.input.toLocaleString()} / 출력 {totals.output.toLocaleString()}</div>
        </div>
        <div className="usage-stat">
          <div className="usage-stat-label">비용</div>
          <div className="usage-stat-value">${totals.cost.toFixed(4)}</div>
        </div>
        <div className="usage-stat">
          <div className="usage-stat-label">요청 수</div>
          <div className="usage-stat-value">{totals.count}</div>
        </div>
      </div>

      {/* 모델별 비용 바 차트 */}
      <div className="usage-section">
        <div className="usage-section-title">모델별 비용</div>
        {Object.keys(byModel).length === 0 ? (
          <div className="usage-empty">데이터 없음</div>
        ) : (
          <div className="usage-bars">
            {Object.entries(byModel)
              .sort(([, a], [, b]) => b.cost - a.cost)
              .map(([model, data]) => (
                <div key={model} className="usage-bar-row">
                  <div className="usage-bar-label">{model}</div>
                  <div className="usage-bar-track">
                    <div
                      className="usage-bar-fill"
                      style={{ width: `${(data.cost / maxCost) * 100}%` }}
                    />
                  </div>
                  <div className="usage-bar-value">${data.cost.toFixed(4)}</div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 일별 추이 */}
      <div className="usage-section">
        <div className="usage-section-title">일별 추이 (최근 7일)</div>
        <div className="usage-daily-chart">
          {last7.map((date) => {
            const cost = byDate[date] ?? 0
            const height = maxDailyCost > 0 ? (cost / maxDailyCost) * 100 : 0
            return (
              <div key={date} className="usage-daily-col">
                <div className="usage-daily-bar-wrapper">
                  <div
                    className="usage-daily-bar"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`$${cost.toFixed(4)}`}
                  />
                </div>
                <div className="usage-daily-label">{date.slice(5)}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 예산 설정 */}
      <div className="usage-section">
        <div className="usage-section-title">월 예산</div>
        <div className="usage-budget-row">
          <div className="usage-budget-bar-track">
            <div
              className="usage-budget-bar-fill"
              style={{
                width: `${Math.min((monthCost / budget.monthlyLimit) * 100, 100)}%`,
                backgroundColor: budgetWarning ? 'var(--danger)' : 'var(--primary)',
              }}
            />
          </div>
          <div className="usage-budget-text">
            ${monthCost.toFixed(2)} / ${budget.monthlyLimit}
          </div>
        </div>
        {editBudget ? (
          <div className="usage-budget-edit">
            <input
              className="field-input"
              type="number"
              value={budgetDraft}
              onChange={(e) => setBudgetDraft(Number(e.target.value))}
              min={1}
              step={10}
              style={{ width: 80 }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>USD</span>
            <button className="btn-primary btn-xs" onClick={handleSaveBudget}>저장</button>
            <button className="btn-ghost btn-xs" onClick={() => setEditBudget(false)}>취소</button>
          </div>
        ) : (
          <button className="btn-ghost btn-xs" onClick={() => { setBudgetDraft(budget.monthlyLimit); setEditBudget(true) }}>
            예산 수정
          </button>
        )}
      </div>

      {/* 모델 가격표 */}
      <div className="usage-section">
        <div className="usage-section-title">모델 가격 (per 1M tokens)</div>
        <div className="usage-pricing">
          {[
            { name: 'Sonnet', key: 'sonnet' },
            { name: 'Opus', key: 'opus' },
            { name: 'Haiku', key: 'haiku' },
          ].map((m) => {
            const p = getModelPricing(m.key)
            return (
              <div key={m.key} className="usage-pricing-row">
                <span>{m.name}</span>
                <span style={{ color: 'var(--text-tertiary)' }}>
                  입력 ${p.input} / 출력 ${p.output}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
