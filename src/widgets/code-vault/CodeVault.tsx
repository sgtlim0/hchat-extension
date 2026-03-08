// widgets/code-vault/CodeVault.tsx — Code Snippet Manager

import { useState, useEffect, useCallback } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import { CodeVault as CodeVaultLib } from '@/lib/code-vault'
import { chat } from '@/lib/claude'
import type { Snippet } from '@/lib/code-vault'

interface Props {
  onClose: () => void
}

const LANGUAGES = [
  'All',
  'typescript',
  'javascript',
  'python',
  'java',
  'go',
  'rust',
  'html',
  'css',
  'sql',
  'bash',
  'other',
]

export function CodeVaultPanel({ onClose }: Props) {
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [search, setSearch] = useState('')
  const [langFilter, setLangFilter] = useState('All')
  const [showAdd, setShowAdd] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  // Add form
  const [newCode, setNewCode] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newLang, setNewLang] = useState('')
  const [newTags, setNewTags] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  const load = useCallback(async () => {
    const list = await CodeVaultLib.list()
    setSnippets(list)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = snippets.filter((s) => {
    if (langFilter !== 'All' && s.language !== langFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        s.title.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        s.description.toLowerCase().includes(q)
      )
    }
    return true
  })

  const langCounts = snippets.reduce<Record<string, number>>((acc, s) => {
    acc[s.language] = (acc[s.language] ?? 0) + 1
    return acc
  }, {})

  const handleAdd = async () => {
    if (!newCode.trim() || !newTitle.trim()) return
    const updated = await CodeVaultLib.add({
      code: newCode.trim(),
      title: newTitle.trim(),
      language: newLang || 'other',
      tags: newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      description: newDesc.trim(),
      url: '',
    })
    setSnippets(updated)
    resetForm()
  }

  const resetForm = () => {
    setNewCode('')
    setNewTitle('')
    setNewLang('')
    setNewTags('')
    setNewDesc('')
    setShowAdd(false)
  }

  const handleDelete = async (id: string) => {
    const updated = await CodeVaultLib.remove(id)
    setSnippets(updated)
  }

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      // fallback
    }
  }

  const handleAiAnalyze = async () => {
    if (!newCode.trim() || !config.awsAccessKeyId || analyzing) return
    setAnalyzing(true)

    try {
      const result = await chat(
        [
          {
            role: 'user',
            content: `Analyze this code snippet and respond in EXACTLY this JSON format (no markdown, no extra text):
{"language":"<detected language>","title":"<short descriptive title>","tags":["tag1","tag2"],"description":"<brief description of what this code does>"}

Code:
${newCode}`,
          },
        ],
        {
          awsAccessKeyId: config.awsAccessKeyId,
          awsSecretAccessKey: config.awsSecretAccessKey,
          awsRegion: config.awsRegion,
          model: config.model,
          maxTokens: 256,
        }
      )

      try {
        const parsed = JSON.parse(result.trim())
        if (parsed.language) setNewLang(parsed.language)
        if (parsed.title) setNewTitle(parsed.title)
        if (parsed.tags) setNewTags(parsed.tags.join(', '))
        if (parsed.description) setNewDesc(parsed.description)
      } catch {
        // Could not parse AI response
      }
    } catch {
      // AI analysis failed
    } finally {
      setAnalyzing(false)
    }
  }

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
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </div>
        <span className="panel-title">Code Vault</span>
        <div className="panel-actions">
          <button
            className="btn-primary btn-xs"
            onClick={() => setShowAdd(!showAdd)}
          >
            {showAdd ? 'Cancel' : '+ Add'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="code-vault-stats">
        <span className="code-vault-stat-total">
          {snippets.length} snippets
        </span>
        {Object.entries(langCounts).map(([lang, count]) => (
          <span key={lang} className="code-vault-stat-lang">
            {lang}: {count}
          </span>
        ))}
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="code-vault-add">
          <input
            className="field-input"
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <textarea
            className="field-textarea code-vault-code-input"
            placeholder="Paste code here..."
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            rows={6}
          />
          <div className="code-vault-add-row">
            <select
              className="field-select code-vault-lang-select"
              value={newLang}
              onChange={(e) => setNewLang(e.target.value)}
            >
              <option value="">Language</option>
              {LANGUAGES.filter((l) => l !== 'All').map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <button
              className="btn-primary btn-xs"
              onClick={handleAiAnalyze}
              disabled={!newCode.trim() || analyzing || !config.awsAccessKeyId}
            >
              {analyzing ? 'Analyzing...' : 'AI Analyze'}
            </button>
          </div>
          <input
            className="field-input"
            placeholder="Tags (comma separated)"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
          />
          <input
            className="field-input"
            placeholder="Description"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <button
            className="btn-primary btn-xs btn-full"
            onClick={handleAdd}
            disabled={!newCode.trim() || !newTitle.trim()}
          >
            Save Snippet
          </button>
        </div>
      )}

      {/* Filter & Search */}
      <div className="code-vault-filter">
        <input
          className="field-input"
          placeholder="Search snippets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="field-select code-vault-lang-select"
          value={langFilter}
          onChange={(e) => setLangFilter(e.target.value)}
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {/* Snippet List */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{'\u{1F4E6}'}</div>
          <p>No snippets found</p>
          <p className="empty-sub">Add code snippets to your vault</p>
        </div>
      ) : (
        <div className="code-vault-list">
          {filtered.map((snippet) => (
            <div key={snippet.id} className="code-vault-item">
              <div className="code-vault-item-header">
                <span className="code-vault-item-title">{snippet.title}</span>
                <span className="code-vault-item-lang">{snippet.language}</span>
              </div>
              <pre className="code-vault-item-code">
                <code>{snippet.code}</code>
              </pre>
              {snippet.description && (
                <div className="code-vault-item-desc">
                  {snippet.description}
                </div>
              )}
              {snippet.tags.length > 0 && (
                <div className="code-vault-item-tags">
                  {snippet.tags.map((tag) => (
                    <span key={tag} className="code-vault-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="code-vault-item-actions">
                <span className="code-vault-item-time">
                  {new Date(snippet.createdAt).toLocaleDateString('ko-KR')}
                </span>
                <button
                  className="btn-ghost btn-xs"
                  onClick={() => handleCopy(snippet.code, snippet.id)}
                >
                  {copied === snippet.id ? 'Copied!' : 'Copy'}
                </button>
                <button
                  className="btn-ghost btn-xs btn-danger"
                  onClick={() => handleDelete(snippet.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
