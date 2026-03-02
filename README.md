# H Chat Extension (v1)

AWS Bedrock Claude 기반 Chrome AI 어시스턴트 확장 프로그램

## Overview

H Chat Extension은 Chrome 사이드패널에서 동작하는 AI 채팅 어시스턴트입니다. AWS Bedrock을 통해 Claude 모델과 직접 통신하며, 대화 메모리, 작업 스케줄러, 멀티 에이전트 스웜 기능을 제공합니다.

- **Version**: 1.0.0
- **Platform**: Chrome Extension (Manifest V3)
- **AI Provider**: AWS Bedrock (Claude)
- **GitHub**: https://github.com/sgtlim0/hchat-extension
- **Vercel**: https://hchat-extension.vercel.app/sidepanel.html

## Features

### 1. AI 채팅 (ChatView)
- 실시간 스트리밍 응답 (AWS Event Stream 프로토콜)
- 대화 메모리 자동 주입 (CLAUDE.md 스타일)
- 메시지 히스토리 및 타임스탬프
- 자동 리사이즈 입력창 (최대 120px)
- 모델 인디케이터 표시
- 빠른 제안 칩 (요약, 번역, 코드 설명 등)
- Enter 전송, Shift+Enter 줄바꿈

### 2. 대화 메모리 (MemoryPanel)
- 대화별 Markdown 메모리 저장
- AI 시스템 프롬프트에 자동 주입
- CRUD 및 append 지원
- Monaco 스타일 편집기

```
# 이 대화에 대한 기억 (CLAUDE.md)
{memory.content}
```

### 3. 작업 스케줄러 (SchedulerPanel)
- `chrome.alarms` 기반 백그라운드 실행 (확장 닫혀도 동작)
- 3가지 스케줄 타입:
  - **인터벌**: N분마다 반복
  - **매일**: 특정 시각
  - **평일**: 월-금 특정 시각
- 브라우저 재시작 후 알람 자동 복원
- Chrome 알림으로 실행 결과 전달
- 작업 활성화/비활성화 토글

### 4. 에이전트 스웜 (SwarmPanel)
- **병렬 실행**: 모든 에이전트 `Promise.all`로 동시 호출
- **프리셋 팀**:
  - 리서치: 연구자 → 분석가 → 작성자
  - 토론: 찬성 → 반대 → 중재자
- **커스텀 에이전트**: 역할/시스템 프롬프트 직접 정의
- **오케스트레이터**: 개별 결과를 종합하여 최종 답변 생성
- 에이전트별 상태 표시 (대기/실행/완료/오류)

### 5. 콘텐츠 스크립트 (FAB)
- **Floating Action Button**: 모든 웹페이지 우하단 "H" 버튼
- **컨텍스트 메뉴** (텍스트 선택 시):
  - AI에게 질문
  - 요약
  - 번역
  - 재작성
  - 코드 설명
- **선택 툴팁**: 텍스트 선택 400ms 후 빠른 질문 버튼
- 다크모드 자동 감지

### 6. 팝업 (PopupApp)
- 빠른 실행기 + 상태 대시보드
- API 키 상태, 활성 작업 수, 스토리지 사용량
- 5가지 빠른 동작: 사이드패널 열기, 질문, 요약, 번역, 글쓰기

### 7. 설정 (SettingsView)
- AWS Bedrock 자격증명 (Access Key ID, Secret Key, Region)
- 모델 선택 (Sonnet 4.6 / Opus 4.6 / Haiku 4.5)
- 연결 테스트 버튼
- 다크모드 토글

## Tech Stack

| 항목 | 기술 | 버전 |
|------|------|------|
| UI | React | 18.3.1 |
| 언어 | TypeScript | 5.5.3 |
| 빌드 | Vite | 5.4.2 |
| 확장 API | Chrome Manifest V3 | 3 |
| AI | AWS Bedrock | Claude |
| 폰트 | Inter + JetBrains Mono | - |
| 스타일 | CSS Variables + Dark/Light | - |

## Supported Models

| 모델 | Bedrock Model ID | 용도 |
|------|-------------------|------|
| Claude Sonnet 4.6 | `us.anthropic.claude-sonnet-4-6` | 기본 (권장) |
| Claude Opus 4.6 | `us.anthropic.claude-opus-4-6-v1` | 최고 성능 |
| Claude Haiku 4.5 | `us.anthropic.claude-haiku-4-5-20251001-v1:0` | 빠른 응답 |

## Project Structure

```
hchat-extension/
├── manifest.json                  # Chrome MV3 매니페스트
├── package.json                   # 의존성
├── vite.config.ts                 # 멀티 엔트리 빌드
├── tsconfig.json                  # TypeScript 설정 (ES2020, strict)
├── vercel.json                    # Vercel 배포 설정
├── sidepanel.html                 # 사이드패널 엔트리
├── popup.html                     # 팝업 엔트리
├── public/icons/                  # 확장 아이콘 (16, 48, 128px)
└── src/
    ├── background/
    │   └── index.ts               # 서비스 워커
    │                                - chrome.alarms 핸들러
    │                                - 메시지 핸들러 (open-sidepanel, get-page-text)
    │                                - 스케줄 작업 실행 (Bedrock API 호출)
    │                                - 알람 복원 (onInstalled, onStartup)
    ├── sidepanel/
    │   ├── App.tsx                 # 메인 앱 (5탭 UI)
    │   └── main.tsx                # React 엔트리
    ├── popup/
    │   ├── PopupApp.tsx            # 빠른 실행기 + 상태 대시보드
    │   └── main.tsx                # React 엔트리
    ├── content/
    │   └── fab.ts                  # FAB + 컨텍스트 메뉴 + 선택 툴팁
    ├── components/
    │   ├── ChatView.tsx            # 채팅 인터페이스 (스트리밍, 메모리 주입)
    │   ├── MemoryPanel.tsx         # CLAUDE.md 스타일 메모리 편집기
    │   ├── SchedulerPanel.tsx      # 작업 스케줄러 UI (추가/편집/삭제/토글)
    │   ├── SwarmPanel.tsx          # 에이전트 스웜 UI (프리셋/커스텀)
    │   └── SettingsView.tsx        # AWS 자격증명 + 모델 선택 + 다크모드
    ├── hooks/
    │   ├── useChat.ts              # 채팅 상태 (메시지, 스트리밍, 에러)
    │   ├── useConfig.ts            # 설정 영속화 (AWS 자격증명, 모델)
    │   ├── useMemory.ts            # 메모리 CRUD (get/set/append/delete)
    │   ├── useScheduler.ts         # 스케줄러 CRUD (add/toggle/remove)
    │   └── useSwarm.ts             # 스웜 실행 상태 (run/reset)
    ├── lib/
    │   ├── aws-sigv4.ts            # AWS Signature V4 (Web Crypto API)
    │   │                            - HMAC-SHA256 키 유도
    │   │                            - Canonical Request 생성
    │   │                            - Authorization 헤더 서명
    │   ├── claude.ts               # Bedrock 스트리밍 클라이언트
    │   │                            - Event Stream 바이너리 파싱
    │   │                            - Base64 → UTF-8 (한국어 안전)
    │   │                            - onChunk 콜백 스트리밍
    │   ├── storage.ts              # chrome.storage.local 추상화
    │   │                            - get/set/remove/getAll
    │   ├── memory.ts               # 대화 메모리 저장소
    │   │                            - get/set/append/delete/toSystemPrompt
    │   ├── scheduler.ts            # chrome.alarms 스케줄러
    │   │                            - 인터벌/매일/평일 스케줄
    │   │                            - 알람 등록/복원
    │   │                            - 다음 실행 시간 계산
    │   └── swarm.ts                # 멀티 에이전트 오케스트레이션
    │                                - 프리셋 팀 (research, debate)
    │                                - 병렬 실행 + 오케스트레이터 종합
    └── styles/
        └── global.css              # 디자인 시스템 (~26KB)
                                     - CSS 변수 (Light/Dark)
                                     - Inter + JetBrains Mono
                                     - 컴포넌트 스타일
```

## Architecture

### 데이터 플로우

```
[사용자 입력]
    │
    ├── Content Script (FAB) ──→ chrome.storage ('hchat:fab-pending')
    │                                    │
    ├── Popup (빠른 동작) ──────→ chrome.storage ('hchat:fab-pending')
    │                                    │
    │                                    ▼
    │                           Side Panel (storage listener)
    │                                    │
    └── Side Panel (직접 입력) ──→ useChat hook
                                         │
                                    Memory 조회 + 시스템 프롬프트 주입
                                         │
                                    AWS SigV4 서명
                                         │
                                    Bedrock API 호출
                                         │
                                    Event Stream 파싱
                                         │
                                    실시간 UI 업데이트
```

### AWS Bedrock 스트리밍 프로토콜

```
[4B totalLength][4B headersLength][4B preludeCRC]
[headers...variable]
[payload: {"bytes": "base64EncodedChunk"}]
[4B messageCRC]

→ Base64 디코딩 → JSON 파싱
→ content_block_delta.delta.text 추출
→ onChunk 콜백 호출
```

### 스토리지 스키마

| 키 | 데이터 | 용도 |
|----|--------|------|
| `hchat:config` | Config 객체 | AWS 자격증명, 모델, 리전 |
| `hchat:config:aws` | AWS 자격증명 | 백그라운드 워커용 복사본 |
| `hchat:config:darkMode` | boolean | 다크모드 상태 |
| `hchat:memory:{id}` | MemoryEntry | 대화별 메모리 |
| `hchat:scheduler:tasks` | ScheduledTask[] | 스케줄 작업 목록 |
| `hchat:scheduled-results:{id}` | Result[] | 작업 실행 결과 |
| `hchat:fab-pending` | PendingAction | FAB → 사이드패널 핸드오프 |
| `hchat:focus-input` | timestamp | 입력창 포커스 트리거 |

## Manifest Permissions

| 권한 | 용도 |
|------|------|
| `storage` | 대화 기록, 설정, 메모리 저장 |
| `alarms` | 작업 스케줄러 백그라운드 실행 |
| `sidePanel` | 사이드패널 API |
| `notifications` | 스케줄 작업 결과 알림 |
| `activeTab` | 현재 탭 콘텐츠 접근 |
| `scripting` | 콘텐츠 스크립트 동적 주입 |

**Host Permissions**: `https://bedrock-runtime.*.amazonaws.com/*`

**Content Security Policy**: `script-src 'self'; object-src 'self'`

## Setup & Development

### 필수 요구사항
- Node.js 18+
- AWS Bedrock 접근 권한 (Claude 모델 활성화)
- AWS Access Key ID + Secret Access Key

### 설치 및 개발

```bash
npm install
npm run dev        # watch 모드 빌드 (자동 리빌드)
npm run build      # 프로덕션 빌드 → dist/
```

### Chrome 로드

1. `chrome://extensions` 열기
2. "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" → `dist/` 폴더 선택

### 초기 설정

1. 확장 아이콘 클릭 → 사이드패널 열기
2. 설정 탭에서 AWS 자격증명 입력
   - Access Key ID
   - Secret Access Key
   - Region (기본: us-east-1)
3. "연결 테스트" 버튼으로 확인

## Design System

### 색상 팔레트

| 토큰 | Light | Dark |
|------|-------|------|
| Primary | `#3478FE` | `#5B93FF` |
| Background (Page) | `#FFFFFF` | `#1A1A1A` |
| Background (Sidebar) | `#F8F9FA` | `#1E1E1E` |
| Background (Card) | `#F8F9FA` | `#2A2A2A` |
| Text Primary | `#1A1A1A` | `#F0F0F0` |
| Text Secondary | `#6B7280` | `#9CA3AF` |
| Border | `#E5E7EB` | `#374151` |

### 타이포그래피
- **Sans**: Inter (300, 400, 500, 600, 700)
- **Mono**: JetBrains Mono (300, 400, 500, 600)
- **본문**: 13px, line-height 1.6
- **소형**: 12px (버튼, 레이블)
- **초소형**: 10-11px (힌트, 메타데이터)

## Security

- AWS 자격증명: `chrome.storage.local` 전용 (동기화 없음)
- 외부 서버 없이 AWS Bedrock 직접 통신 (HTTPS)
- CSP: 인라인 스크립트, eval() 금지
- 모든 데이터 로컬 저장 (텔레메트리, 분석 없음)
- 페이지 콘텐츠 추출은 콘텐츠 스크립트 샌드박스에서 실행

## v1 vs v2 비교

v2에서 추가된 기능은 [hchat-v2-extension](https://github.com/sgtlim0/hchat-v2-extension) 참조.

| 기능 | v1 | v2 |
|------|:--:|:--:|
| AI 채팅 + 스트리밍 | O | O |
| 대화 메모리 (CLAUDE.md) | O | X |
| 작업 스케줄러 | O | X |
| 에이전트 스웜 | O | X |
| 웹 검색 + RAG | X | O |
| 멀티턴 에이전트 (도구 호출) | X | O |
| 스마트 북마크/하이라이트 | X | O |
| 페이지 컨텍스트 추적 | X | O |
| 키보드 단축키 | X | O |
| 내보내기/가져오기 | X | O |
| 메시지 검색 | X | O |
| 사용량 추적 | X | O |
| 그룹 채팅 (멀티모델) | X | O |
| YouTube 자막 요약 | X | O |
| OCR | X | O |
| TTS/STT | X | O |

## License

Private
