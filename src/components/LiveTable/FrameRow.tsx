import React from "react"
import { Eye, EyeOff } from "lucide-react"
import { byteToHex, formatTimestamp, getChangedBytes } from "@/lib/can-utils"
import Button from "../ui/button"

interface FrameRowProps {
  id: string
  data: number[]
  prevData?: number[]
  timestamp: number
  dlc: number
  count: number
  rate: number
  frameColor: string
  isSelected: boolean
  isHidden: boolean
  onToggleSelect: (id: string) => void
  onToggleHide: (id: string) => void
}

const FrameRow = React.memo(({ id, data, prevData, timestamp, dlc, count, rate, frameColor, isSelected, isHidden, onToggleSelect, onToggleHide }: FrameRowProps) => {
    const changed = React.useMemo(() => getChangedBytes(data, prevData), [data, prevData])

    return (
        <tr
            className={`
                  border-b border-border/50 cursor-pointer transition-colors text-sm
                  ${isSelected ? 'border-l-2' : 'hover:bg-muted/50'}
                  ${isHidden ? 'opacity-40' : ''}
                `}
            style={isSelected ? { borderLeftColor: frameColor, backgroundColor: `${frameColor}1A` } : undefined}
            onClick={() => onToggleSelect(id)}>
            <td className="px-3 py-1.5">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                        onToggleHide(id)
                        e.stopPropagation()
                    }}
                >
                    {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                </Button>
            </td>
            <td className="px-3 py-1.5">
                <div
                    className={`w-2 h-2 rounded-full ${isSelected ? 'animate-pulse-dot' : 'bg-muted-foreground/35'}`}
                    style={isSelected ? { backgroundColor: frameColor } : undefined}
                />
            </td>
            <td
                className={`px-3 py-1.5 font-semibold ${isSelected ? '' : 'text-muted-foreground'}`}
                style={isSelected ? { color: frameColor } : undefined}
            >
                {id}
            </td>
            <td className="px-3 py-1.5 text-muted-foreground">{dlc}</td>
            <td className="px-3 py-1.5">
                <div className="flex gap-1">
                    {data.map((byte, i) => (
                    <span
                        key={i}
                        className={`
                        px-1 rounded text-xs
                        ${changed[i] ? 'text-accent font-bold data-changed' : 'text-foreground'}
                        `}
                    >
                        {byteToHex(byte)}
                    </span>
                    ))}
                </div>
            </td>
            <td className="px-3 py-1.5 text-muted-foreground">{count}</td>
            <td className="px-3 py-1.5 text-muted-foreground">{rate.toFixed(1)} Hz</td>
            <td className="px-3 py-1.5 text-muted-foreground">{formatTimestamp(timestamp)}</td>
        </tr>
    )
})

export default FrameRow