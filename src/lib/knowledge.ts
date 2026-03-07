// lib/knowledge.ts — 지식 그래프 (간이) CRUD

import { Storage } from './storage'

const KNOWLEDGE_KEY = 'hchat:knowledge'

export interface KnowledgeItem {
  id: string
  url: string
  title: string
  topics: string[]
  summary: string
  addedAt: number
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export async function listKnowledge(): Promise<KnowledgeItem[]> {
  return (await Storage.get<KnowledgeItem[]>(KNOWLEDGE_KEY)) ?? []
}

export async function addKnowledge(item: Omit<KnowledgeItem, 'id' | 'addedAt'>): Promise<KnowledgeItem> {
  const items = await listKnowledge()
  const newItem: KnowledgeItem = {
    ...item,
    id: generateId(),
    addedAt: Date.now(),
  }
  await Storage.set(KNOWLEDGE_KEY, [newItem, ...items])
  return newItem
}

export async function removeKnowledge(id: string): Promise<void> {
  const items = await listKnowledge()
  await Storage.set(KNOWLEDGE_KEY, items.filter((item) => item.id !== id))
}

export function getRelatedItems(target: KnowledgeItem, allItems: KnowledgeItem[]): KnowledgeItem[] {
  return allItems
    .filter((item) => item.id !== target.id)
    .map((item) => {
      const commonTopics = item.topics.filter((t) => target.topics.includes(t))
      return { item, score: commonTopics.length }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)
}

export function getAllTopics(items: KnowledgeItem[]): string[] {
  const topicSet = new Set<string>()
  for (const item of items) {
    for (const topic of item.topics) {
      topicSet.add(topic)
    }
  }
  return Array.from(topicSet).sort()
}
