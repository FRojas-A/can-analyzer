import React from "react"
import { Eye, EyeOff } from "lucide-react"
import type { CANMessage } from "@/types/types";
import { byteToHex, formatTimestamp, getChangedBytes } from "@/lib/can-utils";
import Button from "../ui/button";

interface FrameRowProps {
  message: CANMessage;
  frameColor: string;
  selectedIds: Set<string>;
  hiddenIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleHide: (id: string) => void;
}

const FrameRow = React.forwardRef<HTMLTableRowElement, FrameRowProps>(({ message, frameColor, selectedIds, hiddenIds, onToggleSelect, onToggleHide }, ref) => {
    const changed = getChangedBytes(message.data, message.prevData);
    const isSelected = selectedIds.has(message.id);
    const isHidden = hiddenIds.has(message.id);

    return (
        <tr ref={ref}
            className={`
                  border-b border-border/50 cursor-pointer transition-colors text-sm
                  ${isSelected ? 'border-l-2' : 'hover:bg-muted/50'}
                  ${isHidden ? 'opacity-40' : ''}
                `}
            style={isSelected ? { borderLeftColor: frameColor, backgroundColor: `${frameColor}1A` } : undefined}
            onClick={() => onToggleSelect(message.id)}>
            <td className="px-3 py-1.5">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                        onToggleHide(message.id);
                        e.stopPropagation();
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
                {message.id}
            </td>
            <td className="px-3 py-1.5 text-muted-foreground">{message.dlc}</td>
            <td className="px-3 py-1.5">
                <div className="flex gap-1">
                    {message.data.map((byte, i) => (
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
            <td className="px-3 py-1.5 text-muted-foreground">{message.count}</td>
            <td className="px-3 py-1.5 text-muted-foreground">{message.rate.toFixed(1)} Hz</td>
            <td className="px-3 py-1.5 text-muted-foreground">{formatTimestamp(message.timestamp)}</td>
        </tr>
    )
});

export default FrameRow