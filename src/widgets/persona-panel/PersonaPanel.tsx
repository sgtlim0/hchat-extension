// widgets/persona-panel/PersonaPanel.tsx — Multi Persona AI Panel

import { useState } from 'react'
import {
  usePersonaStore,
  type Persona,
} from '@/entities/persona/persona.store'

interface Props {
  onClose: () => void
}

const EMOJI_OPTIONS = [
  '\u{1F4BB}',
  '\u{1F30D}',
  '\u{270D}\u{FE0F}',
  '\u{1F4CA}',
  '\u{1F393}',
  '\u{1F916}',
  '\u{1F680}',
  '\u{1F4A1}',
  '\u{1F50D}',
  '\u{1F3A8}',
  '\u{1F4DA}',
  '\u{2695}\u{FE0F}',
  '\u{1F4DD}',
  '\u{1F9E0}',
  '\u{2728}',
]

const MODEL_OPTIONS = [
  { value: '', label: 'Default (config)' },
  { value: 'us.anthropic.claude-sonnet-4-6', label: 'Claude Sonnet 4' },
  { value: 'us.anthropic.claude-haiku-4-5-latest', label: 'Claude Haiku 4.5' },
  { value: 'us.anthropic.claude-opus-4-0', label: 'Claude Opus 4' },
]

type EditMode = 'list' | 'add' | 'edit'

export function PersonaPanel({ onClose }: Props) {
  const personas = usePersonaStore((s) => s.personas)
  const addPersona = usePersonaStore((s) => s.addPersona)
  const updatePersona = usePersonaStore((s) => s.updatePersona)
  const deletePersona = usePersonaStore((s) => s.deletePersona)
  const setDefault = usePersonaStore((s) => s.setDefault)
  const getDefault = usePersonaStore((s) => s.getDefault)

  const [mode, setMode] = useState<EditMode>('list')
  const [editId, setEditId] = useState<string | null>(null)

  // Form fields
  const [formName, setFormName] = useState('')
  const [formIcon, setFormIcon] = useState(EMOJI_OPTIONS[0])
  const [formPrompt, setFormPrompt] = useState('')
  const [formModel, setFormModel] = useState('')

  const currentDefault = getDefault()

  const startAdd = () => {
    setFormName('')
    setFormIcon(EMOJI_OPTIONS[0])
    setFormPrompt('')
    setFormModel('')
    setMode('add')
    setEditId(null)
  }

  const startEdit = (persona: Persona) => {
    setFormName(persona.name)
    setFormIcon(persona.icon)
    setFormPrompt(persona.systemPrompt)
    setFormModel(persona.model)
    setMode('edit')
    setEditId(persona.id)
  }

  const handleSave = () => {
    if (!formName.trim() || !formPrompt.trim()) return

    if (mode === 'add') {
      addPersona({
        name: formName.trim(),
        icon: formIcon,
        systemPrompt: formPrompt.trim(),
        model: formModel,
        isDefault: personas.length === 0,
      })
    } else if (mode === 'edit' && editId) {
      updatePersona(editId, {
        name: formName.trim(),
        icon: formIcon,
        systemPrompt: formPrompt.trim(),
        model: formModel,
      })
    }

    setMode('list')
    setEditId(null)
  }

  const handleDelete = (id: string) => {
    deletePersona(id)
  }

  // Edit/Add form
  if (mode === 'add' || mode === 'edit') {
    return (
      <div className="panel">
        <div className="panel-header">
          <button className="header-btn" onClick={() => setMode('list')}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <span className="panel-title">
            {mode === 'add' ? 'New Persona' : 'Edit Persona'}
          </span>
        </div>

        <div className="persona-form">
          {/* Icon picker */}
          <div className="persona-form-section">
            <label className="persona-form-label">Icon</label>
            <div className="persona-emoji-grid">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  className={`persona-emoji-btn ${formIcon === emoji ? 'persona-emoji-btn-active' : ''}`}
                  onClick={() => setFormIcon(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="persona-form-section">
            <label className="persona-form-label">Name</label>
            <input
              className="field-input"
              placeholder="Persona name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div className="persona-form-section">
            <label className="persona-form-label">System Prompt</label>
            <textarea
              className="field-textarea persona-prompt-textarea"
              placeholder="System prompt for this persona..."
              value={formPrompt}
              onChange={(e) => setFormPrompt(e.target.value)}
              rows={6}
            />
          </div>

          <div className="persona-form-section">
            <label className="persona-form-label">Model (optional)</label>
            <select
              className="field-select"
              value={formModel}
              onChange={(e) => setFormModel(e.target.value)}
            >
              {MODEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn-primary btn-xs btn-full"
            onClick={handleSave}
            disabled={!formName.trim() || !formPrompt.trim()}
          >
            {mode === 'add' ? 'Create Persona' : 'Save Changes'}
          </button>
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="panel">
      {/* Header */}
      <div className="panel-header">
        <button className="header-btn" onClick={onClose}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="panel-icon panel-icon-purple">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <span className="panel-title">Personas</span>
        <div className="panel-actions">
          <button className="btn-primary btn-xs" onClick={startAdd}>
            + New
          </button>
        </div>
      </div>

      {/* Current persona indicator */}
      {currentDefault && (
        <div className="persona-current">
          <span className="persona-current-icon">{currentDefault.icon}</span>
          <div className="persona-current-info">
            <span className="persona-current-name">{currentDefault.name}</span>
            <span className="persona-current-label">Active Persona</span>
          </div>
        </div>
      )}

      {/* Persona cards */}
      {personas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{'\u{1F916}'}</div>
          <p>No personas</p>
          <p className="empty-sub">Create your first AI persona</p>
        </div>
      ) : (
        <div className="persona-list">
          {personas.map((persona) => (
            <div
              key={persona.id}
              className={`persona-card ${persona.isDefault ? 'persona-card-active' : ''}`}
              onClick={() => setDefault(persona.id)}
            >
              <div className="persona-card-icon">{persona.icon}</div>
              <div className="persona-card-body">
                <div className="persona-card-name">
                  {persona.name}
                  {persona.isDefault && (
                    <span className="persona-card-badge">Active</span>
                  )}
                </div>
                <div className="persona-card-prompt">
                  {persona.systemPrompt.slice(0, 80)}
                  {persona.systemPrompt.length > 80 ? '...' : ''}
                </div>
                {persona.model && (
                  <div className="persona-card-model">{persona.model}</div>
                )}
              </div>
              <div className="persona-card-actions">
                <button
                  className="btn-ghost btn-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    startEdit(persona)
                  }}
                >
                  Edit
                </button>
                <button
                  className="btn-ghost btn-xs btn-danger"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(persona.id)
                  }}
                >
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
