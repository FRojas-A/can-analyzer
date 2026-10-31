import type { CapturedFrame } from "@/types/types"

export class FrameCaptureBuffer {
  private frames: CapturedFrame[] = []
  private offset = 0

  get length(): number {
    return this.frames.length - this.offset
  }

  get startTs(): number {
    return this.offset < this.frames.length ? this.frames[this.offset].ts : 0
  }

  get endTs(): number {
    return this.frames.length > 0 ? this.frames[this.frames.length - 1].ts : 0
  }

  append(frame: CapturedFrame): void {
    this.frames.push(frame)
  }

  trim(maxMs: number, maxFrames: number): void {
    const last = this.frames[this.frames.length - 1]
    if (!last) {
      return
    }

    const cutoff = last.ts - maxMs
    let next = this.offset
    while (next < this.frames.length && this.frames[next].ts < cutoff) {
      next += 1
    }
    if (this.frames.length - next > maxFrames) {
      next = this.frames.length - maxFrames
    }

    if (next >= this.frames.length) {
      this.frames = []
      this.offset = 0
      return
    }

    if (next > this.frames.length / 2) {
      this.frames.splice(0, next)
      this.offset = 0
    } else {
      this.offset = next
    }
  }

  clear(): void {
    this.frames = []
    this.offset = 0
  }

  at(index: number): CapturedFrame {
    return this.frames[this.offset + index]
  }

  lowerBoundTs(ts: number): number {
    let lo = 0
    let hi = this.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (this.at(mid).ts < ts) {
        lo = mid + 1
      } else {
        hi = mid
      }
    }
    return lo
  }
}
