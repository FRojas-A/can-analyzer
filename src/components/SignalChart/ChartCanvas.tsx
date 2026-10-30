import { useEffect, useMemo, useRef, useState } from "react"
import type { FrameCaptureBuffer } from "@/lib/capture"
import type { ChartSignal } from "@/types/types"
import {
  bucketSeries,
  extractSignalSamples,
  formatAxisTimestamp,
  readChartTheme,
  type DownsampledBucket,
} from "./chart-utils"

interface ChartCanvasProps {
  signals: ChartSignal[]
  capture: FrameCaptureBuffer
  captureVersion: number
  frameIndex: Map<string, number[]>
  rangeStart: number
  rangeEnd: number
}

interface SeriesBuckets {
  signal: ChartSignal
  buckets: DownsampledBucket[]
}

const PAD_LEFT = 48
const PAD_RIGHT = 10
const PAD_TOP = 8
const PAD_BOTTOM = 18
const MONO_FONT = "10px ui-monospace, SFMono-Regular, Menlo, monospace"

const ChartCanvas = ({
  signals,
  capture,
  captureVersion,
  frameIndex,
  rangeStart,
  rangeEnd,
}: ChartCanvasProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
      }
    })
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [])

  const series = useMemo<SeriesBuckets[]>(() => {
    void captureVersion
    const plotWidth = Math.max(1, size.w - PAD_LEFT - PAD_RIGHT)
    return signals.map((signal) => ({
      signal,
      buckets: bucketSeries(
        extractSignalSamples(capture, frameIndex, signal, rangeStart, rangeEnd),
        plotWidth,
      ),
    }))
  }, [capture, captureVersion, frameIndex, rangeStart, rangeEnd, signals, size.w])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.w === 0 || size.h === 0) {
      return
    }

    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(size.w * dpr)
    canvas.height = Math.round(size.h * dpr)

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      return
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.w, size.h)

    const theme = readChartTheme()

    if (capture.length === 0) {
      ctx.fillStyle = theme.axis
      ctx.font = "12px Inter, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("Waiting for CAN data...", size.w / 2, size.h / 2)
      return
    }

    const plotW = Math.max(1, size.w - PAD_LEFT - PAD_RIGHT)
    const plotH = Math.max(1, size.h - PAD_TOP - PAD_BOTTOM)
    const allBuckets = series.flatMap((entry) => entry.buckets)
    if (allBuckets.length === 0) {
      ctx.fillStyle = theme.axis
      ctx.font = "12px Inter, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("No samples in window", size.w / 2, size.h / 2)
      return
    }

    let min = Infinity
    let max = -Infinity
    for (const bucket of allBuckets) {
      if (bucket.min < min) {
        min = bucket.min
      }
      if (bucket.max > max) {
        max = bucket.max
      }
    }
    if (max === min) {
      max = min + 1
    }
    const pad = (max - min) * 0.08
    const yMin = min - pad
    const yMax = max + pad

    const xFor = (t: number) => PAD_LEFT + ((t - rangeStart) / (rangeEnd - rangeStart)) * plotW
    const yFor = (v: number) => PAD_TOP + (1 - (v - yMin) / (yMax - yMin)) * plotH

    ctx.font = MONO_FONT
    ctx.textAlign = "right"
    ctx.textBaseline = "middle"

    for (let row = 0; row <= 4; row++) {
      const v = yMax - ((yMax - yMin) * row) / 4
      const y = yFor(v)
      ctx.strokeStyle = theme.grid
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(PAD_LEFT, y)
      ctx.lineTo(size.w - PAD_RIGHT, y)
      ctx.stroke()

      const label = Math.abs(v) >= 1000 ? String(Math.round(v)) : v.toFixed(1)
      ctx.fillStyle = theme.axis
      ctx.fillText(label, PAD_LEFT - 6, y)
    }

    const tickCount = Math.max(2, Math.min(6, Math.floor(plotW / 150)))
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    for (let tick = 0; tick <= tickCount; tick++) {
      const t = rangeStart + ((rangeEnd - rangeStart) * tick) / tickCount
      const x = xFor(t)
      ctx.strokeStyle = theme.grid
      ctx.beginPath()
      ctx.moveTo(x, PAD_TOP)
      ctx.lineTo(x, size.h - PAD_BOTTOM)
      ctx.stroke()

      ctx.fillStyle = theme.axis
      ctx.fillText(formatAxisTimestamp(t), x, size.h - PAD_BOTTOM + 4)
    }

    ctx.lineWidth = 1.25
    for (const { signal, buckets } of series) {
      ctx.strokeStyle = signal.color
      ctx.beginPath()

      ctx.globalAlpha = 0.28
      for (const bucket of buckets) {
        const x = xFor(bucket.t)
        ctx.moveTo(x, yFor(bucket.max))
        ctx.lineTo(x, yFor(bucket.min))
      }
      ctx.stroke()

      ctx.globalAlpha = 0.95
      ctx.beginPath()
      for (let i = 0; i < buckets.length; i++) {
        const bucket = buckets[i]
        const x = xFor(bucket.t)
        const y = yFor(bucket.mid)
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }, [capture.length, rangeEnd, rangeStart, series, size])

  return (
    <div ref={wrapperRef} className="relative h-full w-full min-h-0">
      <canvas
        ref={canvasRef}
        style={{ width: `${size.w}px`, height: `${size.h}px` }}
        className="block"
      />
    </div>
  )
}

export default ChartCanvas
