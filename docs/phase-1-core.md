# Phase 1: 코어 강화 (Core Enhancement)

> 기존 기능 안정화 + 멀티 세션 + 명령 시스템

## 1-1. 멀티 세션 관리

### 요구사항
- 현재 단일 대화(`hchat-main`) → 다중 세션 생성/전환/삭제
- 세션 목록 사이드바 (최근순, 제목 편집)
- 세션별 독립 메모리 + 메시지 히스토리

### 구현 방안
- `session.store.ts` (Zustand) — sessions[], currentSessionId, CRUD
- v1 → v2 데이터 마이그레이션 (`hchat-main` → 첫 세션)
- chrome.storage.local 키: `hchat:sessions`
- 세션 목록 컴포넌트 (SessionList.tsx)

### 복잡도: 중간
### 의존성: Phase 0 (Zustand, 마이그레이션 프레임워크)

---

## 1-2. 슬래시 명령어

### 요구사항
- `/요약`, `/번역`, `/코드설명`, `/메모` 등 빠른 명령
- 입력 시 자동완성 드롭다운
- 커스텀 명령어 등록 지원

### 구현 방안
- `commands.ts` — 명령어 레지스트리 패턴
- `CommandPalette.tsx` — 자동완성 UI (input 감시)
- 빌트인 명령어 5개 + 커스텀 확장

### 빌트인 명령어
| 명령 | Alias | 동작 |
|------|-------|------|
| `/요약` | `/summarize`, `/sum` | 페이지/선택 텍스트 요약 |
| `/번역` | `/translate`, `/tr` | 한↔영 번역 |
| `/코드` | `/code`, `/explain` | 코드 설명 |
| `/메모` | `/memo`, `/memory` | 메모리에 추가 |
| `/새대화` | `/new` | 새 세션 생성 |

### 복잡도: 낮음
### 의존성: 없음

---

## 1-3. 컨텍스트 스택

### 요구사항
- 최근 5개 탭의 페이지 컨텍스트 자동 추적
- 탭 전환 시 이전 컨텍스트 연결
- "이전 페이지에서 본 내용 기반으로 질문" 가능

### 구현 방안
- `chrome.tabs.onActivated` + `chrome.tabs.onUpdated` 리스너
- Background SW에서 탭 변경 감지 → 컨텍스트 저장
- 컨텍스트 링 버퍼 (최근 5개, FIFO)
- 사이드패널에서 컨텍스트 칩 표시

### 스토리지 키: `hchat:context-stack`
### 복잡도: 높음
### 의존성: `tabs` permission 추가

---

## 1-4. 메시지 검색

### 요구사항
- 전체 대화 히스토리 풀텍스트 검색
- 키워드 하이라이트
- 세션/날짜 필터

### 구현 방안
- 검색 페이지 (`SearchPage.tsx`)
- 모든 세션의 메시지를 순회 → 키워드 매치
- 검색 결과 → 세션으로 점프

### 복잡도: 낮음
### 의존성: 1-1 (멀티 세션)

---

## 1-5. 대화 내보내기

### 요구사항
- Markdown / JSON / TXT 형식 내보내기
- 클립보드 복사
- 파일 다운로드

### 구현 방안
- `export.ts` — 형식별 변환 함수
- Blob + URL.createObjectURL + `<a>` download
- 클립보드: `navigator.clipboard.writeText`

### 내보내기 형식 예시
```markdown
# H Chat 대화 - 2025-01-15

## User (14:30)
이 페이지 요약해줘

## Assistant (14:30)
이 페이지는 ...
```

### 복잡도: 낮음
### 의존성: 없음
