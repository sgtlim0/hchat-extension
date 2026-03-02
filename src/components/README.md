# components 디렉토리

## 개요

React 컴포넌트들을 포함하는 디렉토리입니다. 사이드패널의 각 탭 화면(채팅, 메모리, 스케줄러, Swarms)과 설정 화면을 구성하는 UI 컴포넌트들이 정의되어 있습니다.

## 파일 목록

### MemoryPanel.tsx (102줄)

대화별 메모리(CLAUDE.md 스타일)를 관리하는 패널 컴포넌트입니다.

#### Props

```typescript
interface MemoryPanelProps {
  conversationId: string  // 대화 ID
}
```

#### 내부 상태

- `editing: boolean` - 편집 모드 여부
- `draft: string` - 편집 중인 메모리 내용
- `storageSize: string` - chrome.storage.local 사용량

#### 주요 함수

1. **startEdit()** (19-22줄)
   - 편집 모드 시작
   - 기존 메모리 내용을 draft에 복사 (없으면 기본 템플릿)

2. **save()** (24-27줄)
   - draft 내용을 메모리에 저장
   - 편집 모드 종료

3. **rel(ts: number)** (29-34줄)
   - 타임스탬프를 상대 시간 문자열로 변환 ("N초 전", "N분 전", "N시간 전")

#### UI 구조

- **헤더**: 아이콘(🧠) + 제목 + CLAUDE.md 뱃지
- **설명**: 메모리 기능 안내 텍스트
- **편집 모드**: textarea + 취소/저장 버튼
- **보기 모드**: 메모리 카드 + 편집/초기화 버튼
- **빈 상태**: 메모리가 없을 때 안내 메시지 + "메모리 만들기" 버튼
- **푸터**: 저장 용량 표시

#### 데이터 흐름

```
useMemory(conversationId)
  ↓
{ entry, loading, update, clear }
  ↓
UI 렌더링 (편집/보기/빈 상태)
  ↓
사용자 액션 (편집/저장/초기화)
  ↓
MemoryStore → chrome.storage.local
```

---

### SchedulerPanel.tsx (127줄)

예약 작업(Scheduled Tasks)을 관리하는 패널 컴포넌트입니다.

#### Props

```typescript
interface SchedulerPanelProps {
  conversationId: string  // 대화 ID
}
```

#### 내부 상태

- `showForm: boolean` - 작업 추가 폼 표시 여부
- `label: string` - 작업 이름
- `prompt: string` - 실행할 프롬프트
- `schedType: 'daily' | 'weekdays' | 'interval'` - 스케줄 타입
- `hour: number` - 시간 (0-23)
- `minute: number` - 분 (0-59)
- `intervalMins: number` - 간격 (분)

#### 주요 함수

1. **buildSchedule(): CronLike** (16-20줄)
   - 현재 폼 상태를 CronLike 객체로 변환
   - interval/daily/weekdays 타입에 따라 다른 스케줄 객체 생성

2. **handleAdd()** (22-28줄)
   - 작업 추가 핸들러
   - 유효성 검증 (label, prompt 필수)
   - addTask() 호출 → 폼 초기화 → 폼 닫기

3. **fmtDate(ts: number)** (30-31줄)
   - 타임스탬프를 한국어 날짜/시간 문자열로 포맷

#### UI 구조

- **헤더**: 아이콘(⏰) + 제목 + 활성 작업 개수 뱃지 + 추가/닫기 버튼
- **작업 추가 폼** (showForm=true):
  - 작업 이름 입력
  - 프롬프트 입력 (textarea)
  - 스케줄 타입 선택 (daily/weekdays/interval)
  - 시간 입력 (daily/weekdays) 또는 간격 입력 (interval)
  - 추가 버튼
- **작업 목록**:
  - 각 작업: 이름 + 스케줄 설명 + 다음 실행 시간 + 토글 스위치 + 삭제 버튼
  - 빈 상태: 안내 메시지

#### 데이터 흐름

```
useScheduler(conversationId)
  ↓
{ tasks, addTask, toggleTask, removeTask, describeSchedule }
  ↓
작업 목록 렌더링
  ↓
사용자 액션 (추가/토글/삭제)
  ↓
Scheduler → chrome.storage.local + chrome.alarms
  ↓
background/index.ts에서 알람 이벤트 수신 → AWS Bedrock 호출
```

---

### SwarmPanel.tsx (133줄)

Agent Swarms(병렬 에이전트 팀) 실행 패널 컴포넌트입니다.

#### Props

```typescript
interface SwarmPanelProps {
  config: Config  // AWS 자격증명 및 모델 설정
}
```

#### 내부 상태

- `prompt: string` - 작업 프롬프트
- `preset: 'research' | 'debate'` - 프리셋 타입
- `customAgents: AgentDef[]` - 커스텀 에이전트 목록
- `useCustom: boolean` - 커스텀 모드 여부

#### 주요 함수

1. **handleRun()** (16-19줄)
   - 팀 실행 핸들러
   - 유효성 검증 (prompt, AWS 자격증명, 실행 중 아님)
   - useSwarm의 run() 호출

#### UI 구조

- **헤더**: 아이콘(🤖) + 제목 + 메타 정보
- **프리셋 탭**: 리서치 / 토론 / 커스텀
- **에이전트 목록**:
  - 각 에이전트: 이모지 + 역할 + 설명/출력 + 상태 아이콘
  - 상태: waiting(○), running(◉), done(●), error(✕)
  - 커스텀 모드: "+ 에이전트 추가" 버튼
- **프롬프트 영역**: 작업 프롬프트 입력 (textarea)
- **푸터**: 초기화 버튼 (done/error 상태) + 팀 실행 버튼 (스피너 표시)
- **에러 박스**: 에러 메시지 표시
- **종합 결과 박스**: 오케스트레이터가 생성한 최종 답변

#### 프리셋

1. **research** (lib/swarm.ts 79-92줄)
   - 리서처(🔍): 정보 수집
   - 분석가(📊): 데이터 분석
   - 작성자(✍️): 문서 작성

2. **debate** (lib/swarm.ts 94-107줄)
   - 찬성(👍): 찬성 논거
   - 반대(👎): 반대 논거
   - 중재자(⚖️): 균형잡힌 결론

#### 데이터 흐름

```
useSwarm(config)
  ↓
{ status, agentStates, synthesis, error, run, reset }
  ↓
프리셋/커스텀 에이전트 선택 → 프롬프트 입력
  ↓
handleRun() → AgentSwarm.run()
  ↓
각 에이전트 병렬 실행 (AWS Bedrock)
  ↓
onAgentStart/onAgentDone 콜백 → agentStates 업데이트
  ↓
오케스트레이터가 결과 종합 → synthesis
  ↓
UI 업데이트 (상태 아이콘, 종합 결과)
```

---

### ChatView.tsx (172줄)

채팅 인터페이스 컴포넌트입니다.

#### Props

```typescript
interface ChatViewProps {
  conversationId: string    // 대화 ID
  config: Config            // AWS 자격증명 및 모델 설정
  pendingPrompt?: string    // FAB/Popup에서 전달된 보류 중인 프롬프트
  onPendingConsumed?: () => void  // pendingPrompt 소비 후 콜백
}
```

#### 내부 컴포넌트

**MessageBubble** (13-31줄)
- 단일 메시지 버블 렌더링
- user/assistant 역할에 따라 스타일 분기
- 스트리밍 중일 때 깜빡이는 커서(▌) 표시
- 타임스탬프 표시

#### 내부 상태

- `input: string` - 입력 필드 값

#### 상수

```typescript
const suggestions = [
  { icon: '📄', text: '이 페이지 요약해줘', action: 'summarize' },
  { icon: '💻', text: '코드 리뷰 해줘', action: '' },
  { icon: '🌐', text: '오늘 AI 뉴스 알려줘', action: '' },
]
```

#### 주요 함수

1. **getModelDisplayName(modelId: string)** (39-45줄)
   - 모델 ID를 사용자 친화적인 이름으로 변환
   - 예: `us.anthropic.claude-sonnet-4-6` → `Claude Sonnet 4`

2. **handleSuggestion(s)** (65-83줄)
   - 제안 칩 클릭 핸들러
   - `summarize` 액션: background에 페이지 텍스트 요청 → 프롬프트 구성
   - 기타 액션: 제안 텍스트 그대로 전송

3. **handleSend()** (85-91줄)
   - 전송 버튼/Enter 키 핸들러
   - 입력 유효성 검증 → sendMessage() 호출 → 입력 필드 초기화

4. **handleKeyDown(e)** (93-98줄)
   - Enter 키: 전송 (Shift+Enter는 줄바꿈)

#### useEffect 훅

1. **메시지 스크롤** (53-55줄)
   - messages 변경 시 자동으로 최하단 스크롤

2. **pendingPrompt 자동 전송** (58-63줄)
   - pendingPrompt가 있고 로딩 중이 아니면 자동으로 전송
   - FAB/Popup에서 보낸 프롬프트 처리

#### UI 구조

- **메시지 영역** (chat-messages):
  - 빈 상태: 로고 + 제목 + 설명 + 제안 칩 3개
  - 메시지 목록: MessageBubble 컴포넌트
  - 대화 초기화 버튼
  - 에러 메시지
  - 자동 스크롤용 div (endRef)
- **입력 영역** (chat-input-area):
  - textarea (자동 높이 조절)
  - 전송 버튼 (스피너 표시)
  - 모델 표시기

#### 데이터 흐름

```
useChat(conversationId, config)
  ↓
{ messages, isLoading, error, sendMessage, clearMessages }
  ↓
메시지 목록 렌더링
  ↓
사용자 입력 → handleSend()
  ↓
sendMessage() → MemoryStore.toSystemPrompt() → chat()
  ↓
AWS Bedrock API (스트리밍)
  ↓
onChunk 콜백 → messages 업데이트
  ↓
UI 리렌더링 (스트리밍 효과)
```

---

### SettingsView.tsx (189줄)

설정 화면 컴포넌트입니다.

#### Props

```typescript
interface SettingsViewProps {
  darkMode: boolean           // 다크 모드 상태
  onToggleDarkMode: () => void  // 다크 모드 토글 핸들러
}
```

#### 내부 상태

- `saved: boolean` - 저장 완료 상태 (2초 후 자동 해제)
- `draft: Config` - 편집 중인 설정 (config의 복사본)
- `testing: boolean` - 테스트 진행 중
- `testResult: 'success' | 'error' | null` - 테스트 결과
- `showSecretKey: boolean` - Secret Key 표시/숨김

#### 주요 함수

1. **handleSave()** (19-23줄)
   - 설정 저장 핸들러
   - updateConfig() 호출 → saved=true → 2초 후 자동 해제

2. **handleTest()** (25-62줄)
   - AWS Bedrock 연결 테스트
   - 테스트 요청: `{ messages: [{ role: 'user', content: 'Hi' }], max_tokens: 10 }`
   - SigV4 서명 생성 → Bedrock API 호출
   - 성공: testResult='success', 실패: testResult='error'

#### 상수

```typescript
const models = [
  { id: 'us.anthropic.claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (권장)' },
  { id: 'us.anthropic.claude-opus-4-6-v1', label: 'Claude Opus 4.6 (최고 성능)' },
  { id: 'us.anthropic.claude-haiku-4-5-20251001-v1:0', label: 'Claude Haiku 4.5 (빠름)' },
]
```

#### UI 구조

1. **AWS Bedrock 자격증명**:
   - AWS_ACCESS_KEY_ID 입력
   - AWS_SECRET_ACCESS_KEY 입력 (표시/숨김 버튼)
   - AWS Region 입력 + 테스트 버튼
   - 연결 실패 시 에러 메시지
   - 안내 힌트

2. **기본 모델 선택**:
   - 아이콘(✨) + 라벨
   - select 드롭다운

3. **설정 저장 버튼**:
   - 기본: "설정 저장"
   - saved=true: "✓ 저장됨" (초록색)

4. **다크 모드**:
   - 아이콘(🌙) + 라벨 + 토글 스위치

5. **언어**:
   - 아이콘(🌐) + 라벨 + "한국어" (고정)

6. **About**:
   - 로고(H) + "H Chat Extension" + "v1.0.0 · AWS Bedrock"

#### 데이터 흐름

```
useConfig()
  ↓
{ config, updateConfig }
  ↓
draft 상태 초기화
  ↓
사용자 입력 → draft 업데이트
  ↓
handleSave() → updateConfig()
  ↓
Storage.set('hchat:config', config)
  ↓
Storage.set('hchat:config:aws', { awsAccessKeyId, awsSecretAccessKey, awsRegion })
```

## 공통 패턴

### 스타일링
모든 컴포넌트는 `../styles/global.css`의 유틸리티 클래스를 사용합니다.

### 에러 처리
API 호출은 try-catch로 감싸고 에러 메시지를 사용자에게 표시합니다.

### 로딩 상태
`loading` 상태를 사용하여 데이터 로드 중일 때 "로딩 중..." 표시

### 빈 상태
데이터가 없을 때 안내 메시지와 액션 버튼을 포함한 empty-state UI 표시
