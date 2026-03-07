# H Chat Extension 설계방안

> v2.0 아키텍처 설계 — 현재 코드베이스 기반 실행 가능한 설계

## 1. 현재 아키텍처 문제점

### 1.1 상태 관리

**문제**: useState + props drilling, 컴포넌트 간 상태 공유 어려움

```
현재: App.tsx (config, tab, darkMode, pendingPrompt)
       └── ChatView (messages는 useChat 내부 useState)
       └── MemoryPanel (useMemory 내부 useState)
       └── SchedulerPanel (useScheduler 내부 useState)

문제점:
- 탭 전환 시 ChatView 언마운트 → 메시지 초기화
- 컴포넌트 간 데이터 공유 불가
- chrome.storage와 React state 이중 관리
```

### 1.2 단일 대화

**문제**: `CONV_ID = 'hchat-main'` 하드코딩, 멀티 세션 불가

### 1.3 타입 안정성

**문제**: chrome.runtime.sendMessage 반환값 any, 스토리지 키 문자열 하드코딩

### 1.4 콘텐츠 스크립트 격리

**문제**: FAB 스타일이 호스트 페이지와 충돌 가능 (Shadow DOM 미사용)

---

## 2. 목표 아키텍처

### 2.1 디렉토리 구조 (FSD 적용)

```
src/
├── app/                          # 앱 엔트리 & 글로벌 설정
│   ├── sidepanel/
│   │   ├── App.tsx               # 사이드패널 루트 (라우팅)
│   │   └── main.tsx              # React 마운트
│   ├── popup/
│   │   ├── PopupApp.tsx          # 팝업 루트
│   │   └── main.tsx
│   └── providers.tsx             # StoreProvider, ThemeProvider
│
├── pages/                        # 뷰 단위 페이지
│   ├── chat/
│   │   └── ChatPage.tsx          # 채팅 페이지 (세션 목록 + 채팅)
│   ├── memory/
│   │   └── MemoryPage.tsx
│   ├── scheduler/
│   │   └── SchedulerPage.tsx
│   ├── swarm/
│   │   └── SwarmPage.tsx
│   ├── settings/
│   │   └── SettingsPage.tsx
│   └── search/
│       └── SearchPage.tsx        # 메시지 검색
│
├── widgets/                      # 복합 UI 블록
│   ├── chat-view/
│   │   ├── ChatView.tsx
│   │   ├── MessageBubble.tsx
│   │   └── SuggestionChips.tsx
│   ├── session-list/
│   │   └── SessionList.tsx
│   ├── memory-editor/
│   │   └── MemoryEditor.tsx
│   └── command-palette/
│       └── CommandPalette.tsx     # 슬래시 명령어 팔레트
│
├── entities/                     # 도메인 스토어 (Zustand)
│   ├── session/
│   │   ├── session.store.ts      # 세션 + 메시지 스토어
│   │   └── session.types.ts
│   ├── config/
│   │   ├── config.store.ts       # 설정 스토어
│   │   └── config.types.ts
│   ├── memory/
│   │   ├── memory.store.ts
│   │   └── memory.types.ts
│   ├── scheduler/
│   │   ├── scheduler.store.ts
│   │   └── scheduler.types.ts
│   ├── swarm/
│   │   ├── swarm.store.ts
│   │   └── swarm.types.ts
│   └── usage/
│       ├── usage.store.ts        # 사용량 추적 (Phase 5)
│       └── usage.types.ts
│
├── shared/                       # 공유 유틸리티
│   ├── lib/
│   │   ├── aws-sigv4.ts          # AWS SigV4 서명
│   │   ├── bedrock.ts            # Bedrock 클라이언트 (스트리밍)
│   │   ├── storage.ts            # chrome.storage 추상화
│   │   └── message-bus.ts        # 타입 안전 메시지 통신
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Toast.tsx
│   ├── types/
│   │   └── chrome-messages.ts    # 메시지 타입 정의
│   └── styles/
│       └── global.css
│
├── background/
│   └── index.ts                  # Service Worker
│
└── content/
    └── fab.ts                    # Content Script (Shadow DOM)
```

### 2.2 레이어 의존성 규칙

```
pages → widgets → entities → shared
  ↓        ↓          ↓         ↓
  UI      복합 UI    비즈니스   유틸리티

background → shared/lib (entities 직접 접근 금지)
content    → shared/lib (React 없음, 순수 DOM)
```

---

## 3. 상태 관리 설계 (Zustand + chrome.storage)

### 3.1 스토어 패턴

```typescript
// entities/session/session.store.ts
import { create } from 'zustand'
import { Storage } from '@/shared/lib/storage'

interface Session {
  id: string
  title: string
  messages: ChatMessage[]
  memoryId: string
  createdAt: number
  updatedAt: number
}

interface SessionState {
  sessions: Session[]
  currentSessionId: string | null
  view: 'chat' | 'memory' | 'scheduler' | 'swarm' | 'settings' | 'search'

  // Actions
  createSession: (title?: string) => Promise<string>
  selectSession: (id: string) => void
  deleteSession: (id: string) => Promise<void>
  setView: (view: SessionState['view']) => void

  // Messages
  addMessage: (sessionId: string, msg: ChatMessage) => void
  updateMessage: (sessionId: string, msgId: string, patch: Partial<ChatMessage>) => void
  clearMessages: (sessionId: string) => void

  // Hydration
  hydrate: () => Promise<void>
  persist: () => Promise<void>
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  view: 'chat',

  createSession: async (title) => {
    const id = crypto.randomUUID()
    const session: Session = {
      id,
      title: title ?? `대화 ${get().sessions.length + 1}`,
      messages: [],
      memoryId: id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    set((state) => ({
      sessions: [...state.sessions, session],
      currentSessionId: id,
    }))
    await get().persist()
    return id
  },

  selectSession: (id) => set({ currentSessionId: id }),

  deleteSession: async (id) => {
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      currentSessionId: state.currentSessionId === id
        ? state.sessions[0]?.id ?? null
        : state.currentSessionId,
    }))
    await get().persist()
  },

  setView: (view) => set({ view }),

  addMessage: (sessionId, msg) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, msg], updatedAt: Date.now() }
          : s
      ),
    }))
  },

  updateMessage: (sessionId, msgId, patch) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              messages: s.messages.map((m) =>
                m.id === msgId ? { ...m, ...patch } : m
              ),
            }
          : s
      ),
    }))
  },

  clearMessages: (sessionId) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, messages: [] } : s
      ),
    }))
  },

  hydrate: async () => {
    const saved = await Storage.get<{
      sessions: Session[]
      currentSessionId: string | null
    }>('hchat:sessions')
    if (saved) {
      set({
        sessions: saved.sessions,
        currentSessionId: saved.currentSessionId,
      })
    }
  },

  persist: async () => {
    const { sessions, currentSessionId } = get()
    await Storage.set('hchat:sessions', { sessions, currentSessionId })
  },
}))
```

### 3.2 Config 스토어

```typescript
// entities/config/config.store.ts
import { create } from 'zustand'
import { Storage } from '@/shared/lib/storage'

interface ConfigState {
  awsAccessKeyId: string
  awsSecretAccessKey: string
  awsRegion: string
  model: string
  darkMode: boolean
  triggerWord: string
  loaded: boolean

  updateConfig: (patch: Partial<ConfigState>) => Promise<void>
  hydrate: () => Promise<void>
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  awsAccessKeyId: '',
  awsSecretAccessKey: '',
  awsRegion: 'us-east-1',
  model: 'us.anthropic.claude-sonnet-4-6',
  darkMode: false,
  triggerWord: '@H',
  loaded: false,

  updateConfig: async (patch) => {
    set(patch)
    const state = get()
    await Storage.set('hchat:config', {
      awsAccessKeyId: state.awsAccessKeyId,
      awsSecretAccessKey: state.awsSecretAccessKey,
      awsRegion: state.awsRegion,
      model: state.model,
      darkMode: state.darkMode,
      triggerWord: state.triggerWord,
    })
    // Background SW용 별도 저장
    if (patch.awsAccessKeyId !== undefined || patch.awsSecretAccessKey !== undefined || patch.awsRegion !== undefined) {
      await Storage.set('hchat:config:aws', {
        awsAccessKeyId: state.awsAccessKeyId,
        awsSecretAccessKey: state.awsSecretAccessKey,
        awsRegion: state.awsRegion,
      })
    }
    if (patch.darkMode !== undefined) {
      document.documentElement.classList.toggle('dark', state.darkMode)
    }
  },

  hydrate: async () => {
    const saved = await Storage.get<Omit<ConfigState, 'loaded' | 'updateConfig' | 'hydrate'>>('hchat:config')
    if (saved) set({ ...saved, loaded: true })
    else set({ loaded: true })
  },
}))
```

### 3.3 Hydration 패턴

```typescript
// app/providers.tsx
import { useEffect } from 'react'
import { useSessionStore } from '@/entities/session/session.store'
import { useConfigStore } from '@/entities/config/config.store'

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const hydrateSession = useSessionStore((s) => s.hydrate)
  const hydrateConfig = useConfigStore((s) => s.hydrate)

  useEffect(() => {
    Promise.all([hydrateSession(), hydrateConfig()])
  }, [hydrateSession, hydrateConfig])

  const loaded = useConfigStore((s) => s.loaded)
  if (!loaded) return <div className="loading">...</div>

  return <>{children}</>
}
```

---

## 4. 메시지 통신 설계 (타입 안전)

### 4.1 메시지 타입 정의

```typescript
// shared/types/chrome-messages.ts

// Content Script → Background
interface OpenSidePanelMessage {
  type: 'open-sidepanel'
}

interface GetPageTextMessage {
  type: 'get-page-text'
}

interface GetPageTextResponse {
  text: string
  title: string
  url: string
}

// FAB → Side Panel (via chrome.storage)
interface PendingPrompt {
  action: 'ask' | 'summarize' | 'translate' | 'rewrite' | 'explain-code'
  text: string
  pageUrl: string
  pageTitle: string
  ts: number
}

// 타입 안전 메시지 버스
export type ExtensionMessage =
  | OpenSidePanelMessage
  | GetPageTextMessage

export type MessageResponseMap = {
  'open-sidepanel': void
  'get-page-text': GetPageTextResponse
}
```

### 4.2 타입 안전 메시지 전송

```typescript
// shared/lib/message-bus.ts
import type { ExtensionMessage, MessageResponseMap } from '@/shared/types/chrome-messages'

export async function sendMessage<T extends ExtensionMessage>(
  message: T
): Promise<MessageResponseMap[T['type']]> {
  return chrome.runtime.sendMessage(message)
}

// 사용 예시 (타입 안전)
const pageData = await sendMessage({ type: 'get-page-text' })
// pageData: GetPageTextResponse (자동 추론)
```

---

## 5. 스토리지 설계

### 5.1 키 네임스페이스

```typescript
// shared/lib/storage-keys.ts
export const STORAGE_KEYS = {
  CONFIG: 'hchat:config',
  CONFIG_AWS: 'hchat:config:aws',
  SESSIONS: 'hchat:sessions',
  MEMORY_PREFIX: 'hchat:memory:',
  SCHEDULER_TASKS: 'hchat:scheduler:tasks',
  SCHEDULED_RESULTS_PREFIX: 'hchat:scheduled-results:',
  PENDING_PROMPT: 'hchat:fab-pending',
  USAGE: 'hchat:usage',
  HIGHLIGHTS_PREFIX: 'hchat:highlights:',
  PROMPT_TEMPLATES: 'hchat:templates',
  AUDIT_LOGS: 'hchat:audit',
} as const
```

### 5.2 스토리지 용량 관리

```typescript
// shared/lib/storage.ts (확장)
export const Storage = {
  // ... 기존 get/set/remove/getAll ...

  /** 현재 사용량 (bytes) */
  async getUsage(): Promise<number> {
    return new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(null, resolve)
    })
  },

  /** 자동 정리 (10MB 중 8MB 초과 시) */
  async autoCleanup(): Promise<void> {
    const usage = await this.getUsage()
    const THRESHOLD = 8 * 1024 * 1024 // 8MB

    if (usage < THRESHOLD) return

    // 오래된 스케줄 결과 삭제
    const all = await chrome.storage.local.get(null)
    const resultKeys = Object.keys(all)
      .filter((k) => k.startsWith('hchat:scheduled-results:'))
    for (const key of resultKeys) {
      await chrome.storage.local.remove(key)
    }

    // 오래된 세션 메시지 트림 (최근 100개만 유지)
    // ...
  },
}
```

### 5.3 데이터 마이그레이션

```typescript
// shared/lib/migrations.ts
interface Migration {
  version: number
  up: () => Promise<void>
}

const migrations: Migration[] = [
  {
    version: 2,
    up: async () => {
      // v1 단일 대화 → v2 멀티 세션 마이그레이션
      const oldMessages = await Storage.get<any[]>('hchat:messages:hchat-main')
      if (oldMessages) {
        const session = {
          id: 'hchat-main',
          title: '기존 대화',
          messages: oldMessages,
          memoryId: 'hchat-main',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        await Storage.set('hchat:sessions', {
          sessions: [session],
          currentSessionId: 'hchat-main',
        })
      }
    },
  },
]

export async function runMigrations(): Promise<void> {
  const current = (await Storage.get<number>('hchat:schema-version')) ?? 1
  for (const m of migrations) {
    if (m.version > current) {
      await m.up()
      await Storage.set('hchat:schema-version', m.version)
    }
  }
}
```

---

## 6. Content Script 설계 (Shadow DOM)

### 6.1 FAB 격리

```typescript
// content/fab.ts (v2 — Shadow DOM 적용)
function init(): void {
  if (document.getElementById('hchat-fab-root')) return

  const root = document.createElement('div')
  root.id = 'hchat-fab-root'
  const shadow = root.attachShadow({ mode: 'closed' })

  // 스타일을 Shadow DOM 내부에 격리
  const style = document.createElement('style')
  style.textContent = FAB_STYLES // 기존 injectStyles() 내용
  shadow.appendChild(style)

  // FAB 버튼
  const fab = document.createElement('button')
  fab.id = 'hchat-fab'
  fab.textContent = 'H'
  fab.title = 'H Chat'
  shadow.appendChild(fab)

  // 메뉴
  const menu = document.createElement('div')
  menu.id = 'hchat-menu'
  // ... 메뉴 아이템 생성 ...
  shadow.appendChild(menu)

  document.body.appendChild(root)

  // 이벤트 리스너는 shadow 내부에 등록
  fab.addEventListener('click', handleFabClick)
  // ...
}
```

### 6.2 사이트별 비활성화

```typescript
// content/fab.ts
const BLOCKED_SITES = [
  'accounts.google.com',
  'banking.*',
  'mail.google.com',
]

function shouldInject(): boolean {
  const hostname = location.hostname
  return !BLOCKED_SITES.some((pattern) => {
    if (pattern.includes('*')) {
      return new RegExp(pattern.replace('*', '.*')).test(hostname)
    }
    return hostname === pattern
  })
}

if (shouldInject()) init()
```

---

## 7. Bedrock 클라이언트 개선

### 7.1 에러 타입 분류

```typescript
// shared/lib/bedrock.ts
export class BedrockError extends Error {
  constructor(
    message: string,
    public readonly code: BedrockErrorCode,
    public readonly recoverable: boolean,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = 'BedrockError'
  }
}

export type BedrockErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EXPIRED_CREDENTIALS'
  | 'THROTTLED'
  | 'MODEL_NOT_FOUND'
  | 'CONTEXT_TOO_LONG'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN'

function classifyError(status: number, body: string): BedrockError {
  if (status === 403) {
    return new BedrockError('AWS 자격증명이 유효하지 않습니다', 'INVALID_CREDENTIALS', false, status)
  }
  if (status === 429) {
    return new BedrockError('요청이 너무 많습니다. 잠시 후 다시 시도하세요', 'THROTTLED', true, status)
  }
  if (status === 400 && body.includes('too many tokens')) {
    return new BedrockError('대화가 너무 길어졌습니다. 새 대화를 시작하세요', 'CONTEXT_TOO_LONG', false, status)
  }
  return new BedrockError(body || `HTTP ${status}`, 'UNKNOWN', false, status)
}
```

### 7.2 재시도 로직

```typescript
// shared/lib/bedrock.ts
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 2
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, init)
      if (res.status === 429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 // 1s, 2s
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      return res
    } catch (err) {
      lastError = err as Error
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
  }

  throw new BedrockError(
    lastError?.message ?? 'Network error',
    'NETWORK_ERROR',
    true
  )
}
```

### 7.3 컨텍스트 윈도우 관리

```typescript
// shared/lib/bedrock.ts
const MODEL_LIMITS: Record<string, number> = {
  'us.anthropic.claude-sonnet-4-6': 200_000,
  'us.anthropic.claude-opus-4-6-v1': 200_000,
  'us.anthropic.claude-haiku-4-5-20251001-v1:0': 200_000,
}

/** 간이 토큰 추정 (한국어 1자 ~2토큰, 영어 1단어 ~1.3토큰) */
function estimateTokens(text: string): number {
  const korean = (text.match(/[\uAC00-\uD7AF]/g) ?? []).length
  const rest = text.length - korean
  return Math.ceil(korean * 2 + rest * 0.4)
}

/** 컨텍스트 윈도우 초과 시 오래된 메시지 트림 */
function trimMessages(
  messages: Message[],
  systemPrompt: string,
  model: string,
  maxTokens: number
): Message[] {
  const limit = MODEL_LIMITS[model] ?? 200_000
  const reserved = maxTokens + estimateTokens(systemPrompt) + 1000 // 안전 마진
  const available = limit - reserved

  let total = 0
  const result: Message[] = []

  // 최신 메시지부터 역순으로 추가
  for (let i = messages.length - 1; i >= 0; i--) {
    const tokens = estimateTokens(messages[i].content)
    if (total + tokens > available) break
    total += tokens
    result.unshift(messages[i])
  }

  return result
}
```

---

## 8. 슬래시 명령어 설계

### 8.1 명령어 레지스트리

```typescript
// shared/lib/commands.ts
export interface Command {
  name: string          // '/요약'
  aliases: string[]     // ['/summarize', '/sum']
  description: string
  execute: (args: string, context: CommandContext) => Promise<string>
}

interface CommandContext {
  pageText: string
  pageTitle: string
  pageUrl: string
  selectedText: string
  sessionId: string
}

const commands: Command[] = [
  {
    name: '/요약',
    aliases: ['/summarize', '/sum'],
    description: '현재 페이지 또는 선택 텍스트를 요약합니다',
    execute: async (args, ctx) => {
      const text = args || ctx.selectedText || ctx.pageText
      return `[페이지: ${ctx.pageTitle}]\n\n다음 내용을 한국어로 요약해줘:\n\n${text}`
    },
  },
  {
    name: '/번역',
    aliases: ['/translate', '/tr'],
    description: '텍스트를 번역합니다 (한↔영 자동 감지)',
    execute: async (args, ctx) => {
      const text = args || ctx.selectedText
      return `다음 텍스트를 한국어로 번역해줘 (이미 한국어면 영어로):\n\n${text}`
    },
  },
  {
    name: '/코드',
    aliases: ['/code', '/explain'],
    description: '코드를 설명합니다',
    execute: async (args, ctx) => {
      const text = args || ctx.selectedText
      return `다음 코드를 설명해줘:\n\n${text}`
    },
  },
  {
    name: '/메모',
    aliases: ['/memo', '/memory'],
    description: '메모리에 내용을 추가합니다',
    execute: async (args, ctx) => {
      // MemoryStore에 직접 append
      const { useMemoryStore } = await import('@/entities/memory/memory.store')
      await useMemoryStore.getState().append(ctx.sessionId, args)
      return '' // 채팅에 전송하지 않음
    },
  },
]

export function findCommand(input: string): { command: Command; args: string } | null {
  const trimmed = input.trim()
  for (const cmd of commands) {
    const names = [cmd.name, ...cmd.aliases]
    for (const name of names) {
      if (trimmed.startsWith(name)) {
        return { command: cmd, args: trimmed.slice(name.length).trim() }
      }
    }
  }
  return null
}

export function getCommands(): Command[] {
  return commands
}
```

---

## 9. 테스트 전략

### 9.1 테스트 설정

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: { statements: 80, branches: 70, functions: 80, lines: 80 },
    },
  },
})
```

### 9.2 chrome.* API 모킹

```typescript
// src/test/setup.ts
const storageMock: Record<string, unknown> = {}

global.chrome = {
  storage: {
    local: {
      get: vi.fn((keys) => {
        if (typeof keys === 'string') {
          return Promise.resolve({ [keys]: storageMock[keys] })
        }
        return Promise.resolve(storageMock)
      }),
      set: vi.fn((items) => {
        Object.assign(storageMock, items)
        return Promise.resolve()
      }),
      remove: vi.fn((key) => {
        delete storageMock[key]
        return Promise.resolve()
      }),
      getBytesInUse: vi.fn(() => Promise.resolve(0)),
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    sync: { get: vi.fn(), set: vi.fn() },
    session: { get: vi.fn(), set: vi.fn() },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
    onInstalled: { addListener: vi.fn() },
    onStartup: { addListener: vi.fn() },
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
    onAlarm: { addListener: vi.fn() },
  },
  sidePanel: { open: vi.fn() },
  tabs: { query: vi.fn() },
  scripting: { executeScript: vi.fn() },
  notifications: { create: vi.fn() },
} as unknown as typeof chrome
```

### 9.3 테스트 우선순위

| 우선순위 | 대상 | 테스트 유형 |
|---------|------|-----------|
| 1 | Storage, MemoryStore, Scheduler | 단위 테스트 |
| 2 | aws-sigv4.ts, bedrock.ts | 단위 테스트 |
| 3 | session.store.ts, config.store.ts | 단위 테스트 |
| 4 | ChatView, MemoryPanel | 컴포넌트 테스트 |
| 5 | FAB → SidePanel 흐름 | 통합 테스트 |
| 6 | 전체 채팅 플로우 | E2E 테스트 |

---

## 10. 빌드 설정 개선

### 10.1 Vite 설정 (path alias + 코드 스플리팅)

```typescript
// vite.config.ts (v2)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'sidepanel.html'),
        popup: resolve(__dirname, 'popup.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        'content-fab': resolve(__dirname, 'src/content/fab.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background') return 'src/background/index.js'
          if (chunk.name === 'content-fab') return 'src/content/fab.js'
          return 'assets/[name]-[hash].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // 번들 크기 최적화
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // 프로덕션에서 console.log 제거
      },
    },
  },

  define: {
    'process.env': {},
  },
})
```

### 10.2 tsconfig (path alias)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "types": ["chrome"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "*.ts"]
}
```

---

## 11. 마이그레이션 전략

### v1 → v2 점진적 마이그레이션

```
Phase 0 (인프라) — 1일
├── Zustand 설치 + config.store.ts 생성
├── tsconfig path alias 추가
├── Vitest 설치 + chrome.* 모킹
├── Storage 키 상수화
└── runMigrations() 프레임워크

Phase 1-A (코어 리팩토링) — 2일
├── useConfig → config.store.ts 마이그레이션
├── useChat → session.store.ts 마이그레이션
├── useMemory → memory.store.ts 마이그레이션
├── App.tsx → view 라우팅 개선
└── 멀티 세션 지원

Phase 1-B (신규 기능) — 3일
├── 슬래시 명령어
├── 메시지 검색
├── 대화 내보내기
└── 컨텍스트 스택

테스트 작성 — 각 단계마다 병행
└── 80%+ 커버리지 목표
```

### 호환성 보장

```typescript
// 마이그레이션 시 기존 데이터 보존
// v1 스토리지 키 → v2 스토리지 키 자동 변환
// 실패 시 롤백 가능하도록 원본 유지
```

---

## 12. 성능 최적화

### 12.1 React.lazy 탭별 로딩

```typescript
// app/sidepanel/App.tsx
const ChatPage = lazy(() => import('@/pages/chat/ChatPage'))
const MemoryPage = lazy(() => import('@/pages/memory/MemoryPage'))
const SchedulerPage = lazy(() => import('@/pages/scheduler/SchedulerPage'))
const SwarmPage = lazy(() => import('@/pages/swarm/SwarmPage'))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'))

function App() {
  const view = useSessionStore((s) => s.view)

  return (
    <Suspense fallback={<Loading />}>
      {view === 'chat' && <ChatPage />}
      {view === 'memory' && <MemoryPage />}
      {/* ... */}
    </Suspense>
  )
}
```

### 12.2 메시지 가상화 (50+ 메시지)

```typescript
// widgets/chat-view/ChatView.tsx
import { FixedSizeList } from 'react-window'

function MessageList({ messages }: { messages: ChatMessage[] }) {
  if (messages.length < 50) {
    return messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
  }

  return (
    <FixedSizeList
      height={600}
      itemCount={messages.length}
      itemSize={80}
      width="100%"
    >
      {({ index, style }) => (
        <MessageBubble style={style} msg={messages[index]} />
      )}
    </FixedSizeList>
  )
}
```

### 12.3 스토리지 쓰기 디바운스

```typescript
// entities/session/session.store.ts
import { debounce } from '@/shared/lib/utils'

const debouncedPersist = debounce(async (state: SessionState) => {
  await Storage.set('hchat:sessions', {
    sessions: state.sessions,
    currentSessionId: state.currentSessionId,
  })
}, 500)
```

---

## 요약

| 설계 영역 | 현재 (v1) | 목표 (v2) |
|-----------|-----------|-----------|
| 상태 관리 | useState + props | Zustand + chrome.storage |
| 디렉토리 | 플랫 구조 | FSD (pages/widgets/entities/shared) |
| 세션 | 단일 (hchat-main) | 멀티 세션 CRUD |
| 타입 안전 | 부분적 any | 완전 타입 (메시지 버스 포함) |
| 에러 처리 | 기본 try-catch | 분류형 에러 + 재시도 |
| 테스트 | 0% | 80%+ (Vitest) |
| FAB 격리 | 글로벌 CSS | Shadow DOM |
| 빌드 | 기본 Vite | terser + console 제거 |
| 성능 | 전체 렌더 | lazy + 가상화 + 디바운스 |
