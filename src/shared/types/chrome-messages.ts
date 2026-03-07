// shared/types/chrome-messages.ts — 타입 안전 메시지 정의

export interface OpenSidePanelMessage {
  type: 'open-sidepanel'
}

export interface GetPageTextMessage {
  type: 'get-page-text'
}

export interface GetPageTextResponse {
  text: string
  title: string
  url: string
}

export interface PendingPrompt {
  action: 'ask' | 'summarize' | 'translate' | 'rewrite' | 'explain-code' | 'command'
  text: string
  pageUrl: string
  pageTitle: string
  ts: number
}

export type ExtensionMessage = OpenSidePanelMessage | GetPageTextMessage

export type MessageResponseMap = {
  'open-sidepanel': void
  'get-page-text': GetPageTextResponse
}
