# hooks 디렉토리

## 개요

React 커스텀 훅들을 포함하는 디렉토리입니다.
상태 관리, 비즈니스 로직, 데이터 페칭을 캡슐화하여 컴포넌트에서 재사용 가능하게 만듭니다.

## 파일 목록

### useMemory.ts (34줄)

대화별 메모리(CLAUDE.md) 관리 훅입니다.

#### 시그니처

```typescript
function useMemory(conversationId: string): {
  entry: MemoryEntry | null
  loading: boolean
  update: (content: string) => Promise<void>
  append: (text: string) => Promise<void>
  clear: () => Promise<void>
  refresh: () => Promise<void>
}
```

#### 파라미터

- `conversationId: string` - 대화 ID

#### 반환값

- `entry: MemoryEntry | null` - 메모리 엔트리 (없으면 null)
  ```typescript
  interface MemoryEntry {
    conversationId: string
    content: string
    updatedAt: number
  }
  ```
- `loading: boolean` - 로딩 상태
- `update: (content: string) => Promise<void>` - 메모리 내용 전체 교체
- `append: (text: string) => Promise<void>` - 메모리에 텍스트 추가
- `clear: () => Promise<void>` - 메모리 삭제
- `refresh: () => Promise<void>` - 메모리 다시 불러오기

#### 내부 상태

- `entry: MemoryEntry | null` - 현재 메모리 엔트리
- `loading: boolean` - 로딩 상태

#### 내부 함수

1. **refresh()** (9-14줄)
   - MemoryStore.get(conversationId) 호출
   - 결과를 entry 상태에 설정
   - loading 상태 관리

2. **update(content: string)** (18-21줄)
   - MemoryStore.set(conversationId, content) 호출
   - 업데이트된 엔트리를 entry 상태에 설정

3. **append(text: string)** (23-26줄)
   - MemoryStore.append(conversationId, text) 호출
   - 업데이트된 엔트리를 entry 상태에 설정

4. **clear()** (28-31줄)
   - MemoryStore.delete(conversationId) 호출
   - entry 상태를 null로 설정

#### useEffect 훅

- `conversationId` 변경 시 refresh() 자동 호출 (16줄)

#### 의존성

- `../lib/memory`: MemoryStore

#### 사용 예시

```typescript
const { entry, loading, update, clear } = useMemory('hchat-main')

if (loading) return <div>로딩 중...</div>

return (
  <div>
    {entry ? (
      <>
        <pre>{entry.content}</pre>
        <button onClick={() => update('# 새 내용')}>업데이트</button>
        <button onClick={clear}>초기화</button>
      </>
    ) : (
      <button onClick={() => update('# 대화 메모리\n\n')}>메모리 만들기</button>
    )}
  </div>
)
```

---

### useScheduler.ts (39줄)

예약 작업 관리 훅입니다.

#### 시그니처

```typescript
function useScheduler(conversationId: string): {
  tasks: ScheduledTask[]
  loading: boolean
  addTask: (params: { label: string; prompt: string; schedule: CronLike }) => Promise<ScheduledTask>
  toggleTask: (id: string, enabled: boolean) => Promise<void>
  removeTask: (id: string) => Promise<void>
  refresh: () => Promise<void>
  describeSchedule: (schedule: CronLike) => string
}
```

#### 파라미터

- `conversationId: string` - 대화 ID

#### 반환값

- `tasks: ScheduledTask[]` - 현재 대화의 예약 작업 목록
- `loading: boolean` - 로딩 상태
- `addTask` - 작업 추가
- `toggleTask` - 작업 활성화/비활성화
- `removeTask` - 작업 삭제
- `refresh` - 작업 목록 다시 불러오기
- `describeSchedule` - 스케줄을 한국어 문자열로 변환

#### 내부 상태

- `tasks: ScheduledTask[]` - 현재 대화의 작업 목록
- `loading: boolean` - 로딩 상태

#### 내부 함수

1. **refresh()** (9-14줄)
   - Scheduler.list() 호출하여 전체 작업 조회
   - conversationId로 필터링
   - tasks 상태 설정

2. **addTask(params)** (18-26줄)
   - Scheduler.add() 호출
   - conversationId와 enabled=true 추가
   - tasks 상태에 새 작업 추가
   - chrome.alarms 자동 등록 (Scheduler.add 내부)

3. **toggleTask(id, enabled)** (28-31줄)
   - Scheduler.toggle() 호출
   - tasks 상태에서 해당 작업의 enabled 업데이트

4. **removeTask(id)** (33-36줄)
   - Scheduler.remove() 호출
   - tasks 상태에서 해당 작업 제거
   - chrome.alarms 자동 해제 (Scheduler.remove 내부)

#### useEffect 훅

- `conversationId` 변경 시 refresh() 자동 호출 (16줄)

#### 의존성

- `../lib/scheduler`: Scheduler, describeSchedule

#### 사용 예시

```typescript
const { tasks, addTask, toggleTask, removeTask, describeSchedule } = useScheduler('hchat-main')

const handleAdd = async () => {
  await addTask({
    label: '일일 뉴스 요약',
    prompt: '오늘 AI 뉴스 요약해줘',
    schedule: { type: 'daily', hour: 9, minute: 0 }
  })
}

return (
  <div>
    {tasks.map(task => (
      <div key={task.id}>
        <span>{task.label}</span>
        <span>{describeSchedule(task.schedule)}</span>
        <button onClick={() => toggleTask(task.id, !task.enabled)}>
          {task.enabled ? '비활성화' : '활성화'}
        </button>
        <button onClick={() => removeTask(task.id)}>삭제</button>
      </div>
    ))}
  </div>
)
```

---

### useSwarm.ts (63줄)

Agent Swarms 실행 훅입니다.

#### 시그니처

```typescript
function useSwarm(config: Config): {
  status: SwarmStatus
  agentStates: AgentState[]
  synthesis: string
  error: string
  run: (agents: AgentDef[], prompt: string, ctx?: string) => Promise<{ results: SwarmResult[]; synthesis: string } | null>
  reset: () => void
}
```

#### 파라미터

- `config: Config` - AWS 자격증명 및 모델 설정

#### 타입 정의

```typescript
type SwarmStatus = 'idle' | 'running' | 'done' | 'error'

interface AgentState extends AgentDef {
  status: 'waiting' | 'running' | 'done' | 'error'
  result?: SwarmResult
}
```

#### 반환값

- `status: SwarmStatus` - 실행 상태
- `agentStates: AgentState[]` - 각 에이전트의 실행 상태
- `synthesis: string` - 오케스트레이터가 생성한 종합 결과
- `error: string` - 에러 메시지
- `run` - Swarm 실행 함수
- `reset` - 상태 초기화

#### 내부 상태

- `status: SwarmStatus` - 실행 상태
- `agentStates: AgentState[]` - 에이전트 상태 목록
- `synthesis: string` - 종합 결과
- `error: string` - 에러 메시지

#### 내부 함수

1. **run(agents, prompt, ctx)** (19-53줄)
   - 상태 초기화 (status='running', agentStates 설정)
   - AgentSwarm.run() 호출:
     - AWS 자격증명 전달
     - onAgentStart 콜백: agentStates의 해당 에이전트 status='running'
     - onAgentDone 콜백: agentStates의 해당 에이전트 status='done'/'error', result 설정
   - 성공: synthesis 설정, status='done'
   - 실패: error 설정, status='error'

2. **reset()** (55-60줄)
   - 모든 상태를 초기값으로 리셋

#### 의존성

- `../lib/swarm`: AgentSwarm
- `./useConfig`: Config 타입

#### 사용 예시

```typescript
const { status, agentStates, synthesis, run, reset } = useSwarm(config)

const handleRun = async () => {
  const agents = [
    { id: 'researcher', role: '리서처', systemPrompt: '...', emoji: '🔍' },
    { id: 'analyst', role: '분석가', systemPrompt: '...', emoji: '📊' },
  ]
  await run(agents, '최신 AI 트렌드 분석')
}

return (
  <div>
    {agentStates.map(agent => (
      <div key={agent.id}>
        {agent.emoji} {agent.role} - {agent.status}
      </div>
    ))}
    {status === 'done' && <div>종합 결과: {synthesis}</div>}
    <button onClick={handleRun} disabled={status === 'running'}>실행</button>
    {status !== 'idle' && <button onClick={reset}>초기화</button>}
  </div>
)
```

---

### useChat.ts (89줄)

채팅 메시지 관리 및 전송 훅입니다.

#### 시그니처

```typescript
function useChat(conversationId: string, config: Config): {
  messages: ChatMessage[]
  isLoading: boolean
  error: string
  sendMessage: (userText: string) => Promise<void>
  clearMessages: () => void
}
```

#### 파라미터

- `conversationId: string` - 대화 ID
- `config: Config` - AWS 자격증명 및 모델 설정

#### 타입 정의

```typescript
interface ChatMessage extends Message {
  id: string
  ts: number
  streaming?: boolean
}
```

#### 반환값

- `messages: ChatMessage[]` - 채팅 메시지 목록
- `isLoading: boolean` - 메시지 전송 중 여부
- `error: string` - 에러 메시지
- `sendMessage` - 메시지 전송 함수
- `clearMessages` - 메시지 목록 초기화

#### 내부 상태

- `messages: ChatMessage[]` - 메시지 목록
- `isLoading: boolean` - 로딩 상태
- `error: string` - 에러 메시지

#### 내부 함수

1. **sendMessage(userText)** (20-84줄)
   - 유효성 검증: hasCredentials, 빈 텍스트 체크
   - 사용자 메시지 생성 → messages에 추가
   - 어시스턴트 메시지 생성 (빈 content, streaming=true) → messages에 추가
   - 시스템 프롬프트 구성:
     ```typescript
     const systemPrompt = '당신은 도움이 되는 AI 어시스턴트입니다.' +
       await MemoryStore.toSystemPrompt(conversationId)
     ```
   - 대화 히스토리 구성 (기존 messages + 새 사용자 메시지)
   - chat() 호출:
     - onChunk 콜백: messages의 어시스턴트 메시지 content 업데이트 (스트리밍 효과)
   - 완료: streaming=false 설정
   - 실패: 에러 메시지 설정, 어시스턴트 메시지 제거

2. **clearMessages()** (86줄)
   - messages를 빈 배열로 설정

#### 의존성

- `../lib/claude`: chat 함수
- `../lib/memory`: MemoryStore
- `./useConfig`: Config 타입

#### 사용 예시

```typescript
const { messages, isLoading, error, sendMessage, clearMessages } = useChat('hchat-main', config)

return (
  <div>
    {messages.map(msg => (
      <div key={msg.id}>
        <strong>{msg.role}:</strong> {msg.content}
        {msg.streaming && <span>▌</span>}
      </div>
    ))}
    {error && <div style={{ color: 'red' }}>{error}</div>}
    <input
      onKeyDown={(e) => {
        if (e.key === 'Enter') sendMessage(e.currentTarget.value)
      }}
      disabled={isLoading}
    />
    <button onClick={clearMessages}>대화 초기화</button>
  </div>
)
```

---

### useConfig.ts (47줄)

전역 설정 관리 훅입니다.

#### 시그니처

```typescript
function useConfig(): {
  config: Config
  updateConfig: (patch: Partial<Config>) => Promise<void>
  loaded: boolean
}
```

#### 타입 정의

```typescript
interface Config {
  awsAccessKeyId: string
  awsSecretAccessKey: string
  awsRegion: string
  model: string
  triggerWord: string
}
```

#### 기본값

```typescript
const DEFAULT_CONFIG: Config = {
  awsAccessKeyId: '',
  awsSecretAccessKey: '',
  awsRegion: 'us-east-1',
  model: 'us.anthropic.claude-sonnet-4-6',
  triggerWord: '@H',
}
```

#### 반환값

- `config: Config` - 현재 설정
- `updateConfig` - 설정 업데이트 함수
- `loaded: boolean` - 초기 로드 완료 여부

#### 내부 상태

- `config: Config` - 현재 설정
- `loaded: boolean` - 로드 완료 여부

#### 내부 함수

1. **updateConfig(patch)** (32-44줄)
   - config와 patch 병합
   - Storage.set('hchat:config', updated) 호출
   - AWS 자격증명 변경 시 별도 저장:
     ```typescript
     Storage.set('hchat:config:aws', {
       awsAccessKeyId,
       awsSecretAccessKey,
       awsRegion,
     })
     ```
   - background/index.ts에서 'hchat:config:aws'를 사용하여 AWS 자격증명 조회

#### useEffect 훅

- 마운트 시 Storage.get('hchat:config') 호출 → DEFAULT_CONFIG와 병합 → loaded=true (25-30줄)

#### 의존성

- `../lib/storage`: Storage

#### 사용 예시

```typescript
const { config, updateConfig, loaded } = useConfig()

if (!loaded) return <div>로딩 중...</div>

return (
  <div>
    <input
      value={config.awsAccessKeyId}
      onChange={(e) => updateConfig({ awsAccessKeyId: e.target.value })}
    />
    <input
      value={config.awsSecretAccessKey}
      onChange={(e) => updateConfig({ awsSecretAccessKey: e.target.value })}
    />
    <select
      value={config.model}
      onChange={(e) => updateConfig({ model: e.target.value })}
    >
      <option value="us.anthropic.claude-sonnet-4-6">Claude Sonnet 4.6</option>
      <option value="us.anthropic.claude-opus-4-6-v1">Claude Opus 4.6</option>
    </select>
  </div>
)
```

## 공통 패턴

### 불변성
모든 훅은 상태를 직접 변경하지 않고 새 객체를 생성합니다.

### 비동기 처리
Storage/API 호출은 async/await로 처리하며, 에러는 try-catch로 캡처합니다.

### 자동 새로고침
useEffect로 의존성 변경 시 자동으로 데이터를 다시 불러옵니다.

### 컴포넌트 분리
비즈니스 로직을 훅으로 분리하여 컴포넌트는 UI 렌더링에만 집중합니다.
