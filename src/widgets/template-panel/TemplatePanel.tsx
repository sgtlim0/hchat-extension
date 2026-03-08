// widgets/template-panel/TemplatePanel.tsx — 프롬프트 라이브러리 패널

import { useState, useEffect } from 'react'
import {
  useTemplateStore,
  parseVariables,
  renderTemplate,
} from '@/entities/template/template.store'
import type {
  TemplateCategory,
  PromptTemplate,
} from '@/entities/template/template.store'

interface Props {
  onClose: () => void
  onSendPrompt?: (prompt: string) => void
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  coding: '코딩',
  translate: '번역',
  writing: '작문',
  analysis: '분석',
  general: '일반',
}

const ALL_CATEGORIES: TemplateCategory[] = [
  'coding',
  'translate',
  'writing',
  'analysis',
  'general',
]

type ViewMode = 'list' | 'edit' | 'use'

export function TemplatePanel({ onClose, onSendPrompt }: Props) {
  const hydrate = useTemplateStore((s) => s.hydrate)
  const templates = useTemplateStore((s) => s.templates)
  const addTemplate = useTemplateStore((s) => s.addTemplate)
  const updateTemplate = useTemplateStore((s) => s.updateTemplate)
  const deleteTemplate = useTemplateStore((s) => s.deleteTemplate)
  const toggleFavorite = useTemplateStore((s) => s.toggleFavorite)
  const incrementUsage = useTemplateStore((s) => s.incrementUsage)

  const [view, setView] = useState<ViewMode>('list')
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | ''>('')
  const [favOnly, setFavOnly] = useState(false)
  const [editTarget, setEditTarget] = useState<PromptTemplate | null>(null)
  const [useTarget, setUseTarget] = useState<PromptTemplate | null>(null)
  const [varValues, setVarValues] = useState<Record<string, string>>({})

  // 편집 폼 상태
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState<TemplateCategory>('general')
  const [formPrompt, setFormPrompt] = useState('')

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const filtered = templates.filter((t) => {
    if (categoryFilter && t.category !== categoryFilter) return false
    if (favOnly && !t.favorite) return false
    return true
  })

  const startEdit = (template?: PromptTemplate) => {
    if (template) {
      setEditTarget(template)
      setFormName(template.name)
      setFormCategory(template.category)
      setFormPrompt(template.prompt)
    } else {
      setEditTarget(null)
      setFormName('')
      setFormCategory('general')
      setFormPrompt('')
    }
    setView('edit')
  }

  const handleSave = () => {
    if (!formName.trim() || !formPrompt.trim()) return
    if (editTarget) {
      updateTemplate(editTarget.id, {
        name: formName,
        category: formCategory,
        prompt: formPrompt,
      })
    } else {
      addTemplate({ name: formName, category: formCategory, prompt: formPrompt })
    }
    setView('list')
  }

  const startUse = (template: PromptTemplate) => {
    setUseTarget(template)
    const initValues: Record<string, string> = {}
    for (const v of template.variables) {
      initValues[v] = ''
    }
    setVarValues(initValues)
    setView('use')
  }

  const handleUseSubmit = (mode: 'copy' | 'send') => {
    if (!useTarget) return
    const rendered = renderTemplate(useTarget.prompt, varValues)
    incrementUsage(useTarget.id)

    if (mode === 'copy') {
      navigator.clipboard.writeText(rendered)
    } else if (mode === 'send' && onSendPrompt) {
      onSendPrompt(rendered)
    }
    setView('list')
  }

  const detectedVars = parseVariables(formPrompt)

  // ── 편집 뷰 ──
  if (view === 'edit') {
    return (
      <div className="template-panel">
        <div className="template-header">
          <button className="header-btn" onClick={() => setView('list')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <span className="template-title">{editTarget ? '템플릿 편집' : '새 템플릿'}</span>
        </div>

        <div className="template-form">
          <label className="template-form-label">이름</label>
          <input
            className="field-input"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="템플릿 이름"
          />

          <label className="template-form-label">카테고리</label>
          <select
            className="field-select"
            value={formCategory}
            onChange={(e) => setFormCategory(e.target.value as TemplateCategory)}
          >
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>

          <label className="template-form-label">
            프롬프트
            <span className="template-form-hint">{'{{변수}}'} 형태로 변수 사용</span>
          </label>
          <textarea
            className="field-input template-form-textarea"
            value={formPrompt}
            onChange={(e) => setFormPrompt(e.target.value)}
            placeholder={'프롬프트를 입력하세요...\n{{variable}} 형태로 변수를 추가할 수 있습니다'}
            rows={6}
          />

          {detectedVars.length > 0 && (
            <div className="template-vars-preview">
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>감지된 변수:</span>
              {detectedVars.map((v) => (
                <span key={v} className="template-var-badge">{`{{${v}}}`}</span>
              ))}
            </div>
          )}

          <button className="btn-primary btn-full" onClick={handleSave} disabled={!formName.trim() || !formPrompt.trim()}>
            {editTarget ? '수정' : '추가'}
          </button>
        </div>
      </div>
    )
  }

  // ── 사용 뷰 ──
  if (view === 'use' && useTarget) {
    return (
      <div className="template-panel">
        <div className="template-header">
          <button className="header-btn" onClick={() => setView('list')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <span className="template-title">{useTarget.name}</span>
        </div>

        <div className="template-form">
          {useTarget.variables.map((v) => (
            <div key={v}>
              <label className="template-form-label">{v}</label>
              <textarea
                className="field-input"
                value={varValues[v] ?? ''}
                onChange={(e) =>
                  setVarValues((prev) => ({ ...prev, [v]: e.target.value }))
                }
                placeholder={`${v} 입력...`}
                rows={v === 'code' || v === 'text' ? 4 : 1}
              />
            </div>
          ))}

          {/* 미리보기 */}
          <label className="template-form-label">미리보기</label>
          <div className="template-preview">
            {renderTemplate(useTarget.prompt, varValues)}
          </div>

          <div className="template-use-buttons">
            <button className="btn-ghost" onClick={() => handleUseSubmit('copy')}>
              복사
            </button>
            {onSendPrompt && (
              <button className="btn-primary" onClick={() => handleUseSubmit('send')}>
                채팅에 전송
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── 목록 뷰 ──
  return (
    <div className="template-panel">
      <div className="template-header">
        <button className="header-btn" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="template-title">프롬프트 라이브러리</span>
        <div style={{ flex: 1 }} />
        <button className="btn-ghost btn-xs" onClick={() => startEdit()}>+ 추가</button>
      </div>

      {/* 필터 */}
      <div className="template-filters">
        <select
          className="field-select template-filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as TemplateCategory | '')}
        >
          <option value="">전체</option>
          {ALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <button
          className={`template-fav-btn ${favOnly ? 'template-fav-active' : ''}`}
          onClick={() => setFavOnly(!favOnly)}
        >
          &#9733;
        </button>
      </div>

      {/* 목록 */}
      <div className="template-list">
        {filtered.length === 0 ? (
          <div className="template-empty">템플릿이 없습니다</div>
        ) : (
          filtered.map((t) => (
            <div key={t.id} className="template-item">
              <div className="template-item-top">
                <button
                  className={`template-item-fav ${t.favorite ? 'template-item-fav-on' : ''}`}
                  onClick={() => toggleFavorite(t.id)}
                >
                  &#9733;
                </button>
                <span className="template-item-name">{t.name}</span>
                <span className={`template-cat-badge template-cat-${t.category}`}>
                  {CATEGORY_LABELS[t.category]}
                </span>
              </div>
              <div className="template-item-prompt">{t.prompt.slice(0, 80)}...</div>
              <div className="template-item-meta">
                <span>사용 {t.usageCount}회</span>
                {t.variables.length > 0 && (
                  <span>변수 {t.variables.length}개</span>
                )}
              </div>
              <div className="template-item-actions">
                <button className="btn-ghost btn-xs" onClick={() => startUse(t)}>사용</button>
                <button className="btn-ghost btn-xs" onClick={() => startEdit(t)}>편집</button>
                <button className="btn-ghost btn-xs" style={{ color: 'var(--danger)' }} onClick={() => deleteTemplate(t.id)}>삭제</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
