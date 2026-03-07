# Phase 3: 웹 연동 (Web Integration)

> 주요 웹 서비스와의 깊은 AI 연동

## 3-1. YouTube 자막 분석

### 요구사항
- YouTube 동영상 자막 자동 추출
- AI 요약 (전체/구간별)
- 타임스탬프 기반 네비게이션
- 핵심 포인트 추출 (bullet points)

### 구현 방안
- YouTube 페이지 감지 (`youtube.com/watch`)
- 자막 API: `ytInitialPlayerResponse` JSON에서 `captionTracks` URL 추출
- 자막 XML → 텍스트 변환 (타임스탬프 보존)
- Bedrock API에 자막 전문 전달 → 구조화된 요약

### 컨텐츠 스크립트 매치
```json
"content_scripts": [
  { "matches": ["*://www.youtube.com/watch*"], "js": ["src/content/youtube.js"] }
]
```

### 복잡도: 중간

---

## 3-2. Gmail 작성 도우미

### 요구사항
- Gmail 작성 창에서 AI 자동완성 제안
- 톤 조정: 공식적/친근한/간결한
- 답장 템플릿 자동 생성 (수신 이메일 분석)
- 문법/맞춤법 교정

### 구현 방안
- Gmail 페이지 감지 (`mail.google.com`)
- 작성 창 DOM 관찰 (MutationObserver)
- AI 제안 팝오버 (입력 중지 후 1초)
- 톤 선택 드롭다운

### 복잡도: 중간

---

## 3-3. GitHub 코드 리뷰

### 요구사항
- PR diff 자동 분석
- 인라인 코멘트 제안 (코드 품질, 보안, 성능)
- 파일별 요약
- "Approve/Request Changes" 추천

### 구현 방안
- GitHub PR 페이지 감지 (`github.com/*/pull/*`)
- diff 텍스트 추출 (`.diff-table` 셀렉터)
- Bedrock API — 코드 리뷰어 시스템 프롬프트
- 리뷰 결과를 사이드패널에 표시

### 복잡도: 높음

---

## 3-4. PDF 뷰어 통합

### 요구사항
- PDF 내 텍스트 추출 (pdfjs-dist)
- 페이지별 AI 요약
- 하이라이트 + 노트
- PDF 기반 Q&A 대화

### 구현 방안
- `pdfjs-dist` 라이브러리 번들
- File input 또는 현재 탭 PDF URL 감지
- 텍스트 추출 → 청크 분할 (500자) → RAG 검색
- 사이드패널에 PDF 전용 탭

### 복잡도: 높음

---

## 3-5. 소셜 미디어 도우미

### 요구사항
- 트윗/링크드인 포스트 작성 도우미
- 댓글 톤 조정 (전문적/위트있는/공감)
- 해시태그 추천
- 글자 수 제한 표시

### 구현 방안
- Twitter/LinkedIn 페이지 감지
- 작성 창 옆에 미니 AI 패널 삽입
- 톤 + 해시태그 프롬프트 템플릿
- 글자 수 카운터 (280자 등)

### 복잡도: 낮음
