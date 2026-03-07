# Phase 2: 생산성 도구 (Productivity)

> 웹 브라우징 생산성을 높이는 AI 도구

## 2-1. 웹페이지 하이라이트

### 요구사항
- 텍스트 선택 → 형광펜 색상 지정 (4색: 노랑/초록/파랑/빨강)
- 하이라이트에 메모 추가
- 하이라이트 목록 모아보기 (사이드패널)
- 사이트별 하이라이트 영속화
- 내보내기 (Markdown)

### 구현 방안
- Content Script에서 `window.getSelection()` → `Range` API → `<mark>` 태그 래핑
- CSS 셀렉터 기반 위치 저장 (페이지 리로드 후 복원)
- chrome.storage: `hchat:highlights:{hostname+pathname}`
- 하이라이트 패널 (`HighlightPanel.tsx`)

### 복잡도: 중간

---

## 2-2. 리딩 모드 + AI 요약

### 요구사항
- 현재 페이지에서 광고/네비게이션/푸터 제거
- 본문만 추출 (article, main, Readability 알고리즘)
- 단락별 AI 요약 (접기/펼치기)
- 읽기 시간 추정

### 구현 방안
- Mozilla Readability.js (또는 자체 구현)
- 사이드패널에 리딩 뷰 표시
- 단락별 "요약" 버튼 → Bedrock API
- 원문/요약 토글

### 복잡도: 낮음

---

## 2-3. 인라인 번역 오버레이

### 요구사항
- 선택 텍스트 → 실시간 인라인 번역 (페이지 위에 표시)
- 원문/번역 토글
- 번역 언어 쌍: 한↔영, 한↔일, 한↔중
- 사이트별 용어집 관리

### 구현 방안
- Content Script에서 선택 감지
- 번역 결과를 선택 영역 아래 팝오버로 표시
- 용어집: chrome.storage `hchat:glossary`
- Bedrock API 번역 (GPT보다 번역 품질 우수)

### 복잡도: 중간

---

## 2-4. 스마트 클립보드

### 요구사항
- 복사(Ctrl+C) 이벤트 감지
- AI 처리 옵션 팝업: 요약/번역/포맷 변환/정리
- 처리 결과로 클립보드 교체
- 포맷 변환: Markdown ↔ HTML ↔ Plain Text

### 구현 방안
- Content Script에서 `copy` 이벤트 리스너
- 미니 팝업 UI (복사 직후 표시, 3초 후 자동 닫기)
- `navigator.clipboard.writeText()` 교체
- 옵션: 자동/수동 모드 설정

### 복잡도: 중간

---

## 2-5. 키보드 단축키

### 요구사항
- 전역 단축키: `Ctrl+Shift+H` 사이드패널 열기/닫기
- 사이드패널 내: `Ctrl+N` 새 대화, `Ctrl+/` 명령어, `Esc` 닫기
- 커스텀 바인딩 (설정에서 변경)

### 구현 방안
- `chrome.commands` API (manifest.json에 등록)
- Background SW에서 명령어 핸들러
- 사이드패널 내: React useEffect keydown 리스너

### manifest.json 추가
```json
"commands": {
  "_execute_side_panel": {
    "suggested_key": { "default": "Ctrl+Shift+H" },
    "description": "H Chat 사이드패널 열기"
  },
  "new-chat": {
    "suggested_key": { "default": "Ctrl+Shift+N" },
    "description": "새 대화 시작"
  }
}
```

### 복잡도: 낮음
