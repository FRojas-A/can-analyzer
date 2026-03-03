import type { CANMessage, SignalConfig } from "@/types/types"
import { ChevronDown, ChevronRight, Circle, Plus } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import Button from "../ui/button"
import Card from "../ui/card"
import ByteExpander from "./ByteExpander"
import Signals from "./Signals"

interface FrameDetailsProps {
    frame: CANMessage
    frameColor: string
    onFrameColorChange?: (frameId: string, color: string) => void
    onSignalCountChange?: (frameId: string, signalCount: number) => void
}

const FrameDetails = ({ frame, frameColor, onFrameColorChange, onSignalCountChange }: FrameDetailsProps) => {
    const [isCardOpen, setIsCardOpen] = useState(true)
    const [isByteSectionOpen, setIsByteSectionOpen] = useState(true)
    const [isSignalSectionOpen, setIsSignalSectionOpen] = useState(true)
    const [expandedByte, setExpandedByte] = useState<number | null>(null)
    const [selectedBits, setSelectedBits] = useState<number[]>([])
    const [signalsByFrameId, setSignalsByFrameId] = useState<Record<string, SignalConfig[]>>({})

    const byteCount = Math.max(8, frame.dlc, frame.data.length)
    const displayData = Array.from({ length: byteCount }, (_, i) => frame.data[i] ?? 0)

    const signals = signalsByFrameId[frame.id] ?? []

    const claimedBits = useMemo(() => {
        const bits = new Set<number>()
        for (const signal of signals) {
            const end = signal.startBit + signal.bitLength - 1
            for (let bit = signal.startBit; bit <= end; bit++) {
                bits.add(bit)
            }
        }
        return bits
    }, [signals])

    const selectionStart = selectedBits.length > 0 ? Math.min(...selectedBits) : null
    const selectionEnd = selectedBits.length > 0 ? Math.max(...selectedBits) : null
    const selectionLength =
        selectionStart !== null && selectionEnd !== null ? selectionEnd - selectionStart + 1 : 0

    const hasSelectionOverlap = useMemo(() => {
        if (selectionStart === null || selectionEnd === null) {
            return false
        }
        return signals.some((signal) => {
            const signalStart = signal.startBit
            const signalEnd = signal.startBit + signal.bitLength - 1
            return Math.max(selectionStart, signalStart) <= Math.min(selectionEnd, signalEnd)
        })
    }, [selectionEnd, selectionStart, signals])

    useEffect(() => {
        setExpandedByte(null)
        setSelectedBits([])
    }, [frame.id])

    useEffect(() => {
        onSignalCountChange?.(frame.id, signals.length)
    }, [frame.id, onSignalCountChange, signals.length])

    const updateSignalsForCurrentFrame = (updater: (current: SignalConfig[]) => SignalConfig[]) => {
        setSignalsByFrameId((prev) => {
            const current = prev[frame.id] ?? []
            return {
                ...prev,
                [frame.id]: updater(current),
            }
        })
    }

    const toggleBit = (bitIndex: number) => {
        setSelectedBits((prev) => {
            if (prev.includes(bitIndex)) {
                return prev.filter((bit) => bit !== bitIndex)
            }
            return [...prev, bitIndex].sort((a, b) => a - b)
        })
    }

    const addSignalFromSelection = () => {
        if (selectionStart === null || selectionLength === 0) {
            return
        }

        const usedNames = new Set(signals.map((signal) => signal.name))
        let signalNumber = 1
        while (usedNames.has(`Signal_${signalNumber}`)) {
            signalNumber += 1
        }

        const newSignal: SignalConfig = {
            name: `Signal_${signalNumber}`,
            startBit: selectionStart,
            bitLength: selectionLength,
            endianness: "big",
            scale: 1,
            offset: 0,
            transform: "",
        }

        updateSignalsForCurrentFrame((current) => [...current, newSignal])
        setSelectedBits([])
    }

    const updateSignal = (signalIndex: number, nextSignal: SignalConfig) => {
        updateSignalsForCurrentFrame((current) =>
            current.map((signal, index) => (index === signalIndex ? nextSignal : signal))
        )
    }

    const removeSignal = (signalIndex: number) => {
        updateSignalsForCurrentFrame((current) => current.filter((_, index) => index !== signalIndex))
    }

    return (
        <Card>
            <div className={`flex items-center justify-between gap-2 py-2 px-4 ${isCardOpen ? "border-b" : ""}`}>
                <div className="flex items-center gap-2" style={{ color: frameColor }}>
                    <div className="group relative flex items-center gap-2">
                        <Circle size={10} className="fill-current" />
                        <h2 className="font-semibold">{frame.id}</h2>
                        <label className="ml-1 inline-flex h-4 w-4 cursor-pointer items-center justify-center opacity-0 transition-opacity group-hover:opacity-100" title="Frame color">
                            <input
                                type="color"
                                value={frameColor}
                                onChange={(e) => onFrameColorChange?.(frame.id, e.target.value)}
                                className="h-4 w-4 cursor-pointer rounded border border-border bg-transparent p-0"
                                aria-label={`Frame color for ${frame.id}`}
                            />
                        </label>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isCardOpen && <span className="text-xs text-muted-foreground">Signals: {signals.length}</span>}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setIsCardOpen((current) => !current)}
                    >
                        {isCardOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </Button>
                </div>
            </div>
            {isCardOpen && (
                <>
                    <div className={isCardOpen ? "border-b" : ""}>
                        <div className="flex items-center justify-between py-2 px-4">
                            <label className="text-xs text-muted-foreground">Byte expander</label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => setIsByteSectionOpen((current) => !current)}
                            >
                                {isByteSectionOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </Button>
                        </div>
                        {isByteSectionOpen && (
                            <div className="flex flex-col justify-center items-start py-2 px-4 gap-1">
                                <ByteExpander
                                    data={displayData}
                                    expandedByte={expandedByte}
                                    onToggleByte={(byteIndex) => setExpandedByte((current) => (current === byteIndex ? null : byteIndex))}
                                    selectedBits={new Set(selectedBits)}
                                    claimedBits={claimedBits}
                                    onToggleBit={toggleBit}
                                    onClearSelection={() => setSelectedBits([])}
                                />
                                {expandedByte !== null && <div className="w-full text-xs text-muted-foreground mt-2">
                                    {selectionStart !== null && selectionEnd !== null ? (
                                        <span>
                                            Selected bits: {selectedBits.length} (range {selectionStart}-{selectionEnd}, length {selectionLength})
                                        </span>
                                    ) : (
                                        <span>Select one or more bits to define a signal range.</span>
                                    )}
                                </div>}
                                {hasSelectionOverlap && (
                                    <div className="w-full rounded-md border border-accent/50 bg-accent/10 px-2 py-1 text-xs text-accent mt-1">
                                        Warning: selected range overlaps an existing signal. You can still add it.
                                    </div>
                                )}
                                {expandedByte !== null && <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 bg-primary text-primary-foreground"
                                    disabled={selectionLength === 0}
                                    onClick={addSignalFromSelection}
                                >
                                    <Plus size={14} />
                                    Add Signal
                                </Button>}
                            </div>
                        )}
                    </div>

                    <div className="py-2 px-4">
                        <div className="flex items-center justify-between pb-2">
                            <label className="text-xs text-muted-foreground">Signals</label>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Total: {signals.length}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() => setIsSignalSectionOpen((current) => !current)}
                                >
                                    {isSignalSectionOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </Button>
                            </div>
                        </div>
                        {isSignalSectionOpen && (
                            <Signals
                                frameColor={frameColor}
                                data={displayData}
                                signals={signals}
                                onUpdateSignal={updateSignal}
                                onRemoveSignal={removeSignal}
                            />
                        )}
                    </div>
                </>
            )}
        </Card>
    )
}

export default FrameDetails