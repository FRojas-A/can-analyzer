import type { Endianness } from '@/types/types';

export function byteToHex(byte: number): string {
  return byte.toString(16).toUpperCase().padStart(2, '0');
}

export function byteToBinary(byte: number): string {
  return byte.toString(2).padStart(8, '0');
}

export function getChangedBytes(current: number[], previous?: number[]): boolean[] {
  if (!previous) return Array(current.length).fill(false);
  return current.map((b, i) => b !== previous[i]);
}

export function getChangedBits(current: number[], previous?: number[]): boolean[] {
  const bits: boolean[] = [];
  for (let i = 0; i < current.length; i++) {
    const prev = previous ? previous[i] : current[i];
    for (let b = 7; b >= 0; b--) {
      bits.push(((current[i] >> b) & 1) !== ((prev >> b) & 1));
    }
  }
  return bits;
}

export function extractSignalValue(
  data: number[],
  startBit: number,
  bitLength: number,
  endianness: Endianness,
  scale: number = 1,
  offset: number = 0
): number {
  let rawValue = 0;

  if (endianness === 'little') {
    for (let i = 0; i < bitLength; i++) {
      const bitPos = startBit + i;
      const byteIdx = Math.floor(bitPos / 8);
      const bitIdx = bitPos % 8;
      if (byteIdx < data.length) {
        const bit = (data[byteIdx] >> bitIdx) & 1;
        rawValue |= bit << i;
      }
    }
  } else {
    // Big endian
    for (let i = 0; i < bitLength; i++) {
      const bitPos = startBit + i;
      const byteIdx = Math.floor(bitPos / 8);
      const bitIdx = 7 - (bitPos % 8);
      if (byteIdx < data.length) {
        const bit = (data[byteIdx] >> bitIdx) & 1;
        rawValue |= bit << (bitLength - 1 - i);
      }
    }
  }

  return rawValue * scale + offset;
}

export function evaluateTransform(
  rawValue: number,
  transform: string | undefined,
  scale: number = 1,
  offset: number = 0
): number {
  if (!transform || transform.trim() === '') {
    return rawValue * scale + offset;
  }
  try {
    const fn = new Function('raw', 'return ' + transform);
    const result = fn(rawValue);
    if (typeof result === 'number' && isFinite(result)) return result;
    return rawValue * scale + offset;
  } catch {
    return rawValue * scale + offset;
  }
}

export const CHART_COLORS = [
  'hsl(185, 80%, 50%)',
  'hsl(38, 90%, 55%)',
  'hsl(280, 70%, 60%)',
  'hsl(140, 60%, 50%)',
  'hsl(350, 70%, 55%)',
  'hsl(200, 70%, 60%)',
  'hsl(60, 80%, 50%)',
  'hsl(320, 60%, 55%)',
];

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}
