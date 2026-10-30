import { useCallback, useEffect, useMemo, useState } from "react"
import { compareCanIds } from "@/lib/can-utils"
import type { CANMessage, SignalConfig } from "@/types/types"

export type SelectionActionMode = "hide" | "show"

interface FrameUiStateProfile {
  hiddenIds: Set<string>
  frameColorById: Record<string, string>
  signalsByFrameId: Record<string, SignalConfig[]>
  toggleHideFrame: (frameId: string) => void
  hideFrames: (frameIds: string[]) => void
  unhideFrames: (frameIds: string[]) => void
  assignFrameColor: (frameId: string) => void
}

export const useFrameUiState = (
  messages: Map<string, CANMessage>,
  messagesVersion: number,
  profile: FrameUiStateProfile,
) => {
  const { hiddenIds, frameColorById, signalsByFrameId, toggleHideFrame, hideFrames, unhideFrames, assignFrameColor } = profile

  const [selectedIds, setSelectedIds] = useState<string[]>([])
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
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((current) => current !== id) : [...prev, id],
    )
  }, [])

  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const selectionMode: SelectionActionMode = useMemo(() => {
    const anchor = selectedIds[0]
    if (!anchor) {
      return "hide"
    }
    return hiddenIds.has(anchor) ? "show" : "hide"
  }, [hiddenIds, selectedIds])

  const toggleSelectedVisibility = useCallback(() => {
    if (selectedIds.length === 0) {
      return
    }

    const anchor = selectedIds[0]
    if (hiddenIds.has(anchor)) {
      unhideFrames(selectedIds)
    } else {
      hideFrames(selectedIds)
    }
    setSelectedIds([])
  }, [hideFrames, hiddenIds, selectedIds, unhideFrames])

  const toggleHideFrameSelection = useCallback(
    (id: string) => {
      const willHide = !hiddenIds.has(id)

      toggleHideFrame(id)

      if (willHide) {
        setSelectedIds((prev) => prev.filter((current) => current !== id))
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

  const signalCount = useMemo(() => {
    let total = 0
    for (const signals of Object.values(signalsByFrameId)) {
      total += signals.length
    }
    return total
  }, [signalsByFrameId])

  const selectedFrames = useMemo(() => {
    void messagesVersion

    return selectedIds
      .map((id) => messages.get(id))
      .filter((frame): frame is CANMessage => Boolean(frame))
      .filter((frame) => showHidden || !hiddenIds.has(frame.id))
      .sort((a, b) => compareCanIds(a.id, b.id))
  }, [hiddenIds, messages, messagesVersion, selectedIds, showHidden])

  return {
    selectedIds,
    selectedIdsSet,
    selectionMode,
    showHidden,
    selectedFrames,
    visibleCount,
    signalCount,
    toggleShowHidden,
    toggleSelect,
    toggleSelectedVisibility,
    toggleHideFrame: toggleHideFrameSelection,
  }
}
