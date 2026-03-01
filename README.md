# H Chat Extension

nanoclaw의 핵심 기능(메모리, 스케줄러, Agent Swarms)을 크롬 확장 프로그램으로 구현한 AI 채팅 어시스턴트입니다.

## 주요 기능

| 기능 | 설명 | nanoclaw 대응 |
|---|---|---|
| 💬 **AI 채팅** | 스트리밍 응답, 메모리 자동 주입 | `src/index.ts` |
| 🧠 **대화 메모리** | CLAUDE.md 스타일, 대화별 격리 | `groups/*/CLAUDE.md` |
| ⏰ **스케줄러** | chrome.alarms 기반, 팝업 닫혀도 실행 | `src/task-scheduler.ts` |
| 🤖 **Agent Swarms** | 병렬 에이전트 팀, 리서치/토론 프리셋 | Agent Swarms 기능 |

## 빠른 시작

### 1. 빌드

```bash
npm install
npm run build
```

### 2. 크롬에 설치

1. Chrome 주소창에 `chrome://extensions` 입력
2. 우측 상단 **개발자 모드** 켜기
3. **압축 해제된 확장 프로그램 로드** 클릭
4. `dist/` 폴더 선택

### 3. API 키 설정

- 확장 아이콘 클릭 → **사이드패널 열기**
- ⚙️ 설정 탭에서 Anthropic API 키 입력
- [console.anthropic.com](https://console.anthropic.com)에서 발급

## 아키텍처

```
┌─────────────────────────────────┐
│         Chrome Extension        │
│                                 │
│  ┌──────────┐  ┌─────────────┐  │
│  │  Popup   │  │  SidePanel  │  │
│  │(런처/상태)│  │  (메인 UI)  │  │
│  └──────────┘  └─────────────┘  │
│                                 │
│  ┌─────────────────────────┐    │
│  │   Background SW         │    │
│  │  chrome.alarms 처리     │    │
│  │  스케줄 작업 실행        │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │   chrome.storage.local  │    │
│  │  메모리 / 작업 / 설정   │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
         ↓ HTTPS
  api.anthropic.com/v1/messages
```

## 파일 구조

```
hchat-extension/
├── manifest.json          # Chrome Extension MV3
├── sidepanel.html         # 사이드패널 진입점
├── popup.html             # 팝업 진입점
├── vite.config.ts         # 멀티 엔트리 빌드
├── public/icons/          # 확장 아이콘
└── src/
    ├── background/
    │   └── index.ts       # Service Worker (alarms 처리)
    ├── sidepanel/
    │   ├── App.tsx        # 메인 앱 (5탭 UI)
    │   └── main.tsx
    ├── popup/
    │   ├── PopupApp.tsx   # 런처 팝업
    │   └── main.tsx
    ├── lib/
    │   ├── storage.ts     # chrome.storage 추상화
    │   ├── memory.ts      # CLAUDE.md 스타일 메모리
    │   ├── scheduler.ts   # chrome.alarms 스케줄러
    │   ├── swarm.ts       # Agent Swarms
    │   └── claude.ts      # Claude API (스트리밍)
    ├── hooks/             # React 훅
    └── styles/
        └── global.css     # 흑요석 다크 테마
```

## 스케줄러 사용 예시

팝업이 닫혀있어도, 심지어 H Chat 탭이 없어도 백그라운드에서 실행됩니다:

```
매일 오전 9시 → "오늘 AI 뉴스 요약해줘"
평일 월요일 8시 → "이번 주 업무 계획 도와줘"  
30분마다 → "할 일 목록에서 완료된 항목 정리해줘"
```

결과는 Chrome 알림으로 표시되며 사이드패널에서도 확인 가능합니다.

## Agent Swarms 프리셋

**리서치 팀**: 리서처(정보 수집) + 분석가(인사이트 도출) + 작성자(보고서 작성)

**토론 팀**: 찬성 + 반대 + 중재자 → 균형잡힌 결론

커스텀 에이전트를 추가해 나만의 팀을 구성할 수도 있습니다.

## 보안

- API 키는 `chrome.storage.local`에 안전하게 저장
- 모든 API 호출은 HTTPS (api.anthropic.com)
- `host_permissions`으로 명시적으로 허용된 도메인만 호출
- 대화 데이터는 로컬에만 저장, 외부 서버 없음
