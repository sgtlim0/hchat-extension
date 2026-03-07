// entities/session/session.types.ts

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
  streaming?: boolean
}

export interface Session {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export type ViewState =
  | 'chat'
  | 'memory'
  | 'scheduler'
  | 'swarm'
  | 'settings'
  | 'search'
