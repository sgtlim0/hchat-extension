# background 디렉토리

## 개요

Chrome Extension의 백그라운드 서비스 워커(Service Worker)를 구현하는 디렉토리입니다.
확장 프로그램의 수명 주기 이벤트를 처리하고, 예약된 작업(Scheduled Tasks)을 chrome.alarms API를 통해 실행하며,
팝업/사이드패널/콘텐츠 스크립트 간의 메시지 라우팅을 담당합니다.

## 파일 목록

### index.ts (150줄)

백그라운드 서비스 워커의 진입점 파일입니다.

#### 주요 상수

```typescript
const ALARM_PREFIX = 'hchat-task-'
const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-6'
const DEFAULT_REGION = 'us-east-1'
```

#### 이벤트 리스너

1. **chrome.runtime.onInstalled** (13-16줄)
   - 확장 프로그램 설치/업데이트 시 호출
   - `Scheduler.restoreAllAlarms()`를 호출하여 모든 예약된 작업의 알람을 복원

2. **chrome.runtime.onStartup** (19-22줄)
   - 브라우저 시작 시 호출
   - 서비스 워커 재시작 시 알람 복원

3. **chrome.alarms.onAlarm** (25-100줄)
   - chrome.alarms API에서 발생한 알람 이벤트 처리
   - `ALARM_PREFIX`로 시작하는 알람만 필터링
   - 알람 이름에서 taskId 추출 → 작업 조회 → AWS Bedrock API 호출

   **처리 흐름:**
   - taskId 추출 및 작업 검증 (26-32줄)
   - AWS 자격증명 확인 (37-46줄)
   - Bedrock API 요청 구성 및 SigV4 서명 (51-70줄)
   - API 호출 및 응답 처리 (72-79줄)
   - 결과를 chrome.storage에 저장 (최근 20개) (82-85줄)
   - chrome.notifications로 알림 표시 (88-93줄)
   - 다음 실행 시간 업데이트 (96줄)

4. **chrome.runtime.onMessage** (106-149줄)
   - 확장 프로그램 내부 메시지 라우팅

   **메시지 타입:**

   - `'open-sidepanel'` (107-117줄)
     - 사이드패널을 여는 요청 처리
     - sender.tab.id 사용, 없으면 현재 활성 탭 조회

   - `'get-page-text'` (120-148줄)
     - 현재 탭의 페이지 텍스트를 추출하는 요청
     - chrome.scripting.executeScript로 콘텐츠 스크립트 주입
     - article, main, body 순으로 DOM 요소 선택
     - 최대 8000자로 제한
     - 반환: `{ text: string, title: string, url: string }`

#### 데이터 흐름

```
chrome.alarms 이벤트
  ↓
taskId 추출 → Scheduler.list() → 작업 조회
  ↓
Storage.get('hchat:config:aws') → AWS 자격증명
  ↓
signRequest() → AWS SigV4 서명
  ↓
Bedrock API 호출
  ↓
결과 → Storage.set('hchat:scheduled-results:*')
  ↓
chrome.notifications 알림 표시
  ↓
Scheduler.markRun() → 다음 실행 시간 업데이트
```

#### 의존성

- `../lib/scheduler`: 스케줄러 로직
- `../lib/storage`: chrome.storage 래퍼
- `../lib/aws-sigv4`: AWS 서명 생성

#### 주요 기능

1. **알람 복원**: 확장 프로그램 재시작/업데이트 시 모든 예약된 작업의 알람을 chrome.alarms에 다시 등록
2. **예약 작업 실행**: chrome.alarms 이벤트 수신 → AWS Bedrock API 호출 → 결과 저장 및 알림
3. **메시지 라우팅**: 사이드패널 열기, 페이지 텍스트 추출 등의 요청을 각 컴포넌트로 라우팅
4. **콘텐츠 추출**: chrome.scripting API를 사용하여 활성 탭의 텍스트 콘텐츠 추출

#### 특징

- **Persistent Storage**: chrome.storage.local 사용으로 서비스 워커 재시작 후에도 데이터 유지
- **비동기 메시지 처리**: `return true`로 sendResponse를 비동기로 호출 가능
- **오류 처리**: try-catch로 Bedrock API 호출 실패 시에도 확장 프로그램이 멈추지 않도록 방어
