import { openDB, type IDBPDatabase } from "idb"
import type { SignalConfig, VehicleProfile } from "@/types/types"

const DB_NAME = "can-analyzer"
const DB_VERSION = 1
export const DEFAULT_PROFILE_ID = "default"

interface CanAnalyzerDB {
  vehicles: {
    key: string
    value: VehicleProfile
  }
}

let dbPromise: Promise<IDBPDatabase<CanAnalyzerDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<CanAnalyzerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("vehicles", { keyPath: "id" })
      },
    })
  }
  return dbPromise
}

export function createDefaultProfile(): VehicleProfile {
  return {
    id: DEFAULT_PROFILE_ID,
    name: "My Vehicle",
    signalsByFrameId: {},
    frameColorById: {},
    hiddenIds: [],
    nextFrameColorIndex: 0,
    updatedAt: Date.now(),
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isSignalConfig = (value: unknown): value is SignalConfig => {
  if (!isRecord(value)) {
    return false
  }
  return (
    typeof value.name === "string" &&
    typeof value.startBit === "number" &&
    typeof value.bitLength === "number" &&
    (value.endianness === "big" || value.endianness === "little") &&
    typeof value.scale === "number" &&
    typeof value.offset === "number"
  )
}

export function normalizeProfile(input: unknown): VehicleProfile | null {
  if (!isRecord(input)) {
    return null
  }

  const signalsByFrameId: Record<string, SignalConfig[]> = {}
  if (isRecord(input.signalsByFrameId)) {
    for (const [frameId, signals] of Object.entries(input.signalsByFrameId)) {
      if (Array.isArray(signals) && signals.every(isSignalConfig)) {
        signalsByFrameId[frameId] = signals.map((signal) => ({
          ...signal,
          id: typeof signal.id === "string" && signal.id !== "" ? signal.id : crypto.randomUUID(),
        }))
      }
    }
  }

  const frameColorById: Record<string, string> = {}
  if (isRecord(input.frameColorById)) {
    for (const [frameId, color] of Object.entries(input.frameColorById)) {
      if (typeof color === "string") {
        frameColorById[frameId] = color
      }
    }
  }

  const hiddenIds = Array.isArray(input.hiddenIds)
    ? input.hiddenIds.filter((id): id is string => typeof id === "string")
    : []

  return {
    id: typeof input.id === "string" ? input.id : DEFAULT_PROFILE_ID,
    name: typeof input.name === "string" && input.name.trim() !== "" ? input.name : "My Vehicle",
    signalsByFrameId,
    frameColorById,
    hiddenIds,
    nextFrameColorIndex:
      typeof input.nextFrameColorIndex === "number" && Number.isFinite(input.nextFrameColorIndex)
        ? input.nextFrameColorIndex
        : Object.keys(frameColorById).length,
    updatedAt: Date.now(),
  }
}

export async function loadProfile(id: string = DEFAULT_PROFILE_ID): Promise<VehicleProfile> {
  const db = await getDb()
  const existing = await db.get("vehicles", id)
  if (existing) {
    return normalizeProfile(existing) ?? createDefaultProfile()
  }

  const profile = { ...createDefaultProfile(), id }
  await db.put("vehicles", profile)
  return profile
}

export async function saveProfile(profile: VehicleProfile): Promise<void> {
  const db = await getDb()
  await db.put("vehicles", { ...profile, updatedAt: Date.now() })
}
