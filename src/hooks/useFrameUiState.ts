import { useCallback, useEffect, useMemo, useState } from "react"
import { compareCanIds } from "@/lib/can-utils"
import type { CANMessage, SignalConfig } from "@/types/types"

interface FrameUiStateProfile {
  hiddenIds: Set<string>
  frameColorById: Record<string, string>
  signalsByFrameId: Record<string, SignalConfig[]>
  toggleHideFrame: (frameId: string) => void
  hideFrames: (frameIds: string[]) => void
  assignFrameColor: (frameId: string) => void
}

export const useFrameUiState = (
  messages: Map<string, CANMessage>,
  messagesVersion: number,
  profile: FrameUiStateProfile,
) => {
  const { hiddenIds, frameColorById, signalsByFrameId, toggleHideFrame, hideFrames, assignFrameColor } = profile

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showHidden, setShowHidden] = useState(false)

  useEffect(() => {
    for (const id of messages.keys()) {
      if (!frameColorById[id]) {
        assignFrameColor(id)
      }
    }
  }, [assignFrameColor, frameColorById, messages, messagesVersion])

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

    hideFrames(Array.from(selectedIds))
    setSelectedIds(new Set())
  }, [hideFrames, selectedIds])

  const toggleHideFrameSelection = useCallback(
    (id: string) => {
      const willHide = !hiddenIds.has(id)

      toggleHideFrame(id)

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
    },
    [hiddenIds, toggleHideFrame],
  )

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
      total += signalsByFrameId[id]?.length ?? 0
    }
    return total
  }, [selectedIds, signalsByFrameId])

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
    showHidden,
    selectedFrames,
    visibleCount,
    selectedSignalCount,
    toggleShowHidden,
    toggleSelect,
    hideSelectedFrames,
    toggleHideFrame: toggleHideFrameSelection,
  }
}
