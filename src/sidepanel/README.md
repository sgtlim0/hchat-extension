# sidepanel 디렉토리

## 개요

Chrome Extension의 사이드패널(Side Panel) UI를 구현하는 디렉토리입니다.
브라우저 우측에 고정되는 패널로, 채팅, 메모리, 스케줄러, Swarms 등의 주요 기능을 제공합니다.

## 파일 목록

### main.tsx (10줄)

사이드패널의 진입점 파일입니다.

#### 코드 구조

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

#### 역할

- React 18의 createRoot API 사용
- StrictMode로 개발 시 잠재적 문제 감지
- `#root` DOM 요소에 App 컴포넌트 렌더링

---

### App.tsx (174줄)

사이드패널의 메인 앱 컴포넌트입니다.

#### 타입 정의

```typescript
type Tab = 'chat' | 'memory' | 'scheduler' | 'swarm'
```

#### 상수

```typescript
const CONV_ID = 'hchat-main'  // 메인 대화 ID

const tabs: { id: Tab; label: string }[] = [
  { id: 'chat', label: '채팅' },
  { id: 'memory', label: '메모리' },
  { id: 'scheduler', label: '스케줄' },
  { id: 'swarm', label: 'Swarms' },
]
```

#### 내부 상태

- `tab: Tab` - 현재 활성 탭 (기본값: 'chat')
- `showSettings: boolean` - 설정 화면 표시 여부
- `darkMode: boolean` - 다크 모드 상태
- `pendingPrompt: string` - FAB/Popup에서 받은 보류 중인 프롬프트

#### useEffect 훅

1. **다크 모드 초기화** (29-35줄)
   - chrome.storage.local.get('hchat:config:darkMode')
   - document.documentElement에 'dark' 클래스 토글

2. **Pending Prompt 감지** (57-68줄)
   - 초기 로드 시 checkPendingPrompt() 호출
   - chrome.storage.local.onChanged 리스너 등록
   - 'hchat:fab-pending' 변경 감지 → checkPendingPrompt()

3. **다크 모드 적용** (70-73줄)
   - darkMode 변경 시 document.documentElement 업데이트
   - chrome.storage.local에 저장

#### 주요 함수

**checkPendingPrompt()** (38-54줄)
- FAB/Popup에서 보낸 pending prompt를 감지하고 처리
- chrome.storage.local.get('hchat:fab-pending') 조회
- 5초 이내의 pending만 처리 (오래된 것은 무시)
- pendingPrompt 상태 설정
- 채팅 탭으로 자동 전환
- 설정 화면 닫기
- 'hchat:fab-pending' 삭제

#### UI 구조

##### 1. 로딩 상태 (75-81줄)

```typescript
if (!loaded) {
  return (
    <div className="app" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>로딩 중...</div>
    </div>
  )
}
```

##### 2. AWS 자격증명 미설정 화면 (85-111줄)

- 조건: `!hasCredentials && !showSettings`
- 구조:
  - 헤더 (로고 + 제목 + 설정 버튼)
  - 구분선
  - 빈 상태:
    - 로고(H)
    - "H Chat에 오신 것을 환영합니다"
    - "시작하려면 AWS Bedrock 자격증명을 설정하세요"
    - "AWS 설정하기" 버튼

##### 3. 설정 화면 (113-130줄)

- 조건: `showSettings`
- 구조:
  - 헤더 (뒤로가기 버튼 + "설정")
  - 구분선
  - SettingsView 컴포넌트:
    - darkMode, onToggleDarkMode props 전달

##### 4. 메인 화면 (132-174줄)

- 조건: `hasCredentials && !showSettings`
- 구조:
  - **헤더** (134-143줄):
    - 로고(H) + "H Chat" + 설정 버튼 (톱니바퀴 아이콘)
  - **탭 바** (145-155줄):
    - 4개 탭 (채팅/메모리/스케줄/Swarms)
    - 활성 탭: `.tab-pill-active` 클래스
  - **구분선** (157줄)
  - **콘텐츠 영역** (159-171줄):
    - `tab === 'chat'`: ChatView 컴포넌트
    - `tab === 'memory'`: MemoryPanel 컴포넌트
    - `tab === 'scheduler'`: SchedulerPanel 컴포넌트
    - `tab === 'swarm'`: SwarmPanel 컴포넌트

#### 컴포넌트 Props

1. **ChatView**:
   ```typescript
   {
     conversationId: CONV_ID,
     config: config,
     pendingPrompt: pendingPrompt,
     onPendingConsumed: () => setPendingPrompt('')
   }
   ```

2. **MemoryPanel**:
   ```typescript
   {
     conversationId: CONV_ID
   }
   ```

3. **SchedulerPanel**:
   ```typescript
   {
     conversationId: CONV_ID
   }
   ```

4. **SwarmPanel**:
   ```typescript
   {
     config: config
   }
   ```

5. **SettingsView**:
   ```typescript
   {
     darkMode: darkMode,
     onToggleDarkMode: () => setDarkMode((d) => !d)
   }
   ```

#### 데이터 흐름

```
사이드패널 열림 (background/index.ts)
  ↓
App 컴포넌트 마운트
  ↓
useConfig(): Storage에서 설정 로드
  ↓
[분기 1: hasCredentials = false]
  → "AWS 설정하기" 화면
  → 설정 버튼 클릭 → SettingsView
  ↓
[분기 2: hasCredentials = true]
  → 메인 화면 (헤더 + 탭 바 + 콘텐츠)
  → 탭 클릭 → 해당 컴포넌트 렌더링
  ↓
[분기 3: pendingPrompt 감지]
  → checkPendingPrompt()
  → 채팅 탭으로 전환
  → ChatView에서 자동 전송
  ↓
pendingPrompt 소비 후 onPendingConsumed()
  → pendingPrompt = '' 리셋
```

#### Storage 이벤트 흐름

```
FAB/Popup에서 액션 실행
  ↓
chrome.storage.local.set('hchat:fab-pending', {
  action: 'summarize',
  text: '...',
  pageUrl: '...',
  pageTitle: '...',
  ts: Date.now()
})
  ↓
chrome.storage.local.onChanged 이벤트
  ↓
App.tsx: checkPendingPrompt()
  ↓
pending.ts가 5초 이내인지 확인
  ↓
[조건 만족]
  → setPendingPrompt(pending.text)
  → setTab('chat')
  → setShowSettings(false)
  → chrome.storage.local.remove('hchat:fab-pending')
  ↓
ChatView useEffect: pendingPrompt가 있으면 자동 전송
  ↓
onPendingConsumed() 호출
  ↓
setPendingPrompt('') 리셋
```

#### 스타일링

- `../styles/global.css` 사용
- 클래스명:
  - `.app`: 메인 컨테이너 (flex-direction: column, height: 100%)
  - `.header`: 헤더 영역
  - `.tab-bar`: 탭 바
  - `.tab-pill`: 탭 버튼
  - `.tab-pill-active`: 활성 탭
  - `.content`: 콘텐츠 영역 (flex: 1, overflow-y: auto)
  - `.divider`: 구분선

#### 특징

1. **통합 인터페이스**: 채팅, 메모리, 스케줄러, Swarms를 하나의 패널에 통합
2. **자동 프롬프트 전송**: FAB/Popup에서 보낸 프롬프트를 자동으로 감지하고 전송
3. **설정 필수 체크**: AWS 자격증명 미설정 시 설정 화면으로 유도
4. **다크 모드**: 사용자 설정에 따라 자동으로 다크 모드 적용
5. **대화 ID 고정**: 모든 기능이 'hchat-main' 대화 ID 공유 (메모리, 스케줄러)
6. **pending prompt 타임아웃**: 5초 이상 지난 pending은 무시 (중복 처리 방지)

#### manifest.json 연동

```json
{
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "permissions": [
    "sidePanel"
  ]
}
```

- chrome.sidePanel.open() 호출 시 sidepanel.html이 열림
- sidepanel.html에서 sidepanel/main.tsx (번들링된 JS) 로드
