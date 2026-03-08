# Phase 6: 차세대 혁신 (Next-Gen Innovation)

> Bonus 10개 기능 — 경쟁 Extension 차별화

## B-1. AI 웹 오토메이션 (Web Autopilot)

### 요구사항
- 자연어 명령으로 웹페이지 자동 조작
- "이 상품 장바구니에 넣어줘", "다음 페이지로 이동"
- DOM 셀렉터 자동 탐색 (AI 판별)
- 반복 작업 매크로 녹화/재생

### 구현 방안
- Content Script에서 DOM 조작 API
- chrome.scripting.executeScript로 동적 명령 실행
- AI가 사용자 명령 → CSS 셀렉터 + 액션으로 변환
- 매크로: 액션 시퀀스를 chrome.storage에 저장

### 위젯: `src/widgets/autopilot-panel/AutopilotPanel.tsx`
### 복잡도: 높음
### 에이전트 배정: general-purpose (DOM 조작 + AI 프롬프트 설계)

---

## B-2. 실시간 웹페이지 감시 (Page Watcher)

### 요구사항
- 특정 URL의 변경 감지 (가격, 재고, 뉴스)
- chrome.alarms로 주기적 체크 (최소 1분)
- 변경 발견 시 AI 분석 + Chrome 알림
- 감시 규칙: CSS 셀렉터 기반 or AI 판별

### 구현 방안
- 감시 대상: { url, selector?, checkInterval, lastContent, enabled }
- Background SW에서 fetch + 비교
- 변경 감지 시 diff → AI 요약 → chrome.notifications

### 위젯: `src/widgets/watcher-panel/WatcherPanel.tsx`
### Lib: `src/lib/watcher.ts`
### 복잡도: 중간
### 에이전트 배정: general-purpose

---

## B-3. 크로스 탭 AI 리서치 (Multi-Tab Research)

### 요구사항
- 여러 탭의 내용을 동시 수집/분석
- "열린 5개 탭 내용을 종합 분석해줘"
- 탭별 핵심 정보 추출 → 비교표 자동 생성
- 리서치 세션 저장

### 구현 방안
- chrome.tabs.query로 열린 탭 목록
- 각 탭에 chrome.scripting.executeScript로 텍스트 추출
- 전체 텍스트를 AI에 전달 → 종합 분석
- 비교표 마크다운 생성

### 위젯: `src/widgets/research-panel/ResearchPanel.tsx`
### 복잡도: 높음
### 에이전트 배정: general-purpose

---

## B-4. AI 마이크로 위젯 (Floating Widgets)

### 요구사항
- 웹페이지 위 드래그 가능한 미니 위젯
- 번역기, 사전, 계산기, 타이머 위젯
- 위치/크기 기억, 사이트별 자동 표시

### 구현 방안
- Content Script에서 Shadow DOM 위젯 삽입
- 드래그: mousedown/mousemove/mouseup
- 위젯 상태: chrome.storage per-site

### Content Script: `src/content/widgets.ts`
### 복잡도: 중간
### 에이전트 배정: general-purpose (DOM 중심)

---

## B-5. 스마트 탭 그루핑 (AI Tab Organizer)

### 요구사항
- AI가 열린 탭들을 자동 분류
- chrome.tabGroups API로 그룹 생성
- "이 탭들 정리해줘" 자연어 명령

### 구현 방안
- chrome.tabs.query → 모든 탭 제목/URL 수집
- AI에 전달 → 카테고리별 분류 결과
- chrome.tabs.group + chrome.tabGroups.update

### 위젯: `src/widgets/tab-organizer/TabOrganizer.tsx`
### Permission: `tabGroups` 추가
### 복잡도: 중간
### 에이전트 배정: general-purpose

---

## B-6. 웹 어노테이션 레이어 (Annotation Layer)

### 요구사항
- 웹페이지 위 투명 캔버스
- 드로잉, 화살표, 텍스트 박스
- 스크린샷 저장

### 구현 방안
- Content Script에서 Canvas overlay 삽입
- Canvas 2D API로 드로잉
- canvas.toDataURL()로 이미지 저장

### Content Script: `src/content/annotate.ts`
### 복잡도: 높음
### 에이전트 배정: general-purpose

---

## B-7. AI 일일 브리핑 (Daily Digest)

### 요구사항
- 매일 아침 맞춤형 AI 브리핑
- 즐겨찾기 + 최근 방문 요약
- 관심 주제 뉴스 큐레이션

### 구현 방안
- chrome.alarms 매일 09:00 트리거
- chrome.history.search로 최근 방문
- AI 요약 → chrome.notifications + 사이드패널 카드

### 위젯: `src/widgets/digest-panel/DigestPanel.tsx`
### Permission: `history` 추가
### 복잡도: 중간
### 에이전트 배정: general-purpose

---

## B-8. 코드 스니펫 매니저 (Code Vault)

### 요구사항
- 웹에서 코드 원클릭 저장
- AI 자동 태깅 (언어, 프레임워크)
- 코드 설명 자동 생성

### 구현 방안
- FAB 컨텍스트 메뉴에 "코드 저장" 추가
- chrome.storage에 스니펫 배열
- AI 태깅: 코드 → 언어/용도 추출

### 위젯: `src/widgets/code-vault/CodeVault.tsx`
### Lib: `src/lib/code-vault.ts`
### 복잡도: 낮음
### 에이전트 배정: general-purpose

---

## B-9. 개인 AI 튜터 (Learning Mode)

### 요구사항
- 현재 페이지 → 학습 자료 변환
- 플래시카드 자동 생성
- 퀴즈 (객관식/주관식)

### 구현 방안
- 페이지 텍스트 → AI로 핵심 개념 추출
- 플래시카드: { front, back }[] 생성
- 퀴즈: AI 기반 문제 + 정답 생성

### 위젯: `src/widgets/tutor-panel/TutorPanel.tsx`
### 복잡도: 중간
### 에이전트 배정: general-purpose

---

## B-10. 멀티 페르소나 AI (Persona Switch)

### 요구사항
- 한 클릭 AI 성격 전환
- 프리셋: 코딩 전문가 / 번역가 / 작가 / 분석가 / 튜터
- 페르소나별 모델 자동 선택
- 웹사이트별 기본 페르소나

### 구현 방안
- persona.store.ts: { id, name, systemPrompt, model, icon }
- ChatView에서 현재 페르소나의 systemPrompt 주입
- 사이트별 기본: chrome.storage per-hostname

### 위젯: `src/widgets/persona-panel/PersonaPanel.tsx`
### Store: `src/entities/persona/persona.store.ts`
### 복잡도: 낮음
### 에이전트 배정: general-purpose

---

## 에이전트 배정 계획

### 병렬 구현 그룹

**그룹 A (낮은 복잡도 — 먼저 완료)**
- B-8 코드 스니펫 매니저
- B-10 멀티 페르소나

**그룹 B (중간 복잡도)**
- B-2 페이지 감시
- B-5 탭 그루핑
- B-7 일일 브리핑
- B-9 AI 튜터
- B-4 마이크로 위젯

**그룹 C (높은 복잡도)**
- B-1 웹 오토메이션
- B-3 크로스 탭 리서치
- B-6 어노테이션 레이어

### 워크트리 구조

```
feature/bonus-a    # B-8, B-10 (낮음)
feature/bonus-b    # B-2, B-4, B-5, B-7, B-9 (중간)
feature/bonus-c    # B-1, B-3, B-6 (높음)
```
