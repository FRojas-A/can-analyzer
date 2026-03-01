import React from "react"
import Button from "../ui/button"
import { EyeOff } from "lucide-react"
import type { CANMessage } from "@/types/types";
import { byteToHex, getChangedBytes } from "@/lib/can-utils";

interface FrameRowProps {
  message: CANMessage;
  hiddenIds: Set<string>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleHide: (id: string) => void;
}

const FrameRow = React.forwardRef<HTMLTableRowElement, FrameRowProps>(({ message, hiddenIds, selectedIds, onToggleSelect, onToggleHide }, ref) => {
    const changed = getChangedBytes(message.data, message.prevData);
    const isSelected = selectedIds.has(message.id);
    const isHidden = hiddenIds.has(message.id);
    return (
        <tr ref={ref}
            className={`
                  border-b border-border/50 cursor-pointer transition-colors text-sm
                  ${isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-muted/50'}
                  ${isHidden ? 'opacity-40' : ''}
                `}
            onClick={() => onToggleSelect(message.id)}>
            <td className="px-3 py-1.5">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => {
                        onToggleHide(message.id);
                        e.stopPropagation();
                    }}>
                    {isHidden ? <EyeOff size={14}/> : <EyeOff size={14}/>}
                </Button>
            </td>
            <td className="px-3 py-1.5">
                {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse-dot" />
                )}
            </td>
            <td className="px-3 py-1.5 text-primary font-semibold">{message.id}</td>
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
            <td className="px-3 py-1.5">{message.rate}</td>
        </tr>
    )
});

export default FrameRow