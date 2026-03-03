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
      const logicalByteIdx = Math.floor(bitPos / 8);
      const byteIdx = data.length - 1 - logicalByteIdx;
      const bitIdx = bitPos % 8;
      if (byteIdx >= 0 && byteIdx < data.length) {
        const bit = (data[byteIdx] >> bitIdx) & 1;
        rawValue |= bit << i;
      }
    }
  } else {
    // Big endian
    for (let i = 0; i < bitLength; i++) {
      const bitPos = startBit + i;
      const logicalByteIdx = Math.floor(bitPos / 8);
      const byteIdx = data.length - 1 - logicalByteIdx;
      const bitIdx = bitPos % 8;
      if (byteIdx >= 0 && byteIdx < data.length) {
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

const GOLDEN_ANGLE = 137.508;

const modulo = (value: number, base: number) => ((value % base) + base) % base;

const hashSeed = (seed: string | number) => {
  const source = String(seed);
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 31 + source.charCodeAt(i)) % 3600;
  }
  return hash / 10;
};

const hslToHex = (hue: number, saturation: number, lightness: number) => {
  const h = modulo(hue, 360);
  const s = saturation / 100;
  const l = lightness / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (h < 60) {
    r1 = c;
    g1 = x;
  } else if (h < 120) {
    r1 = x;
    g1 = c;
  } else if (h < 180) {
    g1 = c;
    b1 = x;
  } else if (h < 240) {
    g1 = x;
    b1 = c;
  } else if (h < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  const toHex = (channel: number) => Math.round((channel + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
};

export function generateStableColor(seed: string | number, offset: number = 0): string {
  const hue = modulo(hashSeed(seed) + offset * GOLDEN_ANGLE, 360);
  return hslToHex(hue, 72, 58);
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}
