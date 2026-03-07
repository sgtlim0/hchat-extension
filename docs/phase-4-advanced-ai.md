# Phase 4: 고급 AI (Advanced AI)

> 멀티모달 + 자동화 + 지식 관리

## 4-1. 스크린샷 AI 분석

### 요구사항
- 현재 탭 화면 캡처 → Claude Vision 분석
- 이미지 내 텍스트 OCR
- 다이어그램/차트 설명
- 영역 선택 캡처 (crop)

### 구현 방안
- `chrome.tabs.captureVisibleTab()` — 전체 탭 스크린샷 (PNG base64)
- Canvas API로 영역 crop
- Bedrock Claude Vision API (이미지 + 텍스트 프롬프트)
- 분석 결과를 채팅에 표시

### API 형식
```json
{
  "messages": [{
    "role": "user",
    "content": [
      { "type": "image", "source": { "type": "base64", "media_type": "image/png", "data": "..." } },
      { "type": "text", "text": "이 스크린샷을 분석해줘" }
    ]
  }]
}
```

### 추가 권한: `"permissions": ["tabs"]` (captureVisibleTab용)
### 복잡도: 높음

---

## 4-2. 음성 입출력

### 요구사항
- STT: 마이크 버튼 → 음성 인식 → 텍스트 입력
- TTS: 응답 읽기 버튼 → 음성 출력
- 음성 명령: "H Chat, 이 페이지 요약해줘"
- 한국어/영어 자동 감지

### 구현 방안
- `webkitSpeechRecognition` (Chrome Web Speech API)
- `SpeechSynthesis` API (TTS)
- 마이크 버튼 → 입력창에 텍스트 삽입
- 응답 옆 스피커 아이콘 → TTS 재생

### 제약사항
- Web Speech API는 Chrome에서만 지원 (확장 프로그램에서 동작 확인 필요)
- 오프라인 불가 (Google 서버 의존)

### 복잡도: 중간

---

## 4-3. 프롬프트 체이닝

### 요구사항
- 다단계 작업 자동화 (step 1 결과 → step 2 입력)
- IF-THEN-ELSE 조건 분기
- 결과 파이프라이닝 (`|` 연산자)
- 체인 템플릿 저장/불러오기

### 구현 방안
- `chain.store.ts` — 체인 정의, 단계, 결과
- 순차 실행 엔진 (각 단계에서 이전 결과를 `{{prev}}` 변수로 주입)
- 조건 분기: AI 응답에서 키워드 매칭
- 체인 에디터 UI (노드 연결)

### 체인 DSL 예시
```yaml
name: "논문 분석"
steps:
  - id: extract
    prompt: "이 논문의 핵심 주장을 추출해줘"
    input: "{{page_text}}"
  - id: critique
    prompt: "다음 주장의 약점을 분석해줘: {{extract.output}}"
  - id: summary
    prompt: "원본 주장과 비판을 종합 요약해줘"
    input: "주장: {{extract.output}}\n비판: {{critique.output}}"
```

### 복잡도: 중간

---

## 4-4. 지식 그래프

### 요구사항
- 방문 페이지 간 연결 자동 분석
- 개인 지식 베이스 시각화 (노드 그래프)
- 관련 페이지 추천
- 인사이트 자동 발견

### 구현 방안
- 각 페이지 방문 시 AI로 키워드/토픽 추출
- 노드: 페이지, 엣지: 공통 토픽
- D3.js 또는 Cytoscape.js 그래프 시각화
- chrome.storage 또는 IndexedDB (데이터 크기 문제)

### 데이터 모델
```typescript
interface KnowledgeNode {
  id: string
  url: string
  title: string
  topics: string[]
  summary: string
  visitedAt: number
}

interface KnowledgeEdge {
  source: string  // node id
  target: string  // node id
  weight: number  // 공통 토픽 수
  topics: string[]
}
```

### 복잡도: 높음

---

## 4-5. 에이전트 도구 호출

### 요구사항
- Claude tool_use 형식 지원
- 도구: 웹 검색, 계산기, 코드 실행, 페이지 조작
- 자동 도구 선택 (AI 판단)
- 도구 결과 → AI에 재전달 (루프)

### 구현 방안
- Bedrock API `tool_use` 파라미터 활용
- XML 도구 파싱 (기존 hchat-pwa 패턴 재활용)
- 도구 실행기: Background SW에서 실행 (CORS 우회)
- 최대 5회 도구 호출 루프

### 도구 정의
```typescript
const tools = [
  {
    name: 'web_search',
    description: '웹 검색을 실행합니다',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query']
    }
  },
  {
    name: 'get_page_content',
    description: '현재 페이지의 텍스트를 가져옵니다',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'calculator',
    description: '수학 계산을 실행합니다',
    input_schema: {
      type: 'object',
      properties: { expression: { type: 'string' } },
      required: ['expression']
    }
  }
]
```

### 복잡도: 높음
