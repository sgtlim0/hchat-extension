# styles 디렉토리

## 개요

전역 CSS 스타일을 포함하는 디렉토리입니다.
확장 프로그램 전체에서 사용되는 디자인 시스템, 컴포넌트 스타일, 유틸리티 클래스를 정의합니다.

## 파일 목록

### global.css (1135줄)

H Chat Extension의 전역 스타일시트입니다. Blue Primary 디자인 시스템을 사용하며, 라이트/다크 모드를 지원합니다.

#### 폰트

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&display=swap');
```

- **Inter**: 본문, UI 요소 (300-700 weight)
- **JetBrains Mono**: 코드, 모노스페이스 텍스트 (300-600 weight)

#### CSS 변수 (12-66줄)

##### Primary Colors

```css
--primary: #3478FE
--primary-hover: #2563EB
--primary-light: #5B93FF
--primary-dim: rgba(52, 120, 254, 0.1)
--primary-glow: rgba(52, 120, 254, 0.25)
```

##### Backgrounds

```css
--bg-page: #FFFFFF         /* 페이지 배경 */
--bg-sidebar: #F8F9FA      /* 사이드바 배경 */
--bg-card: #F8F9FA         /* 카드 배경 */
--bg-input: #FFFFFF        /* 입력 필드 배경 */
--bg-hover: #EEF2F6        /* 호버 배경 */
```

##### Text

```css
--text-primary: #1A1A1A    /* 주요 텍스트 */
--text-secondary: #6B7280  /* 보조 텍스트 */
--text-tertiary: #9CA3AF   /* 3차 텍스트 */
--text-white: #FFFFFF      /* 흰색 텍스트 */
```

##### Borders

```css
--border: #E5E7EB          /* 일반 테두리 */
--border-input: #D1D5DB    /* 입력 필드 테두리 */
```

##### Status

```css
--success: #22C55E         /* 성공 */
--danger: #EF4444          /* 위험 */
--warning: #F59E0B         /* 경고 */
--amber: #FBBF24           /* 주의 */
```

##### Typography

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif
--font-mono: 'JetBrains Mono', 'Fira Code', monospace
```

##### Legacy Aliases (47-65줄)

하위 호환성을 위한 별칭:
```css
--bg0: var(--bg-page)
--bg1: var(--bg-sidebar)
--bg2: var(--bg-card)
--bg3: var(--bg-hover)
--text0: var(--text-primary)
--text1: var(--text-secondary)
--accent: var(--primary)
...
```

#### 다크 모드 (69-90줄)

```css
.dark {
  --primary: #5B93FF        /* 더 밝은 파란색 */

  --bg-page: #1A1A1A
  --bg-sidebar: #1E1E1E
  --bg-card: #2A2A2A
  --bg-input: #2A2A2A
  --bg-hover: #333333

  --text-primary: #F0F0F0
  --text-secondary: #9CA3AF
  --text-tertiary: #6B7280

  --border: #374151
  --border-input: #4B5563
}
```

#### 레이아웃 스타일

##### 1. App Shell (107-112줄)

```css
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-page);
}
```

##### 2. Header (115-166줄)

```css
.header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
}

.header-logo {
  width: 32px;
  height: 32px;
  background: var(--primary);
  border-radius: 10px;
  font-weight: 700;
  font-size: 15px;
}
```

##### 3. Tab Bar (169-200줄)

```css
.tab-bar {
  display: flex;
  gap: 4px;
  padding: 0 14px 10px;
}

.tab-pill {
  flex: 1;
  padding: 7px 0;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
}

.tab-pill-active {
  background: var(--primary) !important;
  color: #FFFFFF !important;
  font-weight: 600;
}
```

##### 4. Content Area (210-216줄)

```css
.content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: var(--bg4) transparent;
}
```

#### 채팅 스타일 (219-452줄)

##### Chat View

```css
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  gap: 14px;
}
```

##### Empty State

```css
.chat-empty-logo {
  width: 44px;
  height: 44px;
  background: var(--primary);
  border-radius: 12px;
  font-size: 20px;
}
```

##### Message Bubbles

```css
.msg {
  display: flex;
  gap: 8px;
  animation: fadeUp 0.2s ease;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.msg-user .msg-content {
  background: var(--primary);
  color: #FFFFFF;
  border-radius: 16px 16px 4px 16px;
}

.msg-ai .msg-content {
  background: transparent;
  color: var(--text-primary);
}
```

##### Cursor Animation

```css
.cursor-blink {
  animation: blink 0.8s step-end infinite;
  color: var(--primary);
}

@keyframes blink {
  0%, 100% { opacity: 1 }
  50% { opacity: 0 }
}
```

##### Input Area

```css
.chat-input-area {
  padding: 12px 14px;
  background: var(--bg-sidebar);
}

.chat-input {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 12px;
  max-height: 120px;
}

.send-btn {
  width: 36px;
  height: 36px;
  background: var(--primary);
  border-radius: 10px;
}
```

#### 버튼 스타일 (517-589줄)

##### Primary Button

```css
.btn-primary {
  background: var(--primary);
  color: #FFFFFF;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
}

.btn-primary:hover {
  opacity: 0.88;
  box-shadow: 0 0 12px var(--primary-glow);
}
```

##### Ghost Button

```css
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 10px;
}

.btn-ghost.btn-danger:hover {
  color: var(--danger);
  border-color: var(--danger);
}
```

#### 폼 필드 (591-625줄)

```css
.field-input,
.field-textarea,
.field-select {
  width: 100%;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
}

.field-input:focus {
  border-color: var(--primary);
}
```

#### 패널 스타일 (466-514줄)

```css
.panel {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
}

.panel-icon-blue {
  background: var(--primary-dim);
  color: var(--primary);
}

.panel-icon-purple {
  background: rgba(139, 92, 246, 0.1);
  color: #8B5CF6;
}
```

#### 메모리 스타일 (639-697줄)

```css
.memory-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.memory-card-header {
  padding: 8px 12px;
  background: var(--bg-hover);
  border-bottom: 1px solid var(--border);
  font-size: 11px;
}

.memory-card-body {
  padding: 12px;
  font-family: var(--font-mono);
  font-size: 11px;
  max-height: 280px;
  overflow-y: auto;
}
```

#### 스케줄러 스타일 (699-744줄)

```css
.task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
}

.toggle {
  width: 32px;
  height: 18px;
  background: var(--bg4);
  border-radius: 999px;
  position: relative;
}

.toggle-on {
  background: var(--primary);
}

.toggle-knob {
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
}

.toggle-on .toggle-knob {
  transform: translateX(14px);
}
```

#### Swarm 스타일 (747-851줄)

```css
.agent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 9px 12px;
}

.agent-running {
  border-color: var(--primary);
  box-shadow: 0 0 8px var(--primary-dim);
}

.agent-done {
  border-color: rgba(34, 197, 94, 0.3);
}

.synthesis-box {
  background: var(--bg-card);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 10px;
}

.synthesis-header {
  padding: 8px 12px;
  background: rgba(34, 197, 94, 0.06);
  color: var(--success);
  font-size: 11px;
  font-weight: 600;
}
```

#### 설정 스타일 (854-945줄)

```css
.settings-view {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-row-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-row-icon-blue {
  background: var(--primary-dim);
  color: var(--primary);
}

.btn-test {
  background: var(--success);
  color: #FFFFFF;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 11px;
}
```

#### 팝업 스타일 (973-1129줄)

```css
.popup {
  width: 320px;
  background: var(--bg-page);
}

.popup-status-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-dot-green { background: var(--success); }
.status-dot-blue { background: var(--primary); }
.status-dot-red { background: var(--danger); }

.popup-btn-primary {
  width: 100%;
  padding: 10px 0;
  background: var(--primary);
  color: #FFFFFF;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}

.popup-quick-row {
  padding: 8px;
  border-radius: 6px;
  background: transparent;
  font-size: 12px;
}

.popup-quick-row:hover {
  background: var(--bg-hover);
}
```

#### 스크롤바 (1132-1135줄)

```css
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--bg4);
  border-radius: 2px;
}
```

#### 애니메이션

1. **fadeUp** (318-321줄): 메시지 등장 효과
2. **blink** (380줄): 커서 깜빡임
3. **spin** (463줄): 스피너 회전

#### 반응형 유틸리티

- **크기 변형**:
  - `.btn-xs`: padding 감소
  - `.btn-sm`: padding 중간
  - `.btn-full`: width 100%

- **상태 변형**:
  - `:hover`: opacity/background 변화
  - `:disabled`: opacity 0.35, cursor not-allowed
  - `:focus`: border-color 변경

#### 특징

1. **CSS 변수 기반**: 테마 변경 용이
2. **다크 모드 우선**: `.dark` 클래스로 자동 전환
3. **유틸리티 우선**: 재사용 가능한 클래스 다수
4. **애니메이션 최적화**: transform/opacity 사용으로 성능 최적화
5. **접근성**: outline, focus 스타일 제공
6. **브라우저 호환성**: -webkit-scrollbar 등 벤더 프리픽스 사용

#### 사용 예시

```tsx
// 버튼
<button className="btn-primary">저장</button>
<button className="btn-ghost btn-sm btn-danger">삭제</button>

// 입력
<input className="field-input" placeholder="..." />
<textarea className="field-textarea field-textarea-sm" />

// 카드
<div className="panel">
  <div className="panel-header">
    <div className="panel-icon panel-icon-blue">🔍</div>
    <span className="panel-title">제목</span>
  </div>
  <div className="panel-desc">설명</div>
</div>

// 상태
<div className="status-dot status-dot-green" />
<span className="badge">NEW</span>
```
