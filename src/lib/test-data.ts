import type { CANMessage } from "@/types/types"

type WsFrameFixture = {
  type: "frame"
  id: number
  data: string
  bytes: number
  ts: number
}

const baseTs = Date.now()

export const TEST_WS_FRAMES: WsFrameFixture[] = [
  { type: "frame", id: 0x100, data: "1020304050607080", bytes: 8, ts: baseTs },
  { type: "frame", id: 0x120, data: "A0B0C0D0E0F00112", bytes: 8, ts: baseTs + 12 },
  { type: "frame", id: 0x080, data: "FFFFFFFF00000000", bytes: 8, ts: baseTs + 24 },
]

export const TEST_BOOTSTRAP_PACKET = {
  type: "bootstrap" as const,
  frames: TEST_WS_FRAMES,
}

export const TEST_CAN_MESSAGES: CANMessage[] = [
  {
    id: "0x80",
    data: [0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00],
    prevData: [0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00],
    timestamp: baseTs + 24,
    dlc: 8,
    count: 12,
    rate: 42.3,
  },
  {
    id: "0x100",
    data: [0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80],
    prevData: [0x10, 0x10, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80],
    timestamp: baseTs,
    dlc: 8,
    count: 8,
    rate: 20.0,
  },
  {
    id: "0x120",
    data: [0xa0, 0xb0, 0xc0, 0xd0, 0xe0, 0xf0, 0x01, 0x12],
    prevData: [0xa0, 0xb0, 0xc0, 0xd0, 0x00, 0x00, 0x01, 0x12],
    timestamp: baseTs + 12,
    dlc: 8,
    count: 5,
    rate: 16.7,
  },
]

export function createTestMessageMap(): Map<string, CANMessage> {
  return new Map(TEST_CAN_MESSAGES.map((message) => [message.id, message]))
}
