# Phase 5: 엔터프라이즈 (Enterprise)

> 팀 협업, 보안, 관리, 연동 기능

## 5-1. 사용량 추적

### 요구사항
- 토큰 사용량 추정 (입력 + 출력)
- 모델별 비용 계산 (Sonnet/Opus/Haiku 단가 적용)
- 일별/주별/월별 리포트
- 예산 경고 (설정 임계치 초과 시)

### 구현 방안
- `usage.store.ts` — 일별 사용량 누적
- 토큰 추정: 한국어 1자 ~2토큰, 영어 1단어 ~1.3토큰
- Bedrock 응답의 `usage` 필드 활용 (가능할 때)
- 사용량 차트: CSS 기반 바 차트 (외부 라이브러리 없이)

### 비용 단가 (per 1M tokens)
| Model | Input | Output |
|-------|-------|--------|
| Sonnet 4.6 | $3.00 | $15.00 |
| Opus 4.6 | $15.00 | $75.00 |
| Haiku 4.5 | $0.80 | $4.00 |

### 복잡도: 중간

---

## 5-2. 감사 로그

### 요구사항
- 모든 AI 요청/응답 로깅 (타임스탬프, 모델, 토큰)
- 액션 유형: chat, summarize, translate, swarm, schedule
- 날짜/액션/키워드 필터링
- CSV/JSON 내보내기
- 일괄 삭제

### 구현 방안
- `audit.store.ts` — 로그 배열 (최대 10,000건)
- 자동 기록: 채팅 전송 시 audit 자동 추가
- 감사 로그 페이지 (`AuditPage.tsx`)
- 내보내기: Blob 다운로드

### 로그 스키마
```typescript
interface AuditEntry {
  id: string
  action: 'chat' | 'summarize' | 'translate' | 'swarm' | 'schedule' | 'export'
  model: string
  inputTokens: number
  outputTokens: number
  sessionId: string
  prompt: string      // 처음 100자만
  timestamp: number
  duration: number    // ms
  success: boolean
  error?: string
}
```

### 복잡도: 중간

---

## 5-3. hchat-pwa 동기화

### 요구사항
- Extension ↔ hchat-pwa 세션 양방향 동기화
- 메모리 공유
- 프롬프트 템플릿 공유
- 동기화 상태 표시

### 구현 방안
- **방법 1**: `postMessage` + `MessageChannel` (같은 브라우저)
  - Extension content script → hchat-pwa 페이지에 메시지 전달
  - hchat-pwa에서 `window.addEventListener('message')` 수신
- **방법 2**: `chrome.storage.sync` (크로스 디바이스)
  - 설정 + 프롬프트만 (100KB 제한)
- **방법 3**: 공유 API 서버 (향후)
  - Modal backend에 동기화 엔드포인트 추가

### 동기화 프로토콜
```typescript
interface SyncMessage {
  type: 'hchat-sync'
  action: 'push' | 'pull' | 'ack'
  entity: 'session' | 'memory' | 'template'
  data: unknown
  timestamp: number
  source: 'extension' | 'pwa'
}
```

### 복잡도: 높음

---

## 5-4. 프롬프트 라이브러리

### 요구사항
- 프롬프트 템플릿 CRUD
- `{{variable}}` 치환 (실행 시 입력 폼)
- 카테고리: 코딩/번역/글쓰기/분석/기타
- 즐겨찾기 + 사용 횟수 추적
- 슬래시 명령어에서 직접 호출 (`/template 이름`)

### 구현 방안
- `template.store.ts` — 템플릿 배열
- 템플릿 에디터 (`TemplateEditor.tsx`)
- 변수 파서: `{{name}}` regex → 입력 폼 생성
- 프리셋 10개 내장

### 프리셋 템플릿 예시
```typescript
const presets = [
  {
    name: '코드 리뷰',
    category: 'coding',
    prompt: '다음 {{language}} 코드를 리뷰해줘. 버그, 성능, 가독성 관점에서:\n\n{{code}}',
    variables: ['language', 'code']
  },
  {
    name: '이메일 작성',
    category: 'writing',
    prompt: '{{recipient}}에게 {{topic}}에 대한 {{tone}} 이메일을 작성해줘.',
    variables: ['recipient', 'topic', 'tone']
  }
]
```

### 복잡도: 중간

---

## 5-5. 멀티 프로바이더

### 요구사항
- OpenAI (GPT-4o) 추가 지원
- Google Gemini 추가 지원
- 커스텀 엔드포인트 (Ollama, vLLM 등)
- 모델별 자동 라우팅 (질문 유형에 따라)

### 구현 방안
- `provider-factory.ts` — 프로바이더 추상화
- 각 프로바이더: Bedrock, OpenAI, Gemini, Custom
- 설정에서 프로바이더별 API 키 입력
- auto-route: 코딩 → Sonnet, 번역 → Haiku, 분석 → Opus

### 프로바이더 인터페이스
```typescript
interface Provider {
  id: string
  name: string
  models: Model[]
  chat(messages: Message[], opts: ChatOptions): Promise<string>
  stream(messages: Message[], opts: ChatOptions): AsyncGenerator<string>
  testConnection(): Promise<boolean>
}

// Bedrock (기존)
class BedrockProvider implements Provider { ... }

// OpenAI (신규)
class OpenAIProvider implements Provider {
  async chat(messages, opts) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', { ... })
    // SSE 파싱
  }
}

// Gemini (신규)
class GeminiProvider implements Provider {
  async chat(messages, opts) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/...`, { ... })
  }
}
```

### 복잡도: 높음
