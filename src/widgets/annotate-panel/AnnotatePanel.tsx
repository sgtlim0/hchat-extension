// widgets/annotate-panel/AnnotatePanel.tsx — 웹 어노테이션 레이어 (사이드패널 내 캔버스)

import { useState, useCallback, useRef, useEffect } from 'react'

interface Props {
  onClose: () => void
}

type Tool = 'pen' | 'arrow' | 'text' | 'highlighter'

const COLORS = ['#EF4444', '#3478FE', '#22C55E', '#F59E0B']
const WIDTHS = [1, 2, 3, 4, 5]

interface DrawPoint {
  x: number
  y: number
}

export function AnnotatePanel({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState(COLORS[0])
  const [lineWidth, setLineWidth] = useState(2)
  const [bgImage, setBgImage] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [error, setError] = useState('')
  const [textInput, setTextInput] = useState('')
  const [textPos, setTextPos] = useState<DrawPoint | null>(null)

  const lastPointRef = useRef<DrawPoint | null>(null)
  const arrowStartRef = useRef<DrawPoint | null>(null)

  // 스크린샷 캡처 → 캔버스 배경
  const handleCapture = useCallback(async () => {
    setCapturing(true)
    setError('')
    try {
      const response: { dataUrl?: string; error?: string } =
        await chrome.runtime.sendMessage({ type: 'capture-screenshot' })
      if (response?.dataUrl) {
        setBgImage(response.dataUrl)
      } else {
        setError(response?.error ?? 'Capture failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Capture failed')
    } finally {
      setCapturing(false)
    }
  }, [])

  // 배경이미지 → 캔버스에 그리기
  useEffect(() => {
    if (!bgImage || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      // 사이드패널 너비에 맞게 스케일링
      const maxW = canvas.parentElement?.clientWidth ?? 360
      const scale = maxW / img.width
      canvas.width = maxW
      canvas.height = img.height * scale
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
    img.src = bgImage
  }, [bgImage])

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): DrawPoint => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e)

    if (tool === 'text') {
      setTextPos(point)
      return
    }

    if (tool === 'arrow') {
      arrowStartRef.current = point
      setDrawing(true)
      return
    }

    setDrawing(true)
    lastPointRef.current = point
  }, [tool])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const point = getCanvasPoint(e)

    if (tool === 'pen' || tool === 'highlighter') {
      const lastPoint = lastPointRef.current
      if (!lastPoint) { lastPointRef.current = point; return }

      ctx.beginPath()
      ctx.moveTo(lastPoint.x, lastPoint.y)
      ctx.lineTo(point.x, point.y)
      ctx.strokeStyle = color
      ctx.lineWidth = tool === 'highlighter' ? lineWidth * 6 : lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      if (tool === 'highlighter') {
        ctx.globalAlpha = 0.3
      }
      ctx.stroke()
      ctx.globalAlpha = 1
      lastPointRef.current = point
    }
  }, [drawing, tool, color, lineWidth])

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !canvasRef.current) return

    if (tool === 'arrow' && arrowStartRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        const end = getCanvasPoint(e)
        const start = arrowStartRef.current
        drawArrow(ctx, start, end, color, lineWidth)
      }
      arrowStartRef.current = null
    }

    setDrawing(false)
    lastPointRef.current = null
  }, [drawing, tool, color, lineWidth])

  // 텍스트 배치
  const handlePlaceText = useCallback(() => {
    if (!textPos || !textInput.trim() || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    ctx.font = `${Math.max(14, lineWidth * 5)}px Inter, sans-serif`
    ctx.fillStyle = color
    ctx.fillText(textInput, textPos.x, textPos.y)
    setTextPos(null)
    setTextInput('')
  }, [textPos, textInput, color, lineWidth])

  // 초기화
  const handleClear = useCallback(() => {
    if (!canvasRef.current || !bgImage) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
    img.src = bgImage
  }, [bgImage])

  // 스크린샷 다운로드
  const handleDownload = useCallback(() => {
    if (!canvasRef.current) return
    const dataUrl = canvasRef.current.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `annotated-${Date.now()}.png`
    link.href = dataUrl
    link.click()
  }, [])

  return (
    <div className="panel">
      {/* Header */}
      <div className="panel-header">
        <button className="header-btn" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="panel-icon panel-icon-blue">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/>
          </svg>
        </div>
        <span className="panel-title">Annotate</span>
      </div>

      {/* Toolbar */}
      <div className="annotate-toolbar">
        {/* Tool selection */}
        <div className="annotate-tools">
          {([
            { id: 'pen' as const, label: 'Pen', icon: '\u270F' },
            { id: 'arrow' as const, label: 'Arrow', icon: '\u2197' },
            { id: 'text' as const, label: 'Text', icon: 'T' },
            { id: 'highlighter' as const, label: 'HL', icon: '\u{1F58C}' },
          ] as const).map((t) => (
            <button
              key={t.id}
              className={`annotate-tool-btn ${tool === t.id ? 'annotate-tool-active' : ''}`}
              onClick={() => setTool(t.id)}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {/* Colors */}
        <div className="annotate-colors">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`annotate-color-btn ${color === c ? 'annotate-color-active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>

        {/* Width */}
        <div className="annotate-width">
          <select
            className="annotate-width-select"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
          >
            {WIDTHS.map((w) => (
              <option key={w} value={w}>{w}px</option>
            ))}
          </select>
        </div>
      </div>

      {/* Action buttons */}
      <div className="annotate-actions">
        <button
          className="btn-primary"
          onClick={handleCapture}
          disabled={capturing}
          style={{ flex: 1 }}
        >
          {capturing ? '...' : 'Capture'}
        </button>
        <button className="btn-ghost" onClick={handleClear} disabled={!bgImage} style={{ flex: 1 }}>
          Clear
        </button>
        <button className="btn-ghost" onClick={handleDownload} disabled={!bgImage} style={{ flex: 1 }}>
          Save
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {/* Text input overlay */}
      {textPos && (
        <div className="annotate-text-input">
          <input
            className="field-input field-input-sm"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handlePlaceText() }}
            placeholder="Type text, press Enter"
            autoFocus
          />
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <button className="btn-primary btn-xs" onClick={handlePlaceText}>Place</button>
            <button className="btn-ghost btn-xs" onClick={() => setTextPos(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="annotate-canvas-wrapper">
        {!bgImage && (
          <div className="annotate-placeholder">
            Click "Capture" to take a screenshot and start annotating
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="annotate-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setDrawing(false); lastPointRef.current = null }}
          style={{ display: bgImage ? 'block' : 'none' }}
        />
      </div>
    </div>
  )
}

/** 화살표 그리기 헬퍼 */
function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: DrawPoint,
  to: DrawPoint,
  color: string,
  width: number
) {
  const headLen = Math.max(10, width * 4)
  const angle = Math.atan2(to.y - from.y, to.x - from.x)

  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(
    to.x - headLen * Math.cos(angle - Math.PI / 6),
    to.y - headLen * Math.sin(angle - Math.PI / 6)
  )
  ctx.lineTo(
    to.x - headLen * Math.cos(angle + Math.PI / 6),
    to.y - headLen * Math.sin(angle + Math.PI / 6)
  )
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}
