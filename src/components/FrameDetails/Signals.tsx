import { toNumber } from "@/lib/utils"
import { evaluateTransform, extractSignalValue } from "@/lib/can-utils"
import type { Endianness, SignalConfig } from "@/types/types"
import { X } from "lucide-react"
import Button from "../ui/button"

interface SignalsProps {
    frameColor: string
    data: number[]
    signals: SignalConfig[]
    onUpdateSignal: (signalIndex: number, nextSignal: SignalConfig) => void
    onRemoveSignal: (signalIndex: number) => void
}


const Signals = ({ frameColor, data, signals, onUpdateSignal, onRemoveSignal }: SignalsProps) => {
    if (signals.length === 0) {
        return <div className="w-full rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">No signals yet. Select bits and click Add Signal.</div>
    }

    const maxBit = data.length * 8 - 1

    return (
        <div className="w-full space-y-3">
            {signals.map((signal, index) => {
                const safeStartBit = Math.min(Math.max(0, signal.startBit), Math.max(0, maxBit))
                const safeLength = Math.max(1, signal.bitLength)
                const rawValue = extractSignalValue(
                    data,
                    safeStartBit,
                    safeLength,
                    signal.endianness,
                    1,
                    0
                )
                const value = evaluateTransform(rawValue, signal.transform, signal.scale, signal.offset)

                return (
                    <div key={`${signal.name}-${index}`} className="w-full rounded-lg border border-border bg-card/50 p-3 space-y-2">
                        <div className="flex items-center gap-2">
                            <span
                                className="h-2.5 w-2.5 rounded-full border border-border"
                                style={{ backgroundColor: frameColor }}
                                aria-hidden
                            />
                            <input
                                type="text"
                                value={signal.name}
                                onChange={(e) => onUpdateSignal(index, { ...signal, name: e.target.value })}
                                className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
                                placeholder={`Signal_${index + 1}`}
                            />
                            <span className="font-semibold text-sm min-w-16 text-right" style={{ color: frameColor }}>{value.toFixed(2)}</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => onRemoveSignal(index)}
                            >
                                <X size={14} />
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                                <span>Start Bit</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={Math.max(0, maxBit)}
                                    value={signal.startBit}
                                    onChange={(e) => onUpdateSignal(index, { ...signal, startBit: toNumber(e.target.value, signal.startBit) })}
                                    className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                                />
                            </label>

                            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                                <span>Length</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={Math.max(1, data.length * 8)}
                                    value={signal.bitLength}
                                    onChange={(e) => onUpdateSignal(index, { ...signal, bitLength: toNumber(e.target.value, signal.bitLength) })}
                                    className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                                />
                            </label>

                            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                                <span>Scale</span>
                                <input
                                    type="number"
                                    step="any"
                                    value={signal.scale}
                                    onChange={(e) => onUpdateSignal(index, { ...signal, scale: toNumber(e.target.value, signal.scale) })}
                                    className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                                />
                            </label>

                            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                                <span>Offset</span>
                                <input
                                    type="number"
                                    step="any"
                                    value={signal.offset}
                                    onChange={(e) => onUpdateSignal(index, { ...signal, offset: toNumber(e.target.value, signal.offset) })}
                                    className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                                />
                            </label>

                            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                                <span>Endianness</span>
                                <select
                                    value={signal.endianness}
                                    onChange={(e) => onUpdateSignal(index, { ...signal, endianness: e.target.value as Endianness })}
                                    className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                                >
                                    <option value="big">Big</option>
                                    <option value="little">Little</option>
                                </select>
                            </label>
                        </div>

                        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                            <span>Transform (JS expression with `raw`)</span>
                            <input
                                type="text"
                                value={signal.transform ?? ""}
                                onChange={(e) => onUpdateSignal(index, { ...signal, transform: e.target.value })}
                                className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                                placeholder="e.g. (raw * 0.1) - 40"
                            />
                            <span className="text-[11px] text-muted-foreground/90">Start bit indexing is right-to-left in the byte expander. Decoded raw uses selected endianness first. If transform is empty/invalid, value = raw * scale + offset.</span>
                        </label>
                    </div>
                )
            })}
        </div>
    )
}

export default Signals
