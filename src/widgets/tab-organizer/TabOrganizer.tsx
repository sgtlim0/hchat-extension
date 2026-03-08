// widgets/tab-organizer/TabOrganizer.tsx — Smart Tab Grouping (AI Tab Organizer)

import { useState, useCallback } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import { chat } from '@/lib/claude'

interface Props {
  onClose: () => void
}

interface TabInfo {
  id: number
  title: string
  url: string
}

interface TabGroup {
  name: string
  color: string
  tabs: TabInfo[]
}

const GROUP_COLORS: chrome.tabGroups.ColorEnum[] = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']

export function TabOrganizer({ onClose }: Props) {
  const [tabs, setTabs] = useState<TabInfo[]>([])
  const [groups, setGroups] = useState<TabGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')
  const [applied, setApplied] = useState(false)

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  const handleAnalyze = useCallback(async () => {
    setLoading(true)
    setError('')
    setGroups([])
    setApplied(false)

    try {
      const allTabs = await chrome.tabs.query({ currentWindow: true })
      const tabInfos: TabInfo[] = allTabs
        .filter((t) => t.id && t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://'))
        .map((t) => ({ id: t.id!, title: t.title ?? '', url: t.url! }))

      setTabs(tabInfos)

      if (tabInfos.length < 2) {
        setError('Need at least 2 tabs to organize.')
        setLoading(false)
        return
      }

      const tabList = tabInfos.map((t, i) => `${i + 1}. "${t.title}" - ${t.url}`).join('\n')

      const result = await chat(
        [{
          role: 'user',
          content: `Analyze the following browser tabs and categorize them into logical groups.

Tabs:
${tabList}

Respond ONLY with a valid JSON array in this exact format (no markdown, no explanation):
[{"name":"Group Name","color":"blue","tabIndices":[1,2,3]}]

Available colors: grey, blue, red, yellow, green, pink, purple, cyan, orange.
Use 2-6 groups. Each tab index is 1-based from the list above.
Every tab must be in exactly one group.`
        }],
        { ...config, maxTokens: 1024 }
      )

      // Parse JSON from AI response
      const jsonMatch = result.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        setError('AI returned invalid format. Please try again.')
        setLoading(false)
        return
      }

      const parsed = JSON.parse(jsonMatch[0]) as Array<{ name: string; color: string; tabIndices: number[] }>

      const mapped: TabGroup[] = parsed.map((g) => ({
        name: g.name,
        color: g.color,
        tabs: g.tabIndices
          .filter((idx) => idx >= 1 && idx <= tabInfos.length)
          .map((idx) => tabInfos[idx - 1]),
      }))

      setGroups(mapped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }, [config])

  const handleApply = useCallback(async () => {
    setApplying(true)
    setError('')

    try {
      for (const group of groups) {
        if (group.tabs.length === 0) continue
        const tabIds = group.tabs.map((t) => t.id)
        const groupId = await chrome.tabs.group({ tabIds })
        const color = GROUP_COLORS.includes(group.color as chrome.tabGroups.ColorEnum)
          ? (group.color as chrome.tabGroups.ColorEnum)
          : 'grey'
        await chrome.tabGroups.update(groupId, {
          title: group.name,
          color,
        })
      }
      setApplied(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply groups')
    } finally {
      setApplying(false)
    }
  }, [groups])

  return (
    <div className="tab-org-panel">
      {/* Header */}
      <div className="tab-org-header">
        <button className="tab-org-back" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="tab-org-title">Tab Organizer</span>
      </div>

      {/* Analyze Button */}
      <div className="tab-org-actions">
        <button className="tab-org-analyze-btn" onClick={handleAnalyze} disabled={loading}>
          {loading ? 'Analyzing tabs...' : 'Analyze Tabs'}
        </button>
        {groups.length > 0 && !applied && (
          <button className="tab-org-apply-btn" onClick={handleApply} disabled={applying}>
            {applying ? 'Applying...' : 'Apply Groups'}
          </button>
        )}
      </div>

      {error && <div className="tab-org-error">{error}</div>}
      {applied && <div className="tab-org-success">Tab groups applied successfully!</div>}

      {/* Tab count */}
      {tabs.length > 0 && (
        <div className="tab-org-count">{tabs.length} tabs found</div>
      )}

      {/* Groups */}
      <div className="tab-org-groups">
        {groups.map((g, gi) => (
          <div key={gi} className="tab-org-group">
            <div className="tab-org-group-header">
              <span className="tab-org-group-dot" style={{ background: getColorHex(g.color) }} />
              <span className="tab-org-group-name">{g.name}</span>
              <span className="tab-org-group-count">{g.tabs.length}</span>
            </div>
            <div className="tab-org-group-tabs">
              {g.tabs.map((t) => (
                <div key={t.id} className="tab-org-tab">
                  <span className="tab-org-tab-title">{t.title || 'Untitled'}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function getColorHex(color: string): string {
  const map: Record<string, string> = {
    grey: '#9CA3AF',
    blue: '#3478FE',
    red: '#EF4444',
    yellow: '#F59E0B',
    green: '#22C55E',
    pink: '#EC4899',
    purple: '#8B5CF6',
    cyan: '#06B6D4',
    orange: '#F97316',
  }
  return map[color] ?? '#9CA3AF'
}
