import { byteToHex, hasSelectedBitInByte } from "@/lib/can-utils"
import Button from "../ui/button"

interface ByteExpanderProps {
    data: number[]
    expandedByte: number | null
    onToggleByte: (byteIndex: number) => void
    selectedBits: Set<number>
    claimedBits: Set<number>
    onToggleBit: (bitIndex: number) => void
    onClearSelection: () => void
}

const bitLabels = [7, 6, 5, 4, 3, 2, 1, 0]

const ByteExpander = ({
    data,
    expandedByte,
    onToggleByte,
    selectedBits,
    claimedBits,
    onToggleBit,
    onClearSelection,
}: ByteExpanderProps) => {
    const logicalByteIndex = (byteIndex: number) => data.length - 1 - byteIndex

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 w-full">
                {data.map((byte, byteIndex) => {
                    const isExpanded = expandedByte === byteIndex
                    const hasSelectedBit = hasSelectedBitInByte(byteIndex, selectedBits, data)
                    return (
                        <div key={byteIndex} className="flex flex-col items-center gap-1">
                            <div className="text-[0.6rem] text-muted-foreground">B{logicalByteIndex(byteIndex)}</div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onToggleByte(byteIndex)}
                                className={
                                    isExpanded
                                        ? "h-auto min-h-0 rounded-md border border-primary bg-primary/10 px-2 py-1 text-left"
                                        : hasSelectedBit
                                          ? "h-auto min-h-0 rounded-md border border-primary/70 bg-card px-2 py-1 text-left ring-1 ring-primary/40"
                                          : "h-auto min-h-0 rounded-md border border-border bg-card px-2 py-1 text-left hover:bg-muted/50"
                                }
                            >
                                <div className="text-sm font-semibold text-foreground">{byteToHex(byte)}</div>
                            </Button>
                        </div>
                    )
                })}
            </div>

            {expandedByte !== null && (
                <div className="w-full rounded-lg border border-border bg-card/40 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="text-xs text-muted-foreground">
                            Byte {logicalByteIndex(expandedByte)} · 0x{byteToHex(data[expandedByte] ?? 0)} · click bits to create signal
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={onClearSelection}
                            disabled={selectedBits.size === 0}
                        >
                            Clear bits
                        </Button>
                    </div>
                    <div className="grid grid-cols-8 gap-1">
                        {bitLabels.map((bitLabel) => {
                            const bitValue = (data[expandedByte] >> bitLabel) & 1
                            const globalBit = logicalByteIndex(expandedByte) * 8 + bitLabel

                            const isSelected = selectedBits.has(globalBit)
                            const isClaimed = claimedBits.has(globalBit)

                            return (
                                <Button
                                    key={bitLabel}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onToggleBit(globalBit)}
                                    className={
                                        isSelected
                                            ? "h-auto min-h-0 flex-col items-center gap-1 rounded-md border border-primary bg-primary/20 px-1 py-1"
                                            : isClaimed
                                              ? "h-auto min-h-0 flex-col items-center gap-1 rounded-md border border-accent/60 bg-accent/10 px-1 py-1"
                                              : "h-auto min-h-0 flex-col items-center gap-1 rounded-md border border-border bg-muted/40 px-1 py-1 hover:bg-muted"
                                    }
                                >
                                    <div className="text-[10px] leading-none text-muted-foreground">b{bitLabel}</div>
                                    <div className="text-sm leading-none mt-1 font-semibold text-foreground">{bitValue}</div>
                                </Button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

export default ByteExpander