# popup 디렉토리

## 개요

Chrome Extension의 팝업(Popup) UI를 구현하는 디렉토리입니다.
확장 프로그램 아이콘 클릭 시 표시되는 작은 팝업 창으로, 사이드패널 런처와 빠른 액션 버튼을 제공합니다.

## 파일 목록

### main.tsx (11줄)

팝업의 진입점 파일입니다.

#### 코드 구조

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PopupApp } from './PopupApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>
)
```

#### 역할

- React 18의 createRoot API 사용
- StrictMode로 개발 시 잠재적 문제 감지
- `#root` DOM 요소에 PopupApp 컴포넌트 렌더링

---

### PopupApp.tsx (177줄)

팝업의 메인 컴포넌트입니다. Pencil Ext/Popup 디자인을 반영합니다.

#### 내부 컴포넌트

**SvgIcon** (6-28줄)
- SVG 아이콘 렌더링 유틸리티 컴포넌트
- Props:
  ```typescript
  {
    name: string        // 아이콘 이름
    size?: number       // 크기 (기본값: 14)
    color?: string      // 색상 (기본값: 'currentColor')
  }
  ```
- 지원 아이콘:
  - `panel-right`: 사이드패널 아이콘
  - `zap`: 번개 아이콘 (빠른 질문)
  - `file-text`: 문서 아이콘 (요약)
  - `languages`: 번역 아이콘
  - `pen-tool`: 글쓰기 아이콘

#### 내부 상태

- `activeTasks: number` - 활성화된 예약 작업 개수
- `hasCredentials: boolean` - AWS 자격증명 설정 여부
- `memorySize: string` - chrome.storage 사용량

#### useEffect 훅

**초기화** (35-52줄)
1. AWS 자격증명 확인:
   - chrome.storage.local.get('hchat:config:aws')
   - awsAccessKeyId와 awsSecretAccessKey 존재 확인
2. 활성 작업 개수 조회:
   - Scheduler.list() → enabled=true 필터링
3. 메모리 사용량 조회:
   - chrome.storage.local.getBytesInUse(null)
   - 단위 변환 (B/KB/MB)
4. 다크 모드 적용:
   - chrome.storage.local.get('hchat:config:darkMode')
   - document.documentElement에 'dark' 클래스 토글

#### 주요 함수

1. **openSidePanel()** (54-60줄)
   - 사이드패널을 여는 함수
   - chrome.tabs.query()로 현재 활성 탭 조회
   - chrome.sidePanel.open({ tabId })
   - window.close()로 팝업 닫기

2. **quickAction(action: string)** (62-99줄)
   - 빠른 액션 실행 함수
   - background에 페이지 텍스트 요청:
     ```typescript
     chrome.runtime.sendMessage({ type: 'get-page-text' })
     ```
   - 액션별 프롬프트 생성:
     - `summarize`: "다음 웹페이지 내용을 한국어로 요약해줘"
     - `translate`: "다음 웹페이지 내용을 한국어로 번역해줘 (이미 한국어면 영어로)"
     - 기타: "글쓰기를 도와줘"
   - chrome.storage.local.set('hchat:fab-pending') 저장
   - 사이드패널 열기 → 팝업 닫기

#### UI 구조

1. **헤더** (104-110줄)
   - 로고(H) + "H Chat" + 설명 ("AI 채팅 어시스턴트 · AWS Bedrock")

2. **구분선** (112줄)

3. **상태 카드** (115-135줄)
   - API 키 상태:
     - 점(status-dot) + "API 키" + "설정됨"/"미설정"
     - 색상: hasCredentials ? 초록색 : 빨간색
   - 예약 작업:
     - 점(status-dot-blue) + "예약 작업" + "{activeTasks}개 활성"
   - 메모리:
     - 점(status-dot-gray) + "메모리" + "{memorySize}"

4. **액션 버튼** (138-151줄)
   - **사이드패널 열기** (primary):
     - panel-right 아이콘
     - onClick: openSidePanel()
   - **빠른 질문** (outlined):
     - zap 아이콘
     - onClick:
       ```typescript
       await chrome.storage.local.set({ 'hchat:focus-input': Date.now() })
       await openSidePanel()
       ```

5. **구분선** (153줄)

6. **빠른 액션 목록** (156-169줄)
   - **이 페이지 요약**:
     - file-text 아이콘
     - onClick: quickAction('summarize')
   - **번역하기**:
     - languages 아이콘
     - onClick: quickAction('translate')
   - **글쓰기 도우미**:
     - pen-tool 아이콘
     - onClick: quickAction('write')

7. **푸터** (172-174줄)
   - "Ctrl+Shift+H로 빠르게 열기"

#### 스타일링

- `../styles/global.css` 사용
- 클래스명:
  - `.popup`: 메인 컨테이너 (width: 320px)
  - `.popup-header`: 헤더 영역
  - `.popup-status-card`: 상태 카드
  - `.popup-btn-primary`: 주요 버튼 (파란색)
  - `.popup-btn-outlined`: 외곽선 버튼
  - `.popup-quick-row`: 빠른 액션 행
  - `.popup-footer`: 푸터

#### 데이터 흐름

```
사용자 클릭 (확장 아이콘)
  ↓
PopupApp 렌더링
  ↓
useEffect: Storage 조회 (AWS, 활성 작업, 메모리)
  ↓
상태 카드 표시
  ↓
[사용자 액션]
  ↓
1. "사이드패널 열기" → openSidePanel()
2. "빠른 질문" → focus-input 플래그 설정 → openSidePanel()
3. "이 페이지 요약" → quickAction('summarize')
  ↓
quickAction():
  - background에 페이지 텍스트 요청
  - 프롬프트 구성
  - Storage.set('hchat:fab-pending')
  - openSidePanel()
  ↓
사이드패널 열림
  ↓
sidepanel/App.tsx에서 pending prompt 감지
  ↓
ChatView에서 자동으로 메시지 전송
```

#### 특징

1. **상태 대시보드**: API 키 설정, 예약 작업, 메모리 사용량을 한눈에 표시
2. **빠른 실행**: 사이드패널을 열지 않고도 페이지 요약/번역 등 실행 가능
3. **컴팩트 디자인**: 320px 폭의 작은 팝업에 모든 정보 압축
4. **다크 모드**: 사용자 설정에 따라 자동으로 다크 모드 적용
5. **키보드 단축키 안내**: Ctrl+Shift+H 사용 방법 표시

#### manifest.json 연동

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

- 확장 프로그램 아이콘 클릭 시 popup.html이 열림
- popup.html에서 popup/main.tsx (번들링된 JS) 로드
