// widgets/knowledge-panel/KnowledgePanel.tsx — 지식 그래프 패널

import { useState, useEffect, useCallback } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import { chat } from '@/lib/claude'
import {
  listKnowledge,
  addKnowledge,
  removeKnowledge,
  getRelatedItems,
  getAllTopics,
  type KnowledgeItem,
} from '@/lib/knowledge'

interface Props {
  onClose: () => void
}

export function KnowledgePanel({ onClose }: Props) {
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null)

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  // Load items
  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listKnowledge()
      setItems(data)
    } catch {
      setError('Failed to load knowledge items')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  // Add current page
  const handleAddPage = useCallback(async () => {
    if (!config.awsAccessKeyId) {
      setError('AWS credentials required')
      return
    }

    setAdding(true)
    setError('')

    try {
      // Get page text from background
      const pageData = await chrome.runtime.sendMessage({ type: 'get-page-text' })
      if (!pageData?.text) {
        setError('Could not get page content')
        setAdding(false)
        return
      }

      // AI extract topics and summary
      const result = await chat(
        [{
          role: 'user',
          content: `Analyze this web page and extract information in the following JSON format:
{
  "topics": ["topic1", "topic2", "topic3"],
  "summary": "brief 1-2 sentence summary"
}

Rules:
- Extract exactly 3 relevant topics/keywords
- Summary should be concise (under 100 words)
- Respond ONLY with valid JSON, no other text

Page title: ${pageData.title}
Page content:
${pageData.text.slice(0, 3000)}`,
        }],
        {
          awsAccessKeyId: config.awsAccessKeyId,
          awsSecretAccessKey: config.awsSecretAccessKey,
          awsRegion: config.awsRegion,
          model: config.model,
          maxTokens: 512,
        }
      )

      // Parse AI response
      let topics: string[] = []
      let summary = ''
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          topics = Array.isArray(parsed.topics) ? parsed.topics.slice(0, 3) : []
          summary = typeof parsed.summary === 'string' ? parsed.summary : ''
        }
      } catch {
        // Fallback if AI response is not valid JSON
        topics = ['general']
        summary = result.slice(0, 200)
      }

      const newItem = await addKnowledge({
        url: pageData.url,
        title: pageData.title,
        topics,
        summary,
      })

      setItems((prev) => [newItem, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add page')
    } finally {
      setAdding(false)
    }
  }, [config])

  const handleRemove = useCallback(async (id: string) => {
    await removeKnowledge(id)
    setItems((prev) => prev.filter((item) => item.id !== id))
    if (selectedItem?.id === id) {
      setSelectedItem(null)
    }
  }, [selectedItem])

  const allTopics = getAllTopics(items)

  const filteredItems = selectedTopic
    ? items.filter((item) => item.topics.includes(selectedTopic))
    : items

  const relatedItems = selectedItem ? getRelatedItems(selectedItem, items) : []

  return (
    <div className="panel">
      {/* Header */}
      <div className="panel-header">
        <button className="header-btn" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="panel-icon panel-icon-purple">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <span className="panel-title">Knowledge Base</span>
        <button className="btn-ghost btn-xs" onClick={loadItems} disabled={loading}>
          Refresh
        </button>
      </div>

      {/* Add current page */}
      <div className="knowledge-add">
        <button
          className="btn-primary btn-full"
          onClick={handleAddPage}
          disabled={adding}
        >
          {adding ? 'Analyzing page...' : 'Add Current Page'}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {/* Topic filters */}
      {allTopics.length > 0 && (
        <div className="knowledge-topics">
          <button
            className={`knowledge-topic-chip ${!selectedTopic ? 'knowledge-topic-active' : ''}`}
            onClick={() => { setSelectedTopic(null); setSelectedItem(null) }}
          >
            All ({items.length})
          </button>
          {allTopics.map((topic) => (
            <button
              key={topic}
              className={`knowledge-topic-chip ${selectedTopic === topic ? 'knowledge-topic-active' : ''}`}
              onClick={() => { setSelectedTopic(topic); setSelectedItem(null) }}
            >
              {topic}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && <div className="panel-loading">Loading...</div>}

      {/* Items list */}
      {!loading && filteredItems.length === 0 && (
        <div className="empty-state">
          <p>No knowledge items yet</p>
          <p className="empty-sub">Add pages to build your knowledge base</p>
        </div>
      )}

      {filteredItems.map((item) => (
        <div
          key={item.id}
          className={`knowledge-item ${selectedItem?.id === item.id ? 'knowledge-item-selected' : ''}`}
          onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
        >
          <div className="knowledge-item-header">
            <span className="knowledge-item-title">{item.title || 'Untitled'}</span>
            <button
              className="knowledge-item-remove"
              onClick={(e) => { e.stopPropagation(); handleRemove(item.id) }}
              title="Remove"
            >
              &times;
            </button>
          </div>
          <div className="knowledge-item-url">{item.url}</div>
          <div className="knowledge-item-topics">
            {item.topics.map((t) => (
              <span key={t} className="knowledge-item-topic-tag">{t}</span>
            ))}
          </div>
          {item.summary && (
            <div className="knowledge-item-summary">{item.summary}</div>
          )}
          <div className="knowledge-item-date">
            {new Date(item.addedAt).toLocaleDateString()}
          </div>
        </div>
      ))}

      {/* Related items */}
      {selectedItem && relatedItems.length > 0 && (
        <div className="knowledge-related">
          <div className="knowledge-related-title">Related Items</div>
          {relatedItems.map((item) => (
            <div
              key={item.id}
              className="knowledge-related-item"
              onClick={() => setSelectedItem(item)}
            >
              <span className="knowledge-related-item-title">{item.title}</span>
              <span className="knowledge-related-item-topics">
                {item.topics.join(', ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
