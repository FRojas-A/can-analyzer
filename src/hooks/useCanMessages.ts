import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { TEST_CAN_MESSAGES } from "@/lib/test-data"
import type {
  CANMessage,
  ConnectionStatus,
  WsBootstrapEvent,
  WsFrameBatchEvent,
  WsFrameEvent,
  WsSnapshotEvent,
} from "@/types/types"

const DEFAULT_WS_URL = "ws://localhost:8080"
const TEST_MODE_FLAGS = new Set(["1", "true", "yes", "on"])

type UseCanMessagesOptions = {
  wsUrl?: string
  useTestData?: boolean
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

  const byteCount = clean.length / 2
  const bytes = new Array<number>(byteCount)
  for (let i = 0, byteIndex = 0; i < clean.length; i += 2, byteIndex += 1) {
    bytes[byteIndex] = Number.parseInt(clean.slice(i, i + 2), 16)
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

  const dlc = typeof event.bytes === "number" && event.bytes > 0 ? event.bytes : data.length
  const nextRate = Number(rate.toFixed(2))

  if (previous) {
    previous.prevData = previous.data
    previous.data = data
    previous.timestamp = ts
    previous.dlc = dlc
    previous.count = count
    previous.rate = nextRate
    return
  }

  map.set(id, {
    id,
    data,
    timestamp: ts,
    dlc,
    count,
    rate: nextRate,
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
  const messagesRef = useRef<Map<string, CANMessage>>(new Map())
  const [messages, setMessages] = useState<Map<string, CANMessage>>(new Map())
  const [messagesVersion, bumpMessagesVersion] = useReducer((version: number) => version + 1, 0)
  const [liveConnectionStatus, setLiveConnectionStatus] = useState<ConnectionStatus>("CONNECTING")
  const [liveConnectionError, setLiveConnectionError] = useState<string | null>(null)
  const dirtyRef = useRef(false)
  const rafIdRef = useRef<number | null>(null)

  const useTestData = options.useTestData ?? resolveTestMode(import.meta.env.VITE_USE_TEST_DATA)
  const wsUrl = options.wsUrl ?? import.meta.env.VITE_WS_URL ?? DEFAULT_WS_URL
  const connectionStatus: ConnectionStatus = useTestData ? "TESTING" : liveConnectionStatus
  const connectionError = useTestData ? null : liveConnectionError

  const scheduleUiFlush = useCallback(() => {
    if (rafIdRef.current !== null) {
      return
    }

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null
      if (!dirtyRef.current) {
        return
      }

      dirtyRef.current = false
      setMessages(messagesRef.current)
      bumpMessagesVersion()
    })
  }, [])

  const markDirty = useCallback(() => {
    dirtyRef.current = true
    scheduleUiFlush()
  }, [scheduleUiFlush])

  const replaceMessages = useCallback(
    (next: Map<string, CANMessage>) => {
      const messages = messagesRef.current
      messages.clear()
      for (const [id, message] of next.entries()) {
        messages.set(id, message)
      }
      markDirty()
    },
    [markDirty],
  )

  const applyFrames = useCallback((frames: WsFrameEvent[], hits = 1) => {
    if (!frames.length) {
      return
    }

    const messages = messagesRef.current
    for (const frame of frames) {
      applyFrameEvent(messages, frame, frame.hits ?? hits)
    }
    markDirty()
  }, [markDirty])

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (useTestData) {
      replaceMessages(createSeededMessages())
      return
    }

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      setLiveConnectionStatus("LIVE")
      setLiveConnectionError(null)
    }

    ws.onerror = () => {
      setLiveConnectionStatus("ERROR")
      setLiveConnectionError("Unable to reach websocket server")
    }

    ws.onclose = () => {
      setLiveConnectionStatus("OFFLINE")
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
        applyFrames([parsed as WsFrameEvent])
        return
      }

      if (packet.type === "frameBatch") {
        const batch = parsed as WsFrameBatchEvent
        if (Array.isArray(batch.frames)) {
          applyFrames(batch.frames)
        }
        return
      }

      if (packet.type === "bootstrap") {
        const bootstrap = parsed as WsBootstrapEvent
        if (!Array.isArray(bootstrap.frames)) {
          return
        }

        applyFrames(
          bootstrap.frames.filter((frameEvent): frameEvent is WsFrameEvent => frameEvent?.type === "frame"),
        )
        return
      }

      if (packet.type === "snapshot") {
        const snapshot = parsed as WsSnapshotEvent
        if (Array.isArray(snapshot.frames)) {
          const seeded = new Map<string, CANMessage>()
          for (const frame of snapshot.frames) {
            applyFrameEvent(seeded, frame)
          }
          replaceMessages(seeded)
        }
      }
    }

    return () => {
      ws.close()
    }
  }, [applyFrames, replaceMessages, useTestData, wsUrl])

  return {
    messages,
    messagesVersion,
    connectionStatus,
    connectionError,
  }
}
