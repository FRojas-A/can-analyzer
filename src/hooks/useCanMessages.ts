import { useCallback, useEffect, useRef, useState } from "react"
import { TEST_CAN_MESSAGES } from "@/lib/test-data"
import type {
  CANMessage,
  ConnectionStatus,
  PendingFrameUpdate,
  WsBootstrapEvent,
  WsFrameEvent,
} from "@/types/types"

const DEFAULT_WS_URL = "ws://localhost:8080"
const DEFAULT_FRAME_FLUSH_INTERVAL_MS = 80
const TEST_MODE_FLAGS = new Set(["1", "true", "yes", "on"])

type UseCanMessagesOptions = {
  wsUrl?: string
  useTestData?: boolean
  frameFlushIntervalMs?: number
}

const toCanId = (value: number | string): string => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `0x${value.toString(16).toUpperCase()}`
  }

  const parsed = Number(value)
  if (Number.isFinite(parsed)) {
    return `0x${parsed.toString(16).toUpperCase()}`
  }

  return String(value)
}

const hexToBytes = (data: string): number[] => {
  if (typeof data !== "string") {
    return []
  }

  const clean = data.trim().toLowerCase()
  if (clean.length === 0 || clean.length % 2 !== 0 || !/^[0-9a-f]+$/.test(clean)) {
    return []
  }

  const bytes: number[] = []
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(Number.parseInt(clean.slice(i, i + 2), 16))
  }
  return bytes
}

const applyFrameEvent = (map: Map<string, CANMessage>, event: WsFrameEvent, increment = 1) => {
  const id = toCanId(event.id)
  const data = hexToBytes(event.data)
  const ts = Number(event.ts) || Date.now()

  const previous = map.get(id)
  const count = previous ? previous.count + increment : increment

  let rate = 0
  if (previous) {
    const deltaMs = Math.max(1, ts - previous.timestamp)
    const instantRate = (increment * 1000) / deltaMs
    rate = previous.rate > 0 ? previous.rate * 0.7 + instantRate * 0.3 : instantRate
  }

  map.set(id, {
    id,
    data,
    prevData: previous?.data,
    timestamp: ts,
    dlc: typeof event.bytes === "number" && event.bytes > 0 ? event.bytes : data.length,
    count,
    rate: Number(rate.toFixed(2)),
  })
}

const createSeededMessages = () => {
  const seeded = new Map<string, CANMessage>()
  for (const message of TEST_CAN_MESSAGES) {
    seeded.set(message.id, {
      ...message,
      data: [...message.data],
      prevData: message.prevData ? [...message.prevData] : undefined,
    })
  }
  return seeded
}

const resolveTestMode = (value: unknown) => TEST_MODE_FLAGS.has(String(value ?? "").toLowerCase())

export const useCanMessages = (options: UseCanMessagesOptions = {}) => {
  const [messages, setMessages] = useState<Map<string, CANMessage>>(new Map())
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("CONNECTING")
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const pendingFramesRef = useRef<Map<string, PendingFrameUpdate>>(new Map())

  const useTestData = options.useTestData ?? resolveTestMode(import.meta.env.VITE_USE_TEST_DATA)
  const wsUrl = options.wsUrl ?? import.meta.env.VITE_WS_URL ?? DEFAULT_WS_URL
  const frameFlushIntervalMs = options.frameFlushIntervalMs ?? DEFAULT_FRAME_FLUSH_INTERVAL_MS

  const enqueueFrameEvent = useCallback((event: WsFrameEvent) => {
    const key = toCanId(event.id)
    const pending = pendingFramesRef.current.get(key)

    if (pending) {
      pending.event = event
      pending.hits += 1
      return
    }

    pendingFramesRef.current.set(key, { event, hits: 1 })
  }, [])

  const flushPendingFrames = useCallback(() => {
    if (pendingFramesRef.current.size === 0) {
      return
    }

    setMessages((prev) => {
      if (pendingFramesRef.current.size === 0) {
        return prev
      }

      const next = new Map(prev)
      for (const pending of pendingFramesRef.current.values()) {
        applyFrameEvent(next, pending.event, pending.hits)
      }

      pendingFramesRef.current.clear()
      return next
    })
  }, [])

  useEffect(() => {
    if (useTestData) {
      setMessages(createSeededMessages())
      setConnectionStatus("TESTING")
      setConnectionError(null)
      return
    }

    const ws = new WebSocket(wsUrl)
    const flushTimer = window.setInterval(flushPendingFrames, frameFlushIntervalMs)

    setConnectionStatus("CONNECTING")
    setConnectionError(null)

    ws.onopen = () => {
      setConnectionStatus("LIVE")
      setConnectionError(null)
    }

    ws.onerror = () => {
      setConnectionStatus("ERROR")
      setConnectionError("Unable to reach websocket server")
    }

    ws.onclose = () => {
      setConnectionStatus("OFFLINE")
    }

    ws.onmessage = (messageEvent) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(messageEvent.data)
      } catch {
        return
      }

      if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
        return
      }

      const packet = parsed as { type: string }
      if (packet.type === "frame") {
        enqueueFrameEvent(parsed as WsFrameEvent)
        return
      }

      if (packet.type === "bootstrap") {
        const bootstrap = parsed as WsBootstrapEvent
        if (!Array.isArray(bootstrap.frames)) {
          return
        }

        for (const frameEvent of bootstrap.frames) {
          if (frameEvent?.type === "frame") {
            enqueueFrameEvent(frameEvent)
          }
        }

        flushPendingFrames()
      }
    }

    return () => {
      window.clearInterval(flushTimer)
      flushPendingFrames()
      ws.close()
    }
  }, [enqueueFrameEvent, flushPendingFrames, frameFlushIntervalMs, useTestData, wsUrl])

  return {
    messages,
    connectionStatus,
    connectionError,
  }
}
