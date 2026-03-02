# content 디렉토리

## 개요

Chrome Extension의 콘텐츠 스크립트(Content Script)를 포함하는 디렉토리입니다.
웹 페이지에 주입되어 FAB(Floating Action Button), 컨텍스트 메뉴, 텍스트 선택 툴팁을 제공합니다.

## 파일 목록

### fab.ts (320줄)

웹 페이지에 주입되는 FAB 및 상호작용 UI를 구현한 콘텐츠 스크립트입니다.

#### 주요 상수

```typescript
const MENU_ITEMS = [
  { icon: 'message-square', label: 'H Chat에 질문', action: 'ask' },
  { icon: 'file-text', label: '선택 텍스트 요약', action: 'summarize' },
  { icon: 'languages', label: '번역', action: 'translate' },
  { divider: true },
  { icon: 'pencil', label: '다시 쓰기', action: 'rewrite' },
  { icon: 'code', label: '코드 설명', action: 'explain-code' },
]
```

#### 주요 함수

1. **svgIcon(name: string, color: string): string** (12-21줄)
   - SVG 아이콘을 생성하는 유틸리티 함수
   - 지원 아이콘: message-square, file-text, languages, pencil, code
   - 반환: SVG 마크업 문자열

2. **injectStyles(): void** (23-103줄)
   - FAB, 메뉴, 툴팁의 CSS 스타일을 `<style>` 태그로 주입
   - 라이트/다크 모드 지원
   - z-index: 2147483647 (최상위 레이어)
   - 트랜지션 애니메이션 정의

3. **getSelection(): string** (105-107줄)
   - 현재 페이지의 선택된 텍스트를 반환
   - window.getSelection() 래퍼

4. **getPageText(): string** (109-112줄)
   - 페이지의 주요 텍스트 콘텐츠를 추출
   - 우선순위: article → main → body
   - innerText 사용 (렌더링된 텍스트만)
   - 연속된 줄바꿈 제거, 최대 8000자

5. **buildPrompt(action: string, text: string): string** (114-127줄)
   - 액션과 텍스트를 기반으로 프롬프트 생성
   - 페이지 정보 추가: `[페이지: ${title}]`, `[URL: ${url}]`
   - 액션별 템플릿:
     - `ask`: 선택 텍스트 그대로
     - `summarize`: "다음 웹페이지 내용을 한국어로 요약해줘"
     - `translate`: "다음 텍스트를 한국어로 번역해줘 (이미 한국어면 영어로)"
     - `rewrite`: "다음 텍스트를 더 자연스럽게 다시 써줘"
     - `explain-code`: "다음 코드를 설명해줘"

6. **sendToSidePanel(action: string, text: string): void** (129-145줄)
   - 프롬프트를 사이드패널로 전달
   - chrome.storage.local에 pending 데이터 저장:
     ```typescript
     {
       'hchat:fab-pending': {
         action: string
         text: string
         pageUrl: string
         pageTitle: string
         ts: number
       }
     }
     ```
   - background에 `'open-sidepanel'` 메시지 전송

7. **init(): void** (147-313줄)
   - FAB, 메뉴, 툴팁 초기화 및 이벤트 리스너 등록

   **DOM 생성:**
   - FAB 버튼 (`#hchat-fab`): 우하단 고정, "H" 텍스트
   - 컨텍스트 메뉴 (`#hchat-menu`): MENU_ITEMS 기반 동적 생성
   - 선택 툴팁 (`#hchat-tooltip`): "H Chat에 질문"

   **이벤트 리스너:**

   - **FAB 클릭** (221-233줄):
     - 메뉴 열기/닫기 토글
     - 메뉴 위치: FAB 좌상단 (-200px, -240px)

   - **메뉴 항목 클릭** (236-249줄):
     - action 추출 → getSelection() → sendToSidePanel()

   - **텍스트 선택 → 툴팁 표시** (254-284줄):
     - mouseup 이벤트 (400ms 디바운스)
     - 선택 텍스트 길이 ≥ 3자
     - selection.getRangeAt(0).getBoundingClientRect()로 위치 계산
     - 선택 영역 위에 표시 (상단 벗어나면 아래에)

   - **툴팁 클릭** (287-293줄):
     - 선택 텍스트 → sendToSidePanel('ask', text)

   - **바깥 클릭** (296-301줄):
     - 메뉴 닫기

   - **ESC 키** (304-309줄):
     - 메뉥/툴팁 숨김

   - **스크롤** (312줄):
     - 툴팁 숨김

   **보조 함수:**

   - **showMenu(x, y)** (187-210줄):
     - 다크 모드 감지 (documentElement.classList 또는 prefers-color-scheme)
     - 화면 밖 방지 로직
     - display: block → requestAnimationFrame → show 클래스 추가 (트랜지션 트리거)

   - **hideMenu()** (212-218줄):
     - show 클래스 제거
     - 150ms 후 display: none (트랜지션 완료 대기)

#### 초기화 타이밍

```typescript
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
```

- 페이지 로드 완료 후 init() 실행
- 이미 로드된 경우 즉시 실행

#### UI 요소 구조

```
웹 페이지
├── #hchat-fab (FAB 버튼)
│   - 우하단 고정 (bottom: 24px, right: 24px)
│   - 원형 버튼, "H" 텍스트
│
├── #hchat-menu (컨텍스트 메뉴)
│   - FAB 클릭 시 표시
│   - 메뉴 항목 (MENU_ITEMS)
│   - 위치: FAB 좌상단
│
└── #hchat-tooltip (선택 툴팁)
    - 텍스트 선택 시 표시
    - 위치: 선택 영역 위 또는 아래
    - "H Chat에 질문" 버튼
```

#### 데이터 흐름

```
사용자 액션 (FAB/메뉴/툴팁 클릭)
  ↓
getSelection() / getPageText()
  ↓
buildPrompt(action, text)
  ↓
sendToSidePanel()
  ↓
chrome.storage.local.set('hchat:fab-pending')
  ↓
chrome.runtime.sendMessage({ type: 'open-sidepanel' })
  ↓
background/index.ts에서 사이드패널 열기
  ↓
sidepanel/App.tsx에서 pending prompt 감지
  ↓
ChatView에서 자동으로 메시지 전송
```

#### 다크 모드 지원

```javascript
const isDark = document.documentElement.classList.contains('dark') ||
  window.matchMedia('(prefers-color-scheme: dark)').matches
menu.classList.toggle('dark', isDark)
```

- `<html class="dark">` 또는 시스템 다크 모드 감지
- 메뉴에 `.dark` 클래스 추가하여 스타일 분기

#### 특징

1. **비침투적 디자인**: 웹 페이지의 기존 스타일/레이아웃에 영향 없음
2. **최상위 레이어**: z-index 2147483647로 모든 요소 위에 표시
3. **반응형 위치 계산**: 화면 밖으로 벗어나지 않도록 자동 조정
4. **다크 모드 자동 감지**: 페이지/시스템 테마에 맞춰 UI 스타일 변경
5. **키보드 단축키**: ESC로 메뉴/툴팁 닫기
6. **디바운싱**: 텍스트 선택 후 400ms 대기 후 툴팁 표시 (불필요한 표시 방지)
