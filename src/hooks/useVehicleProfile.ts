import { useCallback, useEffect, useMemo, useState } from "react"
import { createDefaultProfile, loadProfile, normalizeProfile, saveProfile } from "@/lib/db"
import { generateStableColor } from "@/lib/can-utils"
import type { SignalConfig, VehicleProfile } from "@/types/types"

export const useVehicleProfile = () => {
  const [profile, setProfile] = useState<VehicleProfile | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    loadProfile()
      .then((loaded) => {
        if (cancelled) {
          return
        }
        setProfile(loaded)
      })
      .catch(() => {
        if (cancelled) {
          return
        }
        setStorageError("Profile storage unavailable, changes will not persist")
        setProfile(createDefaultProfile())
      })
      .finally(() => {
        if (!cancelled) {
          setHydrated(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!profile || !hydrated) {
      return
    }

    saveProfile(profile).catch(() => {
      setStorageError("Failed to save profile")
    })
  }, [profile, hydrated])

  const updateSignalsForFrame = useCallback(
    (frameId: string, updater: (current: SignalConfig[]) => SignalConfig[]) => {
      setProfile((prev) => {
        if (!prev) {
          return prev
        }
        return {
          ...prev,
          signalsByFrameId: {
            ...prev.signalsByFrameId,
            [frameId]: updater(prev.signalsByFrameId[frameId] ?? []),
          },
        }
      })
    },
    [],
  )

  const assignFrameColor = useCallback((frameId: string) => {
    setProfile((prev) => {
      if (!prev || prev.frameColorById[frameId]) {
        return prev
      }
      return {
        ...prev,
        frameColorById: {
          ...prev.frameColorById,
          [frameId]: generateStableColor("frame", prev.nextFrameColorIndex),
        },
        nextFrameColorIndex: prev.nextFrameColorIndex + 1,
      }
    })
  }, [])

  const setFrameColor = useCallback((frameId: string, color: string) => {
    setProfile((prev) => {
      if (!prev || prev.frameColorById[frameId] === color) {
        return prev
      }
      return {
        ...prev,
        frameColorById: {
          ...prev.frameColorById,
          [frameId]: color,
        },
      }
    })
  }, [])

  const toggleHideFrame = useCallback((frameId: string) => {
    setProfile((prev) => {
      if (!prev) {
        return prev
      }
      const hidden = new Set(prev.hiddenIds)
      if (hidden.has(frameId)) {
        hidden.delete(frameId)
      } else {
        hidden.add(frameId)
      }
      return { ...prev, hiddenIds: Array.from(hidden) }
    })
  }, [])

  const hideFrames = useCallback((frameIds: string[]) => {
    setProfile((prev) => {
      if (!prev) {
        return prev
      }
      const hidden = new Set(prev.hiddenIds)
      for (const frameId of frameIds) {
        hidden.add(frameId)
      }
      return { ...prev, hiddenIds: Array.from(hidden) }
    })
  }, [])

  const hiddenIdsSet = useMemo(() => new Set(profile?.hiddenIds ?? []), [profile?.hiddenIds])

  const exportProfile = useCallback(() => {
    if (!profile) {
      return
    }

    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `can-analyzer-profile-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }, [profile])

  const importProfile = useCallback((file: File) => {
    file
      .text()
      .then((text) => JSON.parse(text) as unknown)
      .then((parsed) => {
        const normalized = normalizeProfile(parsed)
        if (!normalized) {
          setStorageError("Invalid profile file")
          return
        }
        setStorageError(null)
        setProfile(normalized)
      })
      .catch(() => {
        setStorageError("Invalid profile file")
      })
  }, [])

  return {
    profile,
    hydrated,
    storageError,
    signalsByFrameId: profile?.signalsByFrameId ?? {},
    frameColorById: profile?.frameColorById ?? {},
    hiddenIds: hiddenIdsSet,
    updateSignalsForFrame,
    assignFrameColor,
    setFrameColor,
    toggleHideFrame,
    hideFrames,
    exportProfile,
    importProfile,
  }
}
