# H Chat Extension — TODOLIST

> v2.0 구현 체크리스트 (5 Phase, 25 Features + 10 Bonus Features)

## Phase 0: 인프라 (Infrastructure) -- COMPLETE

- [x] **0-1** Zustand 설치 + config.store.ts 생성
- [x] **0-2** tsconfig path alias (`@/` -> `src/`)
- [ ] **0-3** Vitest + chrome.* API 모킹 설정
- [x] **0-4** Storage 키 상수화 (`STORAGE_KEYS`)
- [ ] **0-5** 데이터 마이그레이션 프레임워크 (`runMigrations`)
- [x] **0-6** FSD 디렉토리 구조 리팩토링
- [x] **0-7** 타입 안전 메시지 버스 (`message-bus.ts`)

---

## Phase 1: 코어 강화 (Core Enhancement) -- COMPLETE

- [x] **1-1** 멀티 세션 관리 — 다중 대화 생성/전환/삭제, 세션 목록
- [x] **1-2** 슬래시 명령어 — `/요약`, `/번역`, `/코드`, `/메모`, 자동완성
- [x] **1-3** 컨텍스트 스택 — 최근 5개 탭 컨텍스트 추적, 탭 간 연결
- [x] **1-4** 메시지 검색 — 전체 히스토리 풀텍스트 검색, 키워드 하이라이트
- [x] **1-5** 대화 내보내기 — Markdown/JSON/TXT 형식, 클립보드 복사

## Phase 2: 생산성 (Productivity) -- COMPLETE

- [x] **2-1** 웹페이지 하이라이트 — 형광펜 표시, 노트 추가, 모아보기/내보내기
- [x] **2-2** 리딩 모드 + AI 요약 — 광고 제거, 본문 추출, 단락별 요약
- [x] **2-3** 인라인 번역 오버레이 — 실시간 인라인 번역, 원문/번역 토글
- [x] **2-4** 스마트 클립보드 — 복사 텍스트 감지, AI 처리, 포맷 변환
- [x] **2-5** 키보드 단축키 — `Ctrl+Shift+H` 사이드패널, 커스텀 바인딩

## Phase 3: 웹 연동 (Web Integration) -- COMPLETE

- [x] **3-1** YouTube 자막 분석 — 자막 추출, AI 요약, 타임스탬프, 핵심 포인트
- [x] **3-2** Gmail 작성 도우미 — 이메일 자동완성, 톤 조정, 답장 템플릿
- [x] **3-3** GitHub 코드 리뷰 — PR diff 분석, 인라인 코멘트 제안, 보안 체크
- [x] **3-4** PDF 뷰어 통합 — 텍스트 추출, 하이라이트, AI Q&A
- [x] **3-5** 소셜 미디어 도우미 — 트윗/포스트 작성, 댓글 톤 조정

## Phase 4: 고급 AI (Advanced AI) -- COMPLETE

- [x] **4-1** 스크린샷 AI 분석 — `chrome.tabs.captureVisibleTab` + Claude Vision OCR
- [x] **4-2** 음성 입출력 — Web Speech API STT/TTS, 음성 명령
- [x] **4-3** 프롬프트 체이닝 — 다단계 자동화, 조건 분기, 파이프라이닝
- [x] **4-4** 지식 그래프 — 방문 페이지 연결 분석, 개인 지식 베이스
- [x] **4-5** 에이전트 도구 호출 — XML tool_use, 웹 검색/계산기/코드 실행

## Phase 5: 엔터프라이즈 (Enterprise) -- COMPLETE

- [x] **5-1** 사용량 추적 — 토큰/비용 추적, 모델별 통계, 리포트
- [x] **5-2** 감사 로그 — 모든 AI 요청 로깅, 필터링, CSV/JSON 내보내기
- [x] **5-3** hchat-pwa 동기화 — 세션/메모리 양방향 동기화
- [x] **5-4** 프롬프트 라이브러리 — 템플릿 CRUD, `{{variable}}`, 카테고리
- [x] **5-5** 멀티 프로바이더 — OpenAI / Gemini / 커스텀 엔드포인트

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Phase 0 (Infrastructure) | 7 | 5/7 Complete |
| Phase 1 (Core) | 5 | **5/5 Complete** |
| Phase 2 (Productivity) | 5 | **5/5 Complete** |
| Phase 3 (Web Integration) | 5 | **5/5 Complete** |
| Phase 4 (Advanced AI) | 5 | **5/5 Complete** |
| Phase 5 (Enterprise) | 5 | **5/5 Complete** |
| **Total** | **32** | **30/32 Done** |

---

## Bonus: 차세대 혁신 기능 (Next-Gen Innovation)

> 경쟁 Extension과 차별화되는 10가지 혁신 기능

| # | 기능 | 복잡도 | 상태 |
|---|------|--------|------|
| B-1 | AI 웹 오토메이션 (Web Autopilot) | 높음 | Planned |
| B-2 | 실시간 웹페이지 감시 (Page Watcher) | 중간 | Planned |
| B-3 | 크로스 탭 AI 리서치 (Multi-Tab Research) | 높음 | Planned |
| B-4 | AI 마이크로 위젯 (Floating Widgets) | 중간 | Planned |
| B-5 | 스마트 탭 그루핑 (AI Tab Organizer) | 중간 | Planned |
| B-6 | 웹 어노테이션 레이어 (Annotation Layer) | 높음 | Planned |
| B-7 | AI 일일 브리핑 (Daily Digest) | 중간 | Planned |
| B-8 | 코드 스니펫 매니저 (Code Vault) | 낮음 | Planned |
| B-9 | 개인 AI 튜터 (Learning Mode) | 중간 | Planned |
| B-10 | 멀티 페르소나 AI (Persona Switch) | 낮음 | Planned |
