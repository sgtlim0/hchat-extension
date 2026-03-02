# lib 디렉토리

## 개요

비즈니스 로직, 데이터 저장소, API 클라이언트 등의 유틸리티 함수와 클래스를 포함하는 디렉토리입니다.
React 컴포넌트나 훅에서 사용되는 핵심 기능들을 제공합니다.

## 파일 목록

### storage.ts (27줄)

chrome.storage.local API의 추상화 레이어입니다. localStorage 대신 사용하여 팝업이 닫혀도 데이터가 유지됩니다.

#### 내보내기

```typescript
export const Storage = {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  getAll<T>(prefix: string): Promise<Record<string, T>>
}
```

#### 함수 설명

1. **get\<T\>(key: string): Promise\<T | null\>** (6-9줄)
   - 지정된 키의 값을 조회
   - 없으면 null 반환
   - 제네릭 타입 T로 타입 안전성 제공

2. **set\<T\>(key: string, value: T): Promise\<void\>** (11-13줄)
   - 지정된 키에 값 저장
   - 기존 값 덮어쓰기

3. **remove(key: string): Promise\<void\>** (15-17줄)
   - 지정된 키 삭제

4. **getAll\<T\>(prefix: string): Promise\<Record\<string, T\>\>** (19-26줄)
   - 특정 접두사로 시작하는 모든 키/값 조회
   - chrome.storage.local.get(null)로 전체 조회 후 필터링

#### 사용 예시

```typescript
// 저장
await Storage.set('hchat:config', { model: 'claude-sonnet' })

// 조회
const config = await Storage.get<Config>('hchat:config')

// 삭제
await Storage.remove('hchat:config')

// 접두사로 조회
const allMemories = await Storage.getAll<MemoryEntry>('hchat:memory:')
```

---

### memory.ts (47줄)

nanoclaw CLAUDE.md 스타일의 대화별 메모리 관리 모듈입니다.

#### 타입 정의

```typescript
interface MemoryEntry {
  conversationId: string
  content: string        // 마크다운 형식
  updatedAt: number      // 타임스탬프
}
```

#### 상수

```typescript
const PREFIX = 'hchat:memory:'
```

#### 내보내기

```typescript
export const MemoryStore = {
  get(conversationId: string): Promise<MemoryEntry | null>
  set(conversationId: string, content: string): Promise<MemoryEntry>
  append(conversationId: string, text: string): Promise<MemoryEntry>
  list(): Promise<MemoryEntry[]>
  delete(conversationId: string): Promise<void>
  toSystemPrompt(conversationId: string): Promise<string>
}
```

#### 함수 설명

1. **get(conversationId)** (15-17줄)
   - 대화 ID로 메모리 조회
   - 없으면 null 반환

2. **set(conversationId, content)** (19-23줄)
   - 메모리 내용 전체 교체
   - updatedAt 자동 갱신
   - MemoryEntry 반환

3. **append(conversationId, text)** (25-31줄)
   - 기존 메모리에 텍스트 추가
   - 메모리 없으면 `# 대화 메모리\n\n{text}` 형식으로 생성
   - 있으면 `{existing.content}\n{text}` 형식으로 추가

4. **list()** (33-36줄)
   - 모든 메모리 조회
   - updatedAt 내림차순 정렬 (최신순)

5. **delete(conversationId)** (38-40줄)
   - 메모리 삭제

6. **toSystemPrompt(conversationId)** (42-46줄)
   - 메모리를 시스템 프롬프트 형식으로 변환
   - 없으면 빈 문자열 반환
   - 형식:
     ```

     ---
     # 이 대화에 대한 기억 (CLAUDE.md)
     {entry.content}
     ---

     ```

#### 저장 구조

```typescript
chrome.storage.local = {
  'hchat:memory:conv-123': {
    conversationId: 'conv-123',
    content: '# 대화 메모리\n\n이 대화는 AI 트렌드에 관한 것입니다.',
    updatedAt: 1678901234567
  },
  'hchat:memory:conv-456': { ... }
}
```

#### 사용 예시

```typescript
// 메모리 생성/업데이트
await MemoryStore.set('hchat-main', '# 대화 메모리\n\n중요한 정보')

// 메모리에 추가
await MemoryStore.append('hchat-main', '추가 정보')

// 메모리 조회
const entry = await MemoryStore.get('hchat-main')
console.log(entry?.content)

// 시스템 프롬프트로 변환
const systemPrompt = '당신은 AI 어시스턴트입니다.' +
  await MemoryStore.toSystemPrompt('hchat-main')
```

---

### scheduler.ts (130줄)

nanoclaw 스타일의 예약 작업 스케줄러입니다. chrome.alarms API를 사용하여 팝업/사이드패널이 닫혀도 백그라운드에서 작업을 실행합니다.

#### 타입 정의

```typescript
interface ScheduledTask {
  id: string
  label: string
  prompt: string
  conversationId: string
  schedule: CronLike
  enabled: boolean
  lastRun?: number      // 마지막 실행 시간
  nextRun: number       // 다음 실행 시간
  createdAt: number
}

type CronLike =
  | { type: 'interval'; minutes: number }
  | { type: 'daily'; hour: number; minute: number }
  | { type: 'weekdays'; hour: number; minute: number }
```

#### 상수

```typescript
const STORE_KEY = 'hchat:scheduler:tasks'
const ALARM_PREFIX = 'hchat-task-'
```

#### 유틸리티 함수

1. **calcNextRun(schedule: CronLike, from?: number): number** (29-43줄)
   - 다음 실행 시간을 계산
   - interval: from + minutes * 60 * 1000
   - daily/weekdays: 다음 지정 시간 (오늘 지나면 내일)
   - weekdays: 주말이면 다음 평일로 이동

2. **describeSchedule(schedule: CronLike): string** (45-49줄)
   - 스케줄을 한국어 문자열로 변환
   - interval: "N분마다"
   - daily: "매일 HH:MM"
   - weekdays: "평일 HH:MM"

#### 내보내기

```typescript
export const Scheduler = {
  list(): Promise<ScheduledTask[]>
  add(params: Omit<ScheduledTask, 'id' | 'nextRun' | 'createdAt'>): Promise<ScheduledTask>
  toggle(id: string, enabled: boolean): Promise<void>
  remove(id: string): Promise<void>
  markRun(id: string): Promise<void>
  registerAlarm(task: ScheduledTask): Promise<void>
  restoreAllAlarms(): Promise<void>
}
```

#### 함수 설명

1. **list()** (54-56줄)
   - 모든 예약 작업 조회
   - Storage.get(STORE_KEY) → ScheduledTask[]

2. **add(params)** (58-72줄)
   - 작업 추가
   - id: crypto.randomUUID() 생성
   - nextRun: calcNextRun() 계산
   - tasks 배열에 추가 → Storage 저장
   - registerAlarm() 호출하여 chrome.alarms 등록

3. **toggle(id, enabled)** (74-88줄)
   - 작업 활성화/비활성화
   - enabled=true: registerAlarm() 호출
   - enabled=false: chrome.alarms.clear() 호출

4. **remove(id)** (90-94줄)
   - 작업 삭제
   - tasks 배열에서 제거 → Storage 저장
   - chrome.alarms.clear() 호출

5. **markRun(id)** (96-105줄)
   - 작업 실행 완료 후 호출 (background/index.ts에서)
   - lastRun 업데이트
   - nextRun 재계산 (calcNextRun)
   - registerAlarm() 호출하여 다음 알람 등록

6. **registerAlarm(task)** (107-122줄)
   - chrome.alarms API에 알람 등록
   - alarmName: ALARM_PREFIX + task.id
   - interval: periodInMinutes 옵션 사용
   - daily/weekdays: delayInMinutes 옵션 사용 (다음 실행 시간까지의 간격)

7. **restoreAllAlarms()** (124-129줄)
   - 모든 활성화된 작업의 알람을 재등록
   - 확장 프로그램 재시작/업데이트 시 호출 (background/index.ts)

#### 데이터 흐름

```
UI (SchedulerPanel)
  ↓
useScheduler hook
  ↓
Scheduler.add() → Storage.set() + registerAlarm()
  ↓
chrome.alarms.create()
  ↓
[시간이 지나면...]
  ↓
chrome.alarms.onAlarm (background/index.ts)
  ↓
AWS Bedrock API 호출
  ↓
Scheduler.markRun() → nextRun 재계산 → registerAlarm()
```

#### 사용 예시

```typescript
// 작업 추가
const task = await Scheduler.add({
  label: '일일 AI 뉴스',
  prompt: '오늘 AI 뉴스 요약해줘',
  conversationId: 'hchat-main',
  schedule: { type: 'daily', hour: 9, minute: 0 },
  enabled: true
})

// 작업 목록 조회
const tasks = await Scheduler.list()

// 작업 토글
await Scheduler.toggle(task.id, false)

// 작업 삭제
await Scheduler.remove(task.id)
```

---

### aws-sigv4.ts (94줄)

AWS Signature Version 4 서명 생성 모듈입니다. Web Crypto API를 사용하여 브라우저 환경에서 AWS API 요청에 서명합니다.

#### 타입 정의

```typescript
interface SignParams {
  method: string              // HTTP 메서드 (POST, GET 등)
  url: string                 // 전체 URL
  headers: Record<string, string>
  body: string
  accessKeyId: string
  secretAccessKey: string
  region: string              // AWS 리전 (us-east-1 등)
  service: string             // AWS 서비스 (bedrock 등)
}
```

#### 내부 함수

1. **toHex(buffer: ArrayBuffer): string** (14-18줄)
   - ArrayBuffer를 16진수 문자열로 변환

2. **sha256(data: string): Promise\<string\>** (20-23줄)
   - SHA-256 해시 생성
   - Web Crypto API 사용

3. **hmacSha256(key: ArrayBuffer, data: string): Promise\<ArrayBuffer\>** (25-30줄)
   - HMAC-SHA256 생성
   - Web Crypto API 사용

4. **getSigningKey(secretKey, dateStamp, region, service): Promise\<ArrayBuffer\>** (32-39줄)
   - AWS SigV4 서명 키 생성
   - kDate = HMAC("AWS4" + secretKey, dateStamp)
   - kRegion = HMAC(kDate, region)
   - kService = HMAC(kRegion, service)
   - signingKey = HMAC(kService, "aws4_request")

5. **encodeCanonicalUri(pathname: string): string** (42-47줄)
   - URI 경로를 정규화
   - 각 세그먼트를 encodeURIComponent()로 인코딩
   - 이중 인코딩 지원 (%XX → %25XX)

#### 내보내기

```typescript
export async function signRequest(params: SignParams): Promise<Record<string, string>>
```

#### 함수 설명

**signRequest(params)** (49-94줄)
- AWS Signature Version 4 서명 생성
- 반환: 서명된 헤더 (Authorization 헤더 포함)

**처리 단계:**

1. **타임스탬프 생성** (54-55줄)
   - amzDate: ISO 8601 형식 (20230101T120000Z)
   - dateStamp: YYYYMMDD 형식

2. **헤더 구성** (57-61줄)
   - 기존 헤더 + host + x-amz-date

3. **Canonical Request 생성** (63-77줄)
   ```
   METHOD
   /canonical/uri
   query=params
   canonical-headers

   signed-headers
   payload-hash
   ```

4. **String to Sign 생성** (79-85줄)
   ```
   AWS4-HMAC-SHA256
   {amzDate}
   {dateStamp}/{region}/{service}/aws4_request
   SHA256({canonicalRequest})
   ```

5. **서명 계산** (87-88줄)
   - signingKey = getSigningKey(...)
   - signature = HMAC(signingKey, stringToSign)

6. **Authorization 헤더 생성** (90-93줄)
   ```
   AWS4-HMAC-SHA256 Credential={accessKeyId}/{credentialScope}, SignedHeaders={signedHeaders}, Signature={signature}
   ```

#### 사용 예시

```typescript
const bodyStr = JSON.stringify({
  anthropic_version: 'bedrock-2023-05-31',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hi' }]
})

const url = 'https://bedrock-runtime.us-east-1.amazonaws.com/model/us.anthropic.claude-sonnet-4-6/invoke'

const signedHeaders = await signRequest({
  method: 'POST',
  url,
  headers: { 'content-type': 'application/json' },
  body: bodyStr,
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  region: 'us-east-1',
  service: 'bedrock'
})

const response = await fetch(url, {
  method: 'POST',
  headers: signedHeaders,
  body: bodyStr
})
```

---

### swarm.ts (157줄)

nanoclaw Agent Swarms 구현입니다. 여러 AI 에이전트를 병렬로 실행하고 결과를 종합합니다.

#### 타입 정의

```typescript
interface AgentDef {
  id: string
  role: string            // "리서처", "분석가" 등
  systemPrompt: string
  emoji?: string
}

interface SwarmResult {
  agentId: string
  role: string
  output: string
  durationMs: number
  error?: string
}

interface SwarmOptions {
  awsAccessKeyId: string
  awsSecretAccessKey: string
  awsRegion?: string
  model?: string
  maxTokens?: number
  onAgentStart?: (agent: AgentDef) => void
  onAgentDone?: (result: SwarmResult) => void
}
```

#### 상수

```typescript
const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-6'
const DEFAULT_REGION = 'us-east-1'

const ORCHESTRATOR_PROMPT = '당신은 여러 전문 AI 에이전트들의 결과물을 종합하는 오케스트레이터입니다...'
```

#### 내부 함수

**callBedrock(systemPrompt, userPrompt, ...)** (36-75줄)
- AWS Bedrock API 호출
- 단일 에이전트 실행
- 비스트리밍 모드

#### 내보내기

```typescript
export const AgentSwarm = {
  presets: {
    research: AgentDef[]
    debate: AgentDef[]
  }

  run(
    agents: AgentDef[],
    userPrompt: string,
    opts: SwarmOptions,
    sharedContext?: string
  ): Promise<{ results: SwarmResult[]; synthesis: string }>
}
```

#### 프리셋

1. **research** (79-92줄)
   - 리서처(🔍): 정보 수집 전문가
   - 분석가(📊): 데이터 분석 전문가
   - 작성자(✍️): 전문 작가

2. **debate** (94-107줄)
   - 찬성(👍): 찬성 논거 전문가
   - 반대(👎): 반대 논거 전문가
   - 중재자(⚖️): 토론 중재자

#### 함수 설명

**run(agents, userPrompt, opts, sharedContext)** (110-156줄)
- Agent Swarm 실행 메인 함수

**처리 단계:**

1. **onAgentStart 콜백 호출** (119줄)
   - 모든 에이전트에 대해 시작 알림

2. **병렬 실행** (121-141줄)
   - Promise.all()로 모든 에이전트 동시 실행
   - 각 에이전트:
     - sharedContext를 systemPrompt에 추가
     - callBedrock() 호출
     - 성공/실패 결과 생성
     - onAgentDone 콜백 호출

3. **종합 단계** (143-153줄)
   - 성공한 에이전트들의 출력 수집
   - 오케스트레이터 프롬프트 구성:
     ```
     원래 질문: {userPrompt}

     ## {role}의 분석
     {output}

     ...

     위 내용을 종합하여 최종 답변을 작성해주세요.
     ```
   - callBedrock()로 종합 결과 생성
   - maxTokens * 2 사용 (더 긴 답변)

4. **반환** (155줄)
   - { results, synthesis }

#### 데이터 흐름

```
AgentSwarm.run(agents, prompt)
  ↓
onAgentStart 콜백들
  ↓
[병렬 실행]
  Agent 1 → callBedrock() → result1
  Agent 2 → callBedrock() → result2
  Agent 3 → callBedrock() → result3
  ↓
[각 완료 시 onAgentDone 콜백]
  ↓
모든 결과 수집 → 종합 프롬프트 구성
  ↓
Orchestrator → callBedrock() → synthesis
  ↓
{ results, synthesis } 반환
```

#### 사용 예시

```typescript
const agents = AgentSwarm.presets.research

const { results, synthesis } = await AgentSwarm.run(
  agents,
  '최신 AI 트렌드 분석',
  {
    awsAccessKeyId: 'xxx',
    awsSecretAccessKey: 'yyy',
    awsRegion: 'us-east-1',
    model: 'us.anthropic.claude-sonnet-4-6',
    maxTokens: 1024,
    onAgentStart: (agent) => console.log(`${agent.role} 시작`),
    onAgentDone: (result) => console.log(`${result.role} 완료: ${result.durationMs}ms`)
  }
)

console.log('각 에이전트 결과:', results)
console.log('종합 결과:', synthesis)
```

---

### claude.ts (165줄)

AWS Bedrock Claude API 클라이언트입니다. 스트리밍 지원.

#### 타입 정의

```typescript
interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatOptions {
  awsAccessKeyId: string
  awsSecretAccessKey: string
  awsRegion?: string
  model?: string
  systemPrompt?: string
  maxTokens?: number
  onChunk?: (text: string) => void  // 스트리밍 콜백
}
```

#### 상수

```typescript
const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-6'
const DEFAULT_REGION = 'us-east-1'
```

#### 내부 함수

**b64toUtf8(b64: string): string** (24-31줄)
- Base64 문자열을 UTF-8 문자열로 디코딩
- 브라우저 환경에서 한글 등 멀티바이트 문자 안전 처리
- atob() + Uint8Array + TextDecoder

#### 내보내기

```typescript
export async function chat(
  messages: Message[],
  opts: ChatOptions
): Promise<string>
```

#### 함수 설명

**chat(messages, opts)** (33-102줄)
- Claude API 호출 (스트리밍 또는 일반 모드)

**처리 단계:**

1. **옵션 파싱** (37-45줄)
   - 기본값 적용 (DEFAULT_MODEL, DEFAULT_REGION)
   - onChunk 존재 여부로 스트리밍 모드 결정

2. **요청 body 구성** (47-52줄)
   ```typescript
   {
     anthropic_version: 'bedrock-2023-05-31',
     max_tokens: 2048,
     messages: [...]
     system?: '...'  // systemPrompt가 있으면 추가
   }
   ```

3. **엔드포인트 선택** (54-57줄)
   - 스트리밍: `/model/{model}/invoke-with-response-stream`
   - 일반: `/model/{model}/invoke`

4. **서명 및 요청** (62-78줄)
   - signRequest()로 AWS SigV4 서명 생성
   - fetch() 호출

5. **에러 처리** (80-91줄)
   - HTTP 상태 코드 확인
   - 에러 응답 JSON 파싱
   - console.error + throw

6. **응답 처리** (93-102줄)
   - 스트리밍: readBedrockStream() 호출
   - 일반: JSON 파싱 → data.content[0].text 반환

#### 스트리밍 파서

**readBedrockStream(body, onChunk)** (109-165줄)
- AWS Event Stream 바이너리 프로토콜 파서

**프레임 구조:**
```
[4B totalLen][4B headersLen][4B preludeCRC][headers...][payload...][4B msgCRC]
```

**처리 로직:**

1. **버퍼 병합** (118-125줄)
   - reader.read()로 청크 읽기
   - 기존 buffer와 새 value 병합

2. **프레임 파싱** (128-160줄)
   - totalLength, headersLength 읽기
   - 불완전한 프레임이면 다음 청크 대기
   - payload 추출 (payloadOffset ~ payloadLength)
   - JSON 파싱:
     ```typescript
     {
       bytes: "base64_encoded_event"
     }
     ```
   - b64toUtf8() → JSON 파싱:
     ```typescript
     {
       type: 'content_block_delta',
       delta: { text: 'chunk...' }
     }
     ```
   - onChunk(delta.text) 호출
   - fullText에 누적
   - 다음 프레임으로 버퍼 이동

3. **완료** (163줄)
   - console.log로 전체 길이 출력
   - fullText 반환

#### 사용 예시

```typescript
// 일반 모드
const response = await chat(
  [
    { role: 'user', content: '안녕하세요' }
  ],
  {
    awsAccessKeyId: 'xxx',
    awsSecretAccessKey: 'yyy',
    awsRegion: 'us-east-1',
    model: 'us.anthropic.claude-sonnet-4-6',
    systemPrompt: '당신은 도움이 되는 AI입니다.',
    maxTokens: 2048
  }
)
console.log(response)

// 스트리밍 모드
await chat(
  [
    { role: 'user', content: '긴 이야기를 들려줘' }
  ],
  {
    awsAccessKeyId: 'xxx',
    awsSecretAccessKey: 'yyy',
    onChunk: (chunk) => {
      process.stdout.write(chunk)  // 실시간 출력
    }
  }
)
```

## 공통 패턴

### 비동기 처리
모든 함수는 async/await를 사용하여 비동기 처리합니다.

### 에러 처리
API 호출은 try-catch로 감싸고, 에러 메시지를 throw합니다.

### 타입 안전성
제네릭 타입과 인터페이스를 사용하여 타입 안전성을 보장합니다.

### 불변성
객체를 직접 변경하지 않고 새 객체를 생성합니다.
