import React from "react";
import FrameRow from "./FrameRow";
import type { CANMessage } from "@/types/types";
import { compareCanIds } from "@/lib/can-utils";

interface Props {
  messages: Map<string, CANMessage>;
  messagesVersion: number;
  selectedIds: Set<string>;
  hiddenIds: Set<string>;
  showHidden: boolean;
  frameColors: Record<string, string>;
  onToggleSelect: (id: string) => void;
  onToggleHide: (id: string) => void;
}

const LiveTable = ({ messages, messagesVersion, selectedIds, hiddenIds, showHidden, frameColors, onToggleSelect, onToggleHide }: Props) => {
    const listRef = React.useRef<HTMLDivElement>(null);

    const sortedMessages = React.useMemo(() => {
        void messagesVersion;
        return Array.from(messages.values()).sort((a, b) => compareCanIds(a.id, b.id));
    }, [messages, messagesVersion]);

    return (
        <div ref={listRef} className="flex-1 overflow-auto">
            <table className="w-full text-sm font-mono">
                <thead className="sticky top-0 z-10 bg-card border-b border-border">
                <tr className="text-muted-foreground text-xs">
                    <th className="text-left px-3 py-2 w-6"></th>
                    <th className="text-left px-3 py-2 w-6"></th>
                    <th className="text-left px-3 py-2">ID</th>
                    <th className="text-left px-3 py-2">DLC</th>
                    <th className="text-left px-3 py-2">Data</th>
                    <th className="text-left px-3 py-2">Count</th>
                    <th className="text-left px-3 py-2">Hz</th>
                    <th className="text-left px-3 py-2">Timestamp</th>
                </tr>
                </thead>
                <tbody>
                {sortedMessages.map(msg => {
                    if (!showHidden && hiddenIds.has(msg.id)) {
                        return null;
                    }

                    return (
                      <FrameRow
                        key={msg.id}
                        id={msg.id}
                        data={msg.data}
                        prevData={msg.prevData}
                        timestamp={msg.timestamp}
                        dlc={msg.dlc}
                        count={msg.count}
                        rate={msg.rate}
                        frameColor={frameColors[msg.id] ?? "#4FA6F8"}
                        isSelected={selectedIds.has(msg.id)}
                        isHidden={hiddenIds.has(msg.id)}
                        onToggleSelect={onToggleSelect}
                        onToggleHide={onToggleHide}
                      />
                    )
                })}
                </tbody>
            </table>
        </div>
    )
}

export default LiveTable