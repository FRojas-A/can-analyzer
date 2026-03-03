export interface CANMessage {
  id: string; // hex ID like "0x1A3"
  data: number[]; // 8 bytes
  timestamp: number;
  prevData?: number[]; // previous data for diff
  dlc: number;
  count: number;
  rate: number; // Hz (messages per second)
}

export type Endianness = 'big' | 'little';

export interface SignalConfig {
  name: string;
  startBit: number;
  bitLength: number;
  color?: string;
  endianness: Endianness;
  scale: number;
  offset: number;
  min?: number;
  max?: number;
  unit?: string;
  transform?: string;
}

export interface SelectedMessage {
  id: string;
  signals: SignalConfig[];
  color: string;
}

export interface RecordedFrame {
  id: string;
  data: number[];
  timestamp: number;
}

export interface Recording {
  name: string;
  startTime: number;
  frames: RecordedFrame[];
  duration: number;
}

export type WsFrameEvent = {
  type: "frame"
  id: number | string
  data: string
  bytes?: number
  ts?: number
}

export type WsBootstrapEvent = {
  type: "bootstrap"
  frames: WsFrameEvent[]
}

export type PendingFrameUpdate = {
  event: WsFrameEvent
  hits: number
}

export type ConnectionStatus = "connecting" | "LIVE" | "offline" | "error"
