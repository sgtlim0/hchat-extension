// content/fab.ts  –  FAB + 컨텍스트 메뉴 (Content Script)

const MENU_ITEMS = [
  { icon: 'message-square', label: 'H Chat에 질문', action: 'ask' },
  { icon: 'file-text', label: '선택 텍스트 요약', action: 'summarize' },
  { icon: 'languages', label: '번역', action: 'translate' },
  { divider: true },
  { icon: 'pencil', label: '다시 쓰기', action: 'rewrite' },
  { icon: 'code', label: '코드 설명', action: 'explain-code' },
] as const

function svgIcon(name: string, color: string): string {
  const paths: Record<string, string> = {
    'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    'languages': '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
    'pencil': '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
    'code': '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name] ?? ''}</svg>`
}

function injectStyles(): void {
  const style = document.createElement('style')
  style.textContent = `
    #hchat-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #3478FE;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 2147483647;
      transition: transform 0.2s, box-shadow 0.2s;
      font-family: 'Inter', -apple-system, sans-serif;
      font-weight: 700;
      font-size: 18px;
      color: #FFF;
      line-height: 1;
    }
    #hchat-fab:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(52,120,254,0.4); }
    #hchat-fab.active { background: #2563EB; }

    #hchat-menu {
      position: fixed;
      z-index: 2147483647;
      background: #FFF;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      padding: 6px 0;
      width: 200px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      font-family: 'Inter', -apple-system, sans-serif;
      display: none;
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.15s, transform 0.15s;
    }
    #hchat-menu.show { display: block; opacity: 1; transform: translateY(0); }
    #hchat-menu.dark { background: #1E1E1E; border-color: #374151; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }

    .hchat-item {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; cursor: pointer; font-size: 12px;
      color: #1A1A1A; background: transparent; border: none;
      width: 100%; text-align: left; font-family: inherit;
      transition: background 0.1s;
    }
    #hchat-menu.dark .hchat-item { color: #F0F0F0; }
    .hchat-item:hover { background: #EEF2F6; }
    #hchat-menu.dark .hchat-item:hover { background: #333; }

    .hchat-divider { height: 1px; background: #E5E7EB; margin: 4px 0; }
    #hchat-menu.dark .hchat-divider { background: #374151; }

    .hchat-icon { display: flex; align-items: center; flex-shrink: 0; }

    #hchat-tooltip {
      position: fixed;
      z-index: 2147483646;
      background: #3478FE;
      color: #FFF;
      border-radius: 6px;
      padding: 5px 10px;
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 11px; font-weight: 500;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      display: none;
      white-space: nowrap;
      user-select: none;
    }
    #hchat-tooltip:hover { background: #2563EB; }
  `
  document.head.appendChild(style)
}

function getSelection(): string {
  return window.getSelection()?.toString().trim() ?? ''
}

function getPageText(): string {
  const el = document.querySelector('article') ?? document.querySelector('main') ?? document.body
  return el.innerText.replace(/\n{3,}/g, '\n\n').trim().slice(0, 8000)
}

function buildPrompt(action: string, text: string): string {
  // 선택 텍스트가 없으면 페이지 전체 텍스트 사용
  const content = text || getPageText()
  const pageInfo = `[페이지: ${document.title}]\n[URL: ${location.href}]\n\n`

  const templates: Record<string, string> = {
    ask: content,
    summarize: `${pageInfo}다음 웹페이지 내용을 한국어로 요약해줘:\n\n${content}`,
    translate: `다음 텍스트를 한국어로 번역해줘 (이미 한국어면 영어로):\n\n${content}`,
    rewrite: `다음 텍스트를 더 자연스럽게 다시 써줘:\n\n${content}`,
    'explain-code': `다음 코드를 설명해줘:\n\n${content}`,
  }
  return templates[action] ?? content
}

function sendToSidePanel(action: string, text: string): void {
  const prompt = buildPrompt(action, text)

  // storage에 pending prompt 저장 → 사이드패널이 읽어감
  chrome.storage.local.set({
    'hchat:fab-pending': {
      action,
      text: prompt,
      pageUrl: location.href,
      pageTitle: document.title,
      ts: Date.now(),
    },
  })

  // background에 사이드패널 열기 요청
  chrome.runtime.sendMessage({ type: 'open-sidepanel' })
}

function init(): void {
  if (document.getElementById('hchat-fab')) return
  injectStyles()

  // --- FAB ---
  const fab = document.createElement('button')
  fab.id = 'hchat-fab'
  fab.textContent = 'H'
  fab.title = 'H Chat'
  document.body.appendChild(fab)

  // --- Context Menu ---
  const menu = document.createElement('div')
  menu.id = 'hchat-menu'

  for (const item of MENU_ITEMS) {
    if ('divider' in item) {
      const d = document.createElement('div')
      d.className = 'hchat-divider'
      menu.appendChild(d)
      continue
    }
    const btn = document.createElement('button')
    btn.className = 'hchat-item'
    btn.dataset.action = item.action
    const color = item.action === 'ask' ? '#3478FE' : '#6B7280'
    btn.innerHTML = `<span class="hchat-icon">${svgIcon(item.icon, color)}</span><span>${item.label}</span>`
    menu.appendChild(btn)
  }
  document.body.appendChild(menu)

  // --- Selection Tooltip ---
  const tooltip = document.createElement('div')
  tooltip.id = 'hchat-tooltip'
  tooltip.innerHTML = `<span class="hchat-icon" style="display:inline-flex;margin-right:4px">${svgIcon('message-square', '#FFF')}</span>H Chat에 질문`
  document.body.appendChild(tooltip)

  // --- State ---
  let menuOpen = false

  function showMenu(x: number, y: number): void {
    const isDark = document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
    menu.classList.toggle('dark', isDark)

    // 위치 계산 (화면 밖 방지)
    const mw = 200
    const mh = 230
    let mx = x
    let my = y
    if (mx + mw > window.innerWidth - 8) mx = window.innerWidth - mw - 8
    if (my + mh > window.innerHeight - 8) my = window.innerHeight - mh - 8
    if (mx < 8) mx = 8
    if (my < 8) my = 8

    menu.style.left = `${mx}px`
    menu.style.top = `${my}px`

    // display: block 먼저, 다음 프레임에 show 추가 (transition 트리거)
    menu.style.display = 'block'
    requestAnimationFrame(() => menu.classList.add('show'))
    fab.classList.add('active')
    menuOpen = true
  }

  function hideMenu(): void {
    menu.classList.remove('show')
    // transition 끝난 후 display none
    setTimeout(() => { menu.style.display = 'none' }, 150)
    fab.classList.remove('active')
    menuOpen = false
  }

  // FAB 클릭
  fab.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (menuOpen) {
      hideMenu()
      return
    }

    // FAB 좌상단에 메뉴 표시
    const rect = fab.getBoundingClientRect()
    showMenu(rect.right - 200, rect.top - 240)
  })

  // 메뉴 항목 클릭
  menu.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.hchat-item') as HTMLElement | null
    if (!btn?.dataset.action) return

    e.preventDefault()
    e.stopPropagation()

    const action = btn.dataset.action
    const selected = getSelection()

    // 선택 텍스트가 없어도 페이지 텍스트로 동작 (buildPrompt에서 getPageText 사용)
    sendToSidePanel(action, selected)
    hideMenu()
  })

  // 텍스트 선택 → 툴팁 표시
  let tooltipTimer: ReturnType<typeof setTimeout> | null = null

  document.addEventListener('mouseup', (e) => {
    // FAB/메뉴/툴팁 내부 클릭은 무시
    if (fab.contains(e.target as Node) || menu.contains(e.target as Node) || tooltip.contains(e.target as Node)) return

    if (tooltipTimer) clearTimeout(tooltipTimer)

    tooltipTimer = setTimeout(() => {
      const text = getSelection()
      if (text.length < 3) {
        tooltip.style.display = 'none'
        return
      }

      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return

      const rect = sel.getRangeAt(0).getBoundingClientRect()
      // 선택 영역 위에 표시
      let tx = rect.left + rect.width / 2 - 60
      let ty = rect.top - 36

      // 화면 상단 벗어나면 아래에 표시
      if (ty < 4) ty = rect.bottom + 4
      if (tx < 4) tx = 4
      if (tx + 120 > window.innerWidth) tx = window.innerWidth - 124

      tooltip.style.left = `${tx}px`
      tooltip.style.top = `${ty}px`
      tooltip.style.display = 'block'
    }, 400)
  })

  // 툴팁 클릭 → H Chat에 질문
  tooltip.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    const text = getSelection()
    if (text) sendToSidePanel('ask', text)
    tooltip.style.display = 'none'
  })

  // 바깥 클릭 → 닫기
  document.addEventListener('mousedown', (e) => {
    const target = e.target as Node
    if (menuOpen && !menu.contains(target) && target !== fab) {
      hideMenu()
    }
  })

  // ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideMenu()
      tooltip.style.display = 'none'
    }
  })

  // 스크롤 → 툴팁 숨기기
  window.addEventListener('scroll', () => { tooltip.style.display = 'none' }, true)
}

// 페이지 로드 후 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
