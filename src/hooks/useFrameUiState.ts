import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { compareCanIds, generateStableColor } from "@/lib/can-utils"
import type { CANMessage } from "@/types/types"

export const useFrameUiState = (messages: Map<string, CANMessage>, messagesVersion: number) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [showHidden, setShowHidden] = useState(false)
  const [signalCountByFrameId, setSignalCountByFrameId] = useState<Record<string, number>>({})
  const [frameColorById, setFrameColorById] = useState<Record<string, string>>({})
  const nextFrameColorIndexRef = useRef(0)

  useEffect(() => {
    setFrameColorById((prev) => {
      let next: Record<string, string> | null = null

      for (const id of messages.keys()) {
        if (!prev[id]) {
          if (!next) {
            next = { ...prev }
          }

          next[id] = generateStableColor("frame", nextFrameColorIndexRef.current)
          nextFrameColorIndexRef.current += 1
        }
      }

      return next ?? prev
    })
  }, [messages, messagesVersion])

  const toggleShowHidden = useCallback(() => {
    setShowHidden((current) => !current)
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const hideSelectedFrames = useCallback(() => {
    if (selectedIds.size === 0) {
      return
    }

    setHiddenIds((prev) => {
      const next = new Set(prev)
      for (const id of selectedIds) {
        next.add(id)
      }
      return next
    })
    setSelectedIds(new Set())
  }, [selectedIds])

  const toggleHideFrame = useCallback((id: string) => {
    const willHide = !hiddenIds.has(id)

    setHiddenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })

    if (willHide) {
      setSelectedIds((prev) => {
        if (!prev.has(id)) {
          return prev
        }

        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [hiddenIds])

  const visibleCount = useMemo(() => {
    void messagesVersion

    if (showHidden) {
      return messages.size
    }

    let count = 0
    for (const id of messages.keys()) {
      if (!hiddenIds.has(id)) {
        count += 1
      }
    }

    return count
  }, [hiddenIds, messages, messagesVersion, showHidden])

  const selectedSignalCount = useMemo(() => {
    let total = 0
    for (const id of selectedIds) {
      total += signalCountByFrameId[id] ?? 0
    }
    return total
  }, [selectedIds, signalCountByFrameId])

  const handleSignalCountChange = useCallback((frameId: string, signalCount: number) => {
    setSignalCountByFrameId((prev) => {
      if (prev[frameId] === signalCount) {
        return prev
      }
      return {
        ...prev,
        [frameId]: signalCount,
      }
    })
  }, [])

  const handleFrameColorChange = useCallback((frameId: string, color: string) => {
    setFrameColorById((prev) => {
      if (prev[frameId] === color) {
        return prev
      }
      return {
        ...prev,
        [frameId]: color,
      }
    })
  }, [])

  const selectedFrames = useMemo(() => {
    void messagesVersion

    return Array.from(selectedIds)
      .map((id) => messages.get(id))
      .filter((frame): frame is CANMessage => Boolean(frame))
      .filter((frame) => showHidden || !hiddenIds.has(frame.id))
      .sort((a, b) => compareCanIds(a.id, b.id))
  }, [hiddenIds, messages, messagesVersion, selectedIds, showHidden])

  return {
    selectedIds,
    hiddenIds,
    showHidden,
    selectedFrames,
    visibleCount,
    selectedSignalCount,
    frameColorById,
    toggleShowHidden,
    toggleSelect,
    hideSelectedFrames,
    toggleHideFrame,
    handleSignalCountChange,
    handleFrameColorChange,
  }
}
