import { evaluateTransform, extractSignalValue, formatTimestamp } from "@/lib/can-utils"
import type { FrameCaptureBuffer } from "@/lib/capture"
import type { ChartSignal } from "@/types/types"

export interface SamplePoint {
  t: number
  v: number
}

export interface DownsampledBucket {
  t: number
  min: number
  max: number
  mid: number
}

export interface ChartTheme {
  grid: string
  axis: string
  background: string
  foreground: string
  primary: string
}

export const readChartTheme = (): ChartTheme => {
  const styles = getComputedStyle(document.documentElement)
  const hsl = (name: string, fallback: string) => {
    const value = styles.getPropertyValue(name).trim()
    return value ? `hsl(${value})` : fallback
  }

  return {
    grid: hsl("--border", "hsl(220 15% 18%)"),
    axis: hsl("--muted-foreground", "hsl(215 15% 50%)"),
    background: hsl("--background", "hsl(220 20% 7%)"),
    foreground: hsl("--foreground", "hsl(210 20% 90%)"),
    primary: hsl("--primary", "hsl(185 80% 50%)"),
  }
}

export const withAlpha = (hslColor: string, alpha: number): string =>
  hslColor.replace(")", ` / ${alpha})`)

export const buildFrameIndex = (
  capture: FrameCaptureBuffer,
  frameIds: Set<string>,
): Map<string, number[]> => {
  const index = new Map<string, number[]>()
  if (frameIds.size === 0) {
    return index
  }

  for (let i = 0; i < capture.length; i++) {
    const frame = capture.at(i)
    if (frameIds.has(frame.id)) {
      let list = index.get(frame.id)
      if (!list) {
        list = []
        index.set(frame.id, list)
      }
      list.push(i)
    }
  }

  return index
}

const lowerBound = (indices: number[], target: number): number => {
  let lo = 0
  let hi = indices.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (indices[mid] < target) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }
  return lo
}

export const extractSignalSamples = (
  capture: FrameCaptureBuffer,
  index: Map<string, number[]>,
  signal: ChartSignal,
  rangeStart: number,
  rangeEnd: number,
): SamplePoint[] => {
  const indices = index.get(signal.frameId)
  if (!indices) {
    return []
  }

  const startLogical = capture.lowerBoundTs(rangeStart)
  const start = lowerBound(indices, startLogical)
  const samples: SamplePoint[] = []

  for (let i = start; i < indices.length; i++) {
    const frame = capture.at(indices[i])
    if (frame.ts > rangeEnd) {
      break
    }

    const raw = extractSignalValue(frame.data, signal.startBit, signal.bitLength, signal.endianness)
    samples.push({
      t: frame.ts,
      v: evaluateTransform(raw, signal.transform, signal.scale, signal.offset),
    })
  }

  return samples
}

export const bucketSeries = (samples: SamplePoint[], pixelCount: number): DownsampledBucket[] => {
  if (samples.length <= pixelCount * 2) {
    return samples.map((sample) => ({ t: sample.t, min: sample.v, max: sample.v, mid: sample.v }))
  }

  const size = Math.ceil(samples.length / pixelCount)
  const buckets: DownsampledBucket[] = []

  for (let start = 0; start < samples.length; start += size) {
    const end = Math.min(samples.length, start + size)
    let min = Infinity
    let max = -Infinity
    let sum = 0
    let t = samples[start].t

    for (let i = start; i < end; i++) {
      const v = samples[i].v
      if (v < min) {
        min = v
      }
      if (v > max) {
        max = v
      }
      sum += v
      t = samples[i].t
    }

    buckets.push({ t, min, max, mid: sum / (end - start) })
  }

  return buckets
}

export const formatDuration = (ms: number): string => {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "0s"
  }

  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const millis = Math.floor(ms % 1000)

  const mm = String(minutes).padStart(2, "0")
  const ss = String(seconds).padStart(2, "0")
  const mmm = String(millis).padStart(3, "0")

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}.${mmm}`
}

export const formatAxisTimestamp = (ts: number): string => formatTimestamp(ts)
