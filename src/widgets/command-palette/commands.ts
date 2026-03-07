// widgets/command-palette/commands.ts — 슬래시 명령어 레지스트리

export interface Command {
  name: string
  aliases: string[]
  description: string
  buildPrompt: (args: string, pageCtx?: PageContext) => string
  /** true면 채팅에 전송하지 않는 특수 명령 */
  noSend?: boolean
  action?: string
}

export interface PageContext {
  text: string
  title: string
  url: string
}

export const commands: Command[] = [
  {
    name: '/요약',
    aliases: ['/summarize', '/sum'],
    description: '현재 페이지 또는 입력 텍스트를 요약합니다',
    buildPrompt: (args, ctx) => {
      const text = args || ctx?.text || ''
      const header = ctx?.title ? `[페이지: ${ctx.title}]\n[URL: ${ctx.url}]\n\n` : ''
      return `${header}다음 내용을 한국어로 요약해줘:\n\n${text}`
    },
  },
  {
    name: '/번역',
    aliases: ['/translate', '/tr'],
    description: '텍스트를 번역합니다 (한<->영 자동)',
    buildPrompt: (args) => {
      return `다음 텍스트를 한국어로 번역해줘 (이미 한국어면 영어로):\n\n${args}`
    },
  },
  {
    name: '/코드',
    aliases: ['/code', '/explain'],
    description: '코드를 설명합니다',
    buildPrompt: (args) => {
      return `다음 코드를 설명해줘:\n\n${args}`
    },
  },
  {
    name: '/다시쓰기',
    aliases: ['/rewrite', '/rw'],
    description: '텍스트를 더 자연스럽게 다시 씁니다',
    buildPrompt: (args) => {
      return `다음 텍스트를 더 자연스럽고 명확하게 다시 써줘:\n\n${args}`
    },
  },
  {
    name: '/새대화',
    aliases: ['/new'],
    description: '새로운 대화를 시작합니다',
    buildPrompt: () => '',
    noSend: true,
    action: 'new-session',
  },
  {
    name: '/검색',
    aliases: ['/search', '/find'],
    description: '대화 히스토리를 검색합니다',
    buildPrompt: () => '',
    noSend: true,
    action: 'search',
  },
  {
    name: '/내보내기',
    aliases: ['/export'],
    description: '현재 대화를 내보냅니다',
    buildPrompt: () => '',
    noSend: true,
    action: 'export',
  },
]

export function findCommand(input: string): { command: Command; args: string } | null {
  const trimmed = input.trim()
  if (!trimmed.startsWith('/')) return null

  for (const cmd of commands) {
    const names = [cmd.name, ...cmd.aliases]
    for (const name of names) {
      if (trimmed === name || trimmed.startsWith(name + ' ')) {
        return { command: cmd, args: trimmed.slice(name.length).trim() }
      }
    }
  }
  return null
}
