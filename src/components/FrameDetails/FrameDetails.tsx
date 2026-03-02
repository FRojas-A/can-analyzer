import type { CANMessage, Endianness, SignalConfig } from "@/types/types"
import { Circle, Plus } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import Button from "../ui/button"
import Card from "../ui/card"
import ByteExpander from "./ByteExpander"
import Signals from "./Signals"

interface FrameDetailsProps {
    frame: CANMessage
}

const FrameDetails = ({ frame }: FrameDetailsProps) => {
    const [defaultEndianness, setDefaultEndianness] = useState<Endianness>("big")
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
            endianness: defaultEndianness,
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
            {/* header */}
            <div className="flex justify-start items-center py-2 px-4 gap-2 text-primary border-b">
                <Circle size={10} className="fill-current" />
                <h2>{frame.id}</h2>
            </div>
            {/* endianness */}
            <div className="flex flex-col justify-center items-start py-2 px-4 border-b gap-1">
                <label htmlFor="endianness" className="text-xs text-muted-foreground">Default endianness for new signals</label>
                <select
                    id="endianness"
                    value={defaultEndianness}
                    onChange={(e) => setDefaultEndianness(e.target.value as Endianness)}
                    className="w-full text-xs px-3 py-2 rounded border border-border bg-muted"
                >
                    <option value="big">Big Endian</option>
                    <option value="little">Little Endian</option>
                </select>
            </div>
            {/* bytes */}
            <div className="flex flex-col justify-center items-start py-2 px-4 border-b gap-1">
                <label className="text-xs text-muted-foreground">Hex - click to expand</label>
                <ByteExpander
                    data={displayData}
                    expandedByte={expandedByte}
                    onToggleByte={(byteIndex) => setExpandedByte((current) => (current === byteIndex ? null : byteIndex))}
                    selectedBits={new Set(selectedBits)}
                    claimedBits={claimedBits}
                    onToggleBit={toggleBit}
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
            {/* signals */}
            <div className="flex flex-col justify-center items-start py-2 px-4 gap-1">
                <label className="text-xs text-muted-foreground">Signals</label>
                <Signals
                    data={displayData}
                    signals={signals}
                    onUpdateSignal={updateSignal}
                    onRemoveSignal={removeSignal}
                />
            </div>
        </Card>
    )
}

export default FrameDetails