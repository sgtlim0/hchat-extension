# H Chat Extension — TODOLIST

> v2.0 구현 체크리스트 (5 Phase, 25 Features + 10 Bonus Features)

## Phase 0: 인프라 (Infrastructure)

- [ ] **0-1** Zustand 설치 + config.store.ts 생성
- [ ] **0-2** tsconfig path alias (`@/` -> `src/`)
- [ ] **0-3** Vitest + chrome.* API 모킹 설정
- [ ] **0-4** Storage 키 상수화 (`STORAGE_KEYS`)
- [ ] **0-5** 데이터 마이그레이션 프레임워크 (`runMigrations`)
- [ ] **0-6** FSD 디렉토리 구조 리팩토링
- [ ] **0-7** 타입 안전 메시지 버스 (`message-bus.ts`)

---

## Phase 1: 코어 강화 (Core Enhancement)

- [ ] **1-1** 멀티 세션 관리 — 다중 대화 생성/전환/삭제, 세션 목록
- [ ] **1-2** 슬래시 명령어 — `/요약`, `/번역`, `/코드`, `/메모`, 자동완성
- [ ] **1-3** 컨텍스트 스택 — 최근 5개 탭 컨텍스트 추적, 탭 간 연결
- [ ] **1-4** 메시지 검색 — 전체 히스토리 풀텍스트 검색, 키워드 하이라이트
- [ ] **1-5** 대화 내보내기 — Markdown/JSON/TXT 형식, 클립보드 복사

## Phase 2: 생산성 (Productivity)

- [ ] **2-1** 웹페이지 하이라이트 — 형광펜 표시, 노트 추가, 모아보기/내보내기
- [ ] **2-2** 리딩 모드 + AI 요약 — 광고 제거, 본문 추출, 단락별 요약
- [ ] **2-3** 인라인 번역 오버레이 — 실시간 인라인 번역, 원문/번역 토글
- [ ] **2-4** 스마트 클립보드 — 복사 텍스트 감지, AI 처리, 포맷 변환
- [ ] **2-5** 키보드 단축키 — `Ctrl+Shift+H` 사이드패널, 커스텀 바인딩

## Phase 3: 웹 연동 (Web Integration)

- [ ] **3-1** YouTube 자막 분석 — 자막 추출, AI 요약, 타임스탬프, 핵심 포인트
- [ ] **3-2** Gmail 작성 도우미 — 이메일 자동완성, 톤 조정, 답장 템플릿
- [ ] **3-3** GitHub 코드 리뷰 — PR diff 분석, 인라인 코멘트 제안, 보안 체크
- [ ] **3-4** PDF 뷰어 통합 — 텍스트 추출, 하이라이트, AI Q&A
- [ ] **3-5** 소셜 미디어 도우미 — 트윗/포스트 작성, 댓글 톤 조정

## Phase 4: 고급 AI (Advanced AI)

- [ ] **4-1** 스크린샷 AI 분석 — `chrome.tabs.captureVisibleTab` + Claude Vision OCR
- [ ] **4-2** 음성 입출력 — Web Speech API STT/TTS, 음성 명령
- [ ] **4-3** 프롬프트 체이닝 — 다단계 자동화, 조건 분기, 파이프라이닝
- [ ] **4-4** 지식 그래프 — 방문 페이지 연결 분석, 개인 지식 베이스
- [ ] **4-5** 에이전트 도구 호출 — XML tool_use, 웹 검색/계산기/코드 실행

## Phase 5: 엔터프라이즈 (Enterprise)

- [ ] **5-1** 사용량 추적 — 토큰/비용 추적, 모델별 통계, 리포트
- [ ] **5-2** 감사 로그 — 모든 AI 요청 로깅, 필터링, CSV/JSON 내보내기
- [ ] **5-3** hchat-pwa 동기화 — 세션/메모리 양방향 동기화
- [ ] **5-4** 프롬프트 라이브러리 — 템플릿 CRUD, `{{variable}}`, 카테고리
- [ ] **5-5** 멀티 프로바이더 — OpenAI / Gemini / 커스텀 엔드포인트

---

## Bonus: 차세대 혁신 기능 (Next-Gen Innovation)

> 경쟁 Extension과 차별화되는 10가지 혁신 기능

### B-1. AI 웹 오토메이션 (Web Autopilot)
- 웹페이지 자동 조작 (폼 입력, 버튼 클릭, 스크롤)
- 자연어 명령: "이 상품 장바구니에 넣어줘", "다음 페이지 이동"
- `chrome.scripting` + DOM 셀렉터 자동 탐색
- 반복 작업 매크로 녹화/재생
- **복잡도: 높음**

### B-2. 실시간 웹페이지 감시 (Page Watcher)
- 특정 웹페이지 변경 감지 (가격, 재고, 뉴스)
- chrome.alarms로 주기적 체크 (최소 1분)
- 변경 발견 시 AI 분석 + Chrome 알림
- 감시 규칙: CSS 셀렉터 기반 or AI 판별
- **복잡도: 중간**

### B-3. 크로스 탭 AI 리서치 (Multi-Tab Research)
- 여러 탭의 내용을 동시 수집/분석
- "열린 5개 탭 내용을 종합 분석해줘"
- 탭별 핵심 정보 추출 → 비교표 자동 생성
- 리서치 세션 저장 및 공유
- **복잡도: 높음**

### B-4. AI 마이크로 위젯 (Floating Widgets)
- 웹페이지 위에 드래그 가능한 미니 위젯
- 번역기 위젯, 사전 위젯, 계산기 위젯, 타이머 위젯
- 위젯별 독립 AI 컨텍스트
- 위젯 위치/크기 기억, 사이트별 자동 표시
- **복잡도: 중간**

### B-5. 스마트 탭 그루핑 (AI Tab Organizer)
- 열린 탭들을 AI가 자동 분류 (주제/프로젝트/우선순위)
- `chrome.tabGroups` API로 그룹 자동 생성
- 비활성 탭 자동 서스펜드 추천
- "이 탭들 정리해줘" 자연어 명령
- **복잡도: 중간**

### B-6. 웹 어노테이션 레이어 (Annotation Layer)
- 웹페이지 위에 투명 캔버스 오버레이
- 드로잉, 화살표, 텍스트 박스 추가
- 어노테이션 스크린샷 저장
- 협업용 공유 링크 생성
- **복잡도: 높음**

### B-7. AI 일일 브리핑 (Daily Digest)
- 매일 아침 맞춤형 AI 브리핑 자동 생성
- 즐겨찾기 사이트 + 최근 방문 페이지 요약
- 관심 주제 뉴스 큐레이션
- Chrome 알림 or 사이드패널 카드
- **복잡도: 중간**

### B-8. 코드 스니펫 매니저 (Code Vault)
- 웹에서 발견한 코드 스니펫 원클릭 저장
- AI 자동 태깅 (언어, 프레임워크, 용도)
- 코드 설명 자동 생성
- VS Code / JetBrains 연동 (복사)
- **복잡도: 낮음**

### B-9. 개인 AI 튜터 (Learning Mode)
- 현재 페이지를 학습 자료로 변환
- 핵심 개념 추출 → 플래시카드 자동 생성
- 퀴즈 생성 (객관식/주관식)
- 스페이스드 리피티션 알림
- **복잡도: 중간**

### B-10. 멀티 페르소나 AI (Persona Switch)
- 한 클릭으로 AI 성격 전환
- 프리셋: 코딩 전문가 / 번역가 / 작가 / 분석가 / 튜터
- 페르소나별 시스템 프롬프트 + 모델 자동 선택
- 웹사이트별 기본 페르소나 설정
- **복잡도: 낮음**

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Phase 0 (Infrastructure) | 7 | Planned |
| Phase 1 (Core) | 5 | Planned |
| Phase 2 (Productivity) | 5 | Planned |
| Phase 3 (Web Integration) | 5 | Planned |
| Phase 4 (Advanced AI) | 5 | Planned |
| Phase 5 (Enterprise) | 5 | Planned |
| Bonus (Innovation) | 10 | Planned |
| **Total** | **42** | **0/42** |

## Priority Matrix

```
Impact
  ^
  |  B-1 Autopilot    4-5 Tool Use    B-3 Multi-Tab
  |  3-3 GitHub       4-4 Knowledge   5-5 Multi-Provider
  |  ─────────────────────────────────────────────
  |  1-1 Multi-Session  2-3 Translate  B-2 Watcher
  |  1-2 Slash Cmd      2-1 Highlight  B-10 Persona
  |  1-4 Search         2-5 Shortcuts  B-9 Tutor
  |  ─────────────────────────────────────────────
  |  1-5 Export         B-8 Code Vault  3-5 Social
  |  2-2 Reading Mode   B-7 Digest      5-2 Audit
  +───────────────────────────────────────────> Effort
       Low              Medium           High
```
