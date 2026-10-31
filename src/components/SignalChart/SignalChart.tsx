import { useCallback, useMemo, useState } from "react"
import type { FrameCaptureBuffer } from "@/lib/capture"
import type { ChartSignal } from "@/types/types"
import ChartCanvas from "./ChartCanvas"
import SignalLegend from "./SignalLegend"
import TimelineScrubber from "./TimelineScrubber"
import { buildFrameIndex } from "./chart-utils"
import Button from "../ui/button"

interface SignalChartProps {
  signals: ChartSignal[]
  capture: FrameCaptureBuffer
  captureVersion: number
  onClearCapture: () => void
  onSelectSignal?: (key: string) => void
}

const LIVE_WINDOW_MS = 10_000

const SignalChart = ({ signals, capture, captureVersion, onClearCapture, onSelectSignal }: SignalChartProps) => {
  const [live, setLive] = useState(true)
  const [window, setWindow] = useState<{ start: number; end: number } | null>(null)
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set())

  const captureStart = capture.startTs
  const captureEnd = capture.endTs
  const hasData = capture.length > 0

  const effectiveWindow = useMemo(() => {
    if (!hasData) {
      return null
    }
    if (live || !window) {
      return { start: Math.max(captureStart, captureEnd - LIVE_WINDOW_MS), end: captureEnd }
    }

    const start = Math.max(captureStart, window.start)
    const end = Math.min(captureEnd, window.end)
    if (end - start < 1) {
      return { start: Math.max(captureStart, captureEnd - LIVE_WINDOW_MS), end: captureEnd }
    }
    return { start, end }
  }, [captureEnd, captureStart, hasData, live, window])

  const visibleSignals = useMemo(
    () => signals.filter((signal) => !hiddenKeys.has(signal.key)),
    [hiddenKeys, signals],
  )

  const frameIndex = useMemo(() => {
    void captureVersion
    return buildFrameIndex(capture, new Set(signals.map((signal) => signal.frameId)))
  }, [capture, captureVersion, signals])

  const handleWindowChange = useCallback((start: number, end: number) => {
    setLive(false)
    setWindow({ start, end })
  }, [])

  const handleGoLive = useCallback(() => {
    setLive(true)
    setWindow(null)
  }, [])

  const handleClear = useCallback(() => {
    onClearCapture()
    setLive(true)
    setWindow(null)
  }, [onClearCapture])

  const toggleSignal = useCallback((key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {signals.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select frames and add signals to chart them.
            </div>
          ) : (
            <div className="min-h-0 flex-1">
              <ChartCanvas
                signals={visibleSignals}
                capture={capture}
                captureVersion={captureVersion}
                frameIndex={frameIndex}
                rangeStart={effectiveWindow?.start ?? 0}
                rangeEnd={effectiveWindow?.end ?? 0}
              />
            </div>
          )}

          {hasData && effectiveWindow && (
            <div className="flex shrink-0 items-center border-t border-border">
              <div className="min-w-0 flex-1">
                <TimelineScrubber
                  captureStart={captureStart}
                  captureEnd={captureEnd}
                  windowStart={effectiveWindow.start}
                  windowEnd={effectiveWindow.end}
                  onChangeWindow={handleWindowChange}
                />
              </div>
              <div className="flex shrink-0 flex-col gap-0.5 border-l border-border px-1.5">
                <Button
                  type="button"
                  variant={live ? "secondary" : "ghost"}
                  size="sm"
                  className="h-[21px] px-2 text-[10px]"
                  onClick={handleGoLive}
                >
                  {live ? "Live" : "Go Live"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-[21px] px-2 text-[10px]"
                  onClick={handleClear}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>

        {signals.length > 0 && (
          <SignalLegend
            signals={signals}
            hiddenKeys={hiddenKeys}
            onToggleVisibility={toggleSignal}
            onSelectSignal={onSelectSignal}
          />
        )}
      </div>
    </div>
  )
}

export default SignalChart
