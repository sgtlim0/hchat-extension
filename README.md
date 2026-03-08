# H Chat Extension

> Chrome AI 어시스턴트 — AWS Bedrock Claude 기반 사이드패널 확장 프로그램

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://github.com/sgtlim0/hchat-extension)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)

## Overview

H Chat Extension은 **모든 웹페이지에서 즉시 사용 가능한 AI 어시스턴트**입니다. Chrome 사이드패널에서 AWS Bedrock Claude와 직접 통신하며, 별도 서버 없이 동작합니다.

| 항목 | 값 |
|------|-----|
| **Version** | 2.0.0 |
| **Platform** | Chrome Extension (Manifest V3) |
| **AI Provider** | AWS Bedrock, OpenAI, Gemini (Multi-Provider) |
| **Source** | 70+ files, 14,000+ lines (TS/TSX + CSS) |
| **Features** | 25 features across 5 phases |
| **Dependencies** | react, react-dom, zustand |
| **GitHub** | https://github.com/sgtlim0/hchat-extension |

## Features (v1.0)

### 1. AI 채팅 (Side Panel)
- AWS Bedrock Event Stream 실시간 스트리밍
- AWS SigV4 서명 (Web Crypto API, 서버리스)
- 모델 선택: Sonnet 4.6 / Opus 4.6 / Haiku 4.5
- 대화 히스토리, 메시지 타임스탬프
- Auto-resize textarea, Enter/Shift+Enter
- 빠른 제안 칩 (요약, 코드 리뷰, AI 뉴스)

### 2. 대화 메모리
- CLAUDE.md 스타일 마크다운 메모리
- 시스템 프롬프트 자동 주입
- CRUD + append, 용량 표시
- 대화별 컨텍스트 관리

### 3. 작업 스케줄러
- `chrome.alarms` 백그라운드 실행 (확장 닫혀도 동작)
- 3가지 타입: 인터벌 / 매일 / 평일
- 브라우저 재시작 후 알람 자동 복원
- Chrome 알림 결과 전달

### 4. 에이전트 스웜
- `Promise.all` 병렬 멀티 에이전트 실행
- 프리셋 팀: 리서치 (3인) / 토론 (3인)
- 커스텀 에이전트 추가
- 오케스트레이터 결과 종합

### 5. FAB 콘텐츠 스크립트
- 모든 웹페이지 우하단 Floating Action Button
- 6가지 컨텍스트 메뉴: 질문/요약/번역/다시쓰기/코드설명
- 텍스트 선택 툴팁 (400ms)
- 다크모드 자동 감지

### 6. 팝업 런처
- 상태 대시보드 (API/작업/메모리)
- 5가지 빠른 동작: 사이드패널/질문/요약/번역/글쓰기

## Tech Stack

| 항목 | 기술 | 버전 |
|------|------|------|
| UI | React | 18.3.1 |
| Language | TypeScript (strict) | 5.5.3 |
| Build | Vite | 5.4.2 |
| Platform | Chrome Extension MV3 | 3 |
| AI | AWS Bedrock | Claude |
| Font | Inter + JetBrains Mono | - |
| Style | CSS Variables (Light/Dark) | - |

## Supported Models

| Model | Bedrock ID | Use Case |
|-------|-----------|----------|
| Claude Sonnet 4.6 | `us.anthropic.claude-sonnet-4-6` | Default (Recommended) |
| Claude Opus 4.6 | `us.anthropic.claude-opus-4-6-v1` | Best Performance |
| Claude Haiku 4.5 | `us.anthropic.claude-haiku-4-5-20251001-v1:0` | Fast Response |

## Project Structure

```
hchat-extension/
├── public/manifest.json          # Chrome MV3 manifest
├── package.json                  # Dependencies
├── vite.config.ts                # Multi-entry build
├── tsconfig.json                 # TypeScript (strict, ES2020)
├── sidepanel.html                # Side panel entry
├── popup.html                    # Popup entry
├── PLANNING.md                   # v2 roadmap (5 Phase, 25 features)
├── ARCHITECTURE.md               # v2 architecture design
├── TODOLIST.md                   # Implementation todo
├── docs/                         # Feature documentation
│   ├── phase-1-core.md
│   ├── phase-2-productivity.md
│   ├── phase-3-web-integration.md
│   ├── phase-4-advanced-ai.md
│   └── phase-5-enterprise.md
└── src/
    ├── background/index.ts       # Service Worker
    ├── content/fab.ts            # FAB + context menu
    ├── sidepanel/App.tsx         # Main React app (4 tabs)
    ├── popup/PopupApp.tsx        # Quick launcher
    ├── components/               # UI components (5)
    │   ├── ChatView.tsx
    │   ├── MemoryPanel.tsx
    │   ├── SchedulerPanel.tsx
    │   ├── SwarmPanel.tsx
    │   └── SettingsView.tsx
    ├── hooks/                    # Custom hooks (5)
    │   ├── useChat.ts
    │   ├── useConfig.ts
    │   ├── useMemory.ts
    │   ├── useScheduler.ts
    │   └── useSwarm.ts
    ├── lib/                      # Business logic (6)
    │   ├── aws-sigv4.ts          # AWS SigV4 signing
    │   ├── claude.ts             # Bedrock streaming client
    │   ├── storage.ts            # chrome.storage abstraction
    │   ├── memory.ts             # Conversation memory
    │   ├── scheduler.ts          # chrome.alarms scheduler
    │   └── swarm.ts              # Multi-agent orchestration
    └── styles/global.css         # Design system (1,134 lines)
```

## Architecture

```
[User Input]
    |
    +-- Content Script (FAB) --> chrome.storage ('hchat:fab-pending')
    |                                    |
    +-- Popup (Quick Action) ----------->|
    |                                    v
    |                           Side Panel (storage listener)
    |                                    |
    +-- Side Panel (Direct) -----> useChat hook
                                         |
                                    Memory lookup + system prompt injection
                                         |
                                    AWS SigV4 signing
                                         |
                                    Bedrock API (streaming)
                                         |
                                    Event Stream binary parsing
                                         |
                                    Real-time UI update
```

## Storage Schema

| Key | Type | Purpose |
|-----|------|---------|
| `hchat:config` | Config | AWS credentials, model, region |
| `hchat:config:aws` | Object | Background SW credential copy |
| `hchat:memory:{id}` | MemoryEntry | Per-conversation memory |
| `hchat:scheduler:tasks` | Task[] | Scheduled tasks |
| `hchat:scheduled-results:{id}` | Result[] | Task results (max 20) |
| `hchat:fab-pending` | PendingAction | FAB -> side panel handoff |

## Manifest Permissions

| Permission | Purpose |
|-----------|---------|
| `storage` | Conversations, settings, memory |
| `alarms` | Background scheduler |
| `sidePanel` | Side panel API |
| `notifications` | Task completion alerts |
| `activeTab` | Current tab access |
| `scripting` | Content script injection |

**Host**: `https://bedrock-runtime.*.amazonaws.com/*`
**CSP**: `script-src 'self'; object-src 'self'`

## Setup

### Prerequisites
- Node.js 18+
- AWS Bedrock access (Claude models enabled)
- AWS Access Key ID + Secret Access Key

### Development

```bash
npm install
npm run dev        # Watch mode (auto-rebuild)
npm run build      # Production build -> dist/
```

### Chrome Load

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" -> select `dist/` folder

### Initial Setup

1. Click extension icon -> open side panel
2. Settings tab -> enter AWS credentials
3. Click "Test Connection" to verify

## Security

- AWS credentials: `chrome.storage.local` only (no sync)
- Direct AWS Bedrock communication (no proxy server)
- CSP: no inline scripts, no eval()
- All data stored locally (no telemetry)
- Page content extraction runs in content script sandbox

## v2.0 Roadmap

5 Phases, 25 features planned. See [PLANNING.md](./PLANNING.md) for details, [ARCHITECTURE.md](./ARCHITECTURE.md) for design.

| Phase | Name | Features | Status |
|-------|------|----------|--------|
| 1 | Core Enhancement | Multi-session, slash commands, context stack, search, export | **Complete** |
| 2 | Productivity | Highlights, reading mode, inline translate, smart clipboard, shortcuts | **Complete** |
| 3 | Web Integration | YouTube, Gmail, GitHub, PDF, social media | **Complete** |
| 4 | Advanced AI | Screenshot OCR, voice I/O, prompt chaining, knowledge graph, tool use | **Complete** |
| 5 | Enterprise | Usage tracking, audit logs, PWA sync, prompt library, multi-provider | **Complete** |

**All 25 features implemented and merged to main.**

## Related Projects

- **[hchat-pwa](https://hchat-desktop.vercel.app)** — Full-featured AI chat web app (120+ features, 24 phases complete)

## License

Private
