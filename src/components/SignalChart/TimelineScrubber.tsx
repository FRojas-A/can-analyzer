import { useCallback, useEffect, useRef, useState } from "react"
import {
  formatAxisTimestamp,
  formatDuration,
  readChartTheme,
  withAlpha,
} from "./chart-utils"

interface TimelineScrubberProps {
  captureStart: number
  captureEnd: number
  windowStart: number
  windowEnd: number
  onChangeWindow: (start: number, end: number) => void
}

type DragMode = "left" | "right" | "move" | null

const MIN_WINDOW_MS = 250
const HEIGHT = 48
const MONO_FONT = "9px ui-monospace, SFMono-Regular, Menlo, monospace"

const TimelineScrubber = ({
  captureStart,
  captureEnd,
  windowStart,
  windowEnd,
  onChangeWindow,
}: TimelineScrubberProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(0)

  const dragRef = useRef<{ mode: DragMode; grabOffset: number }>({ mode: null, grabOffset: 0 })
  const pendingRef = useRef<{ start: number; end: number } | null>(null)
  const rafRef = useRef<number | null>(null)

  const span = captureEnd - captureStart
  const minWindow = Math.min(MIN_WINDOW_MS, span)

  const scheduleChange = useCallback(
    (start: number, end: number) => {
      pendingRef.current = { start, end }
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null
          const pending = pendingRef.current
          pendingRef.current = null
          if (pending) {
            onChangeWindow(pending.start, pending.end)
          }
        })
      }
    },
    [onChangeWindow],
  )

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setWidth(entry.contentRect.width)
      }
    })
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0 || span <= 0) {
      return
    }

    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(HEIGHT * dpr)

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      return
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, HEIGHT)

    const theme = readChartTheme()
    const xFor = (ts: number) => ((ts - captureStart) / span) * width

    const winXStart = xFor(windowStart)
    const winXEnd = xFor(windowEnd)

    ctx.font = MONO_FONT
    ctx.textBaseline = "alphabetic"

    ctx.fillStyle = theme.axis
    ctx.textAlign = "left"
    ctx.fillText(formatAxisTimestamp(windowStart), 0, 9)
    ctx.textAlign = "right"
    ctx.fillText(formatAxisTimestamp(windowEnd), width, 9)
    ctx.textAlign = "center"
    ctx.fillText(formatDuration(windowEnd - windowStart), width / 2, HEIGHT - 4)

    const trackY = 18
    const trackH = 10
    ctx.fillStyle = theme.grid
    ctx.fillRect(0, trackY, width, trackH)

    ctx.fillStyle = withAlpha(theme.background, 0.55)
    if (winXStart > 0) {
      ctx.fillRect(0, trackY, winXStart, trackH)
    }
    if (winXEnd < width) {
      ctx.fillRect(winXEnd, trackY, width - winXEnd, trackH)
    }

    ctx.fillStyle = withAlpha(theme.primary, 0.18)
    ctx.fillRect(winXStart, trackY, Math.max(1, winXEnd - winXStart), trackH)

    ctx.strokeStyle = theme.primary
    ctx.lineWidth = 1
    ctx.strokeRect(winXStart + 0.5, trackY + 0.5, Math.max(0, winXEnd - winXStart - 1), trackH - 1)

    ctx.fillStyle = theme.primary
    ctx.fillRect(winXStart - 1.5, trackY - 2, 3, trackH + 4)
    ctx.fillRect(winXEnd - 1.5, trackY - 2, 3, trackH + 4)
  }, [captureStart, captureEnd, span, width, windowEnd, windowStart])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (span <= 0) {
        return
      }

      const rect = canvas.getBoundingClientRect()
      const ts = captureStart + ((event.clientX - rect.left) / rect.width) * span
      const factor = event.deltaY > 0 ? 1.25 : 0.8
      const currentWidth = windowEnd - windowStart

      const nextWidth = Math.max(minWindow, Math.min(span, currentWidth * factor))
      let nextStart = ts - (ts - windowStart) * (nextWidth / currentWidth)
      let nextEnd = nextStart + nextWidth
      if (nextStart < captureStart) {
        nextStart = captureStart
        nextEnd = nextStart + nextWidth
      }
      if (nextEnd > captureEnd) {
        nextEnd = captureEnd
        nextStart = nextEnd - nextWidth
      }

      scheduleChange(nextStart, nextEnd)
    }

    canvas.addEventListener("wheel", onWheel, { passive: false })
    return () => canvas.removeEventListener("wheel", onWheel)
  }, [captureEnd, captureStart, minWindow, scheduleChange, span, windowEnd, windowStart])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [])

  const modeForEvent = (clientX: number): { mode: DragMode; grabOffset: number } => {
    const canvas = canvasRef.current
    if (!canvas || span <= 0) {
      return { mode: null, grabOffset: 0 }
    }

    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const winXStart = ((windowStart - captureStart) / span) * rect.width
    const winXEnd = ((windowEnd - captureStart) / span) * rect.width
    const ts = captureStart + (x / rect.width) * span

    if (Math.abs(x - winXStart) <= 6) {
      return { mode: "left", grabOffset: 0 }
    }
    if (Math.abs(x - winXEnd) <= 6) {
      return { mode: "right", grabOffset: 0 }
    }
    if (x >= winXStart && x <= winXEnd) {
      return { mode: "move", grabOffset: ts - windowStart }
    }

    return { mode: "move", grabOffset: (windowEnd - windowStart) / 2 }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (span <= 0) {
      return
    }

    dragRef.current = modeForEvent(event.clientX)
    event.currentTarget.setPointerCapture(event.pointerId)

    const rect = event.currentTarget.getBoundingClientRect()
    const ts = captureStart + ((event.clientX - rect.left) / rect.width) * span

    if (dragRef.current.mode === "left") {
      scheduleChange(ts, windowEnd)
    } else if (dragRef.current.mode === "right") {
      scheduleChange(windowStart, ts)
    } else if (dragRef.current.mode === "move") {
      const widthTs = windowEnd - windowStart
      let nextStart = ts - dragRef.current.grabOffset
      nextStart = Math.max(captureStart, Math.min(nextStart, captureEnd - widthTs))
      scheduleChange(nextStart, nextStart + widthTs)
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (drag.mode === null) {
      const hover = modeForEvent(event.clientX).mode
      event.currentTarget.style.cursor =
        hover === "left" || hover === "right" ? "ew-resize" : "default"
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const ts = captureStart + ((event.clientX - rect.left) / rect.width) * span
    const currentWidth = windowEnd - windowStart

    if (drag.mode === "left") {
      const nextStart = Math.max(captureStart, Math.min(ts, windowEnd - minWindow))
      scheduleChange(nextStart, windowEnd)
    } else if (drag.mode === "right") {
      const nextEnd = Math.min(captureEnd, Math.max(ts, windowStart + minWindow))
      scheduleChange(windowStart, nextEnd)
    } else {
      const nextStart = Math.max(
        captureStart,
        Math.min(ts - drag.grabOffset, captureEnd - currentWidth),
      )
      scheduleChange(nextStart, nextStart + currentWidth)
    }
  }

  const handlePointerUp = () => {
    dragRef.current = { mode: null, grabOffset: 0 }
  }

  return (
    <div ref={wrapperRef} className="w-full shrink-0" style={{ height: HEIGHT }}>
      <canvas
        ref={canvasRef}
        style={{ width: `${width}px`, height: HEIGHT }}
        className="block touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  )
}

export default TimelineScrubber
