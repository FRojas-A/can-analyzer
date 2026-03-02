import { byteToHex } from "@/lib/can-utils"

interface ByteExpanderProps {
    data: number[]
    expandedByte: number | null
    onToggleByte: (byteIndex: number) => void
    selectedBits: Set<number>
    claimedBits: Set<number>
    onToggleBit: (bitIndex: number) => void
}

const bitLabels = [7, 6, 5, 4, 3, 2, 1, 0]

const ByteExpander = ({
    data,
    expandedByte,
    onToggleByte,
    selectedBits,
    claimedBits,
    onToggleBit,
}: ByteExpanderProps) => {
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 w-full">
                {data.map((byte, byteIndex) => {
                    const isExpanded = expandedByte === byteIndex
                    return (
                        <div key={byteIndex} className="flex flex-col items-center gap-1">
                            <div className="text-[0.6rem] text-muted-foreground">B{byteIndex}</div>
                            <button
                                type="button"
                                onClick={() => onToggleByte(byteIndex)}
                                className={
                                    isExpanded
                                        ? "rounded-md border border-primary bg-primary/10 px-2 py-1 text-left"
                                        : "rounded-md border border-border bg-card px-2 py-1 text-left hover:bg-muted/50"
                                }
                            >
                                <div className="text-sm font-semibold text-foreground">{byteToHex(byte)}</div>
                            </button>
                        </div>
                    )
                })}
            </div>

            {expandedByte !== null && (
                <div className="w-full rounded-lg border border-border bg-card/40 p-3">
                    <div className="text-xs text-muted-foreground mb-2">
                        Byte {expandedByte} · 0x{byteToHex(data[expandedByte] ?? 0)} · click bits to create signal
                    </div>
                    <div className="grid grid-cols-8 gap-1">
                        {bitLabels.map((bitLabel) => {
                            const bitValue = (data[expandedByte] >> bitLabel) & 1
                            const globalBit = expandedByte * 8 + (7 - bitLabel)
                            const isSelected = selectedBits.has(globalBit)
                            const isClaimed = claimedBits.has(globalBit)

                            return (
                                <button
                                    key={bitLabel}
                                    type="button"
                                    onClick={() => onToggleBit(globalBit)}
                                    className={
                                        isSelected
                                            ? "rounded-md border border-primary bg-primary/20 px-1 py-1"
                                            : isClaimed
                                              ? "rounded-md border border-accent/60 bg-accent/10 px-1 py-1"
                                              : "rounded-md border border-border bg-muted/40 px-1 py-1 hover:bg-muted"
                                    }
                                >
                                    <div className="text-[10px] leading-none text-muted-foreground">b{bitLabel}</div>
                                    <div className="text-sm leading-none mt-1 font-semibold text-foreground">{bitValue}</div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

export default ByteExpander