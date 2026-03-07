// widgets/command-palette/CommandPalette.tsx — 슬래시 명령어 자동완성

import { useEffect, useRef } from 'react'
import { commands, type Command } from './commands'

interface CommandPaletteProps {
  input: string
  visible: boolean
  onSelect: (cmd: Command) => void
}

export function CommandPalette({ input, visible, onSelect }: CommandPaletteProps) {
  const ref = useRef<HTMLDivElement>(null)

  const filtered = visible
    ? commands.filter((cmd) => {
        const q = input.toLowerCase()
        return cmd.name.startsWith(q) || cmd.aliases.some((a) => a.startsWith(q))
      })
    : []

  useEffect(() => {
    if (ref.current && filtered.length > 0) {
      ref.current.scrollTop = 0
    }
  }, [filtered.length])

  if (filtered.length === 0) return null

  return (
    <div className="command-palette" ref={ref}>
      {filtered.map((cmd) => (
        <button
          key={cmd.name}
          className="command-item"
          onMouseDown={(e) => {
            e.preventDefault()
            onSelect(cmd)
          }}
        >
          <span className="command-name">{cmd.name}</span>
          <span className="command-desc">{cmd.description}</span>
        </button>
      ))}
    </div>
  )
}
