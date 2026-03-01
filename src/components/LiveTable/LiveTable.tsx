import React from "react";
import FrameRow from "./FrameRow";
import type { CANMessage } from "@/types/types";

interface Props {
  messages: Map<string, CANMessage>;
  hiddenIds: Set<string>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleHide: (id: string) => void;
  showHidden: boolean;
}

const LiveTable = ({ messages, hiddenIds, selectedIds, onToggleSelect, onToggleHide, showHidden }: Props) => {
    const listRef = React.useRef<HTMLDivElement>(null);

    const sortedMessages = Array.from(messages.values())
        .filter(m => showHidden || !hiddenIds.has(m.id))
        .sort((a, b) => a.id.localeCompare(b.id));

    return (
        <div ref={listRef} className="flex-1 overflow-auto">
            <table className="w-full text-sm font-mono">
                <thead className="sticky top-0 z-10 bg-card border-b border-border">
                <tr className="text-muted-foreground text-xs">
                    <th className="text-left px-3 py-2 w-8"></th>
                    <th className="text-left px-3 py-2 w-8"></th>
                    <th className="text-left px-3 py-2">ID</th>
                    <th className="text-left px-3 py-2">DLC</th>
                    <th className="text-left px-3 py-2">Data</th>
                    <th className="text-left px-3 py-2">Count</th>
                    <th className="text-left px-3 py-2">Rate</th>
                    <th className="text-left px-3 py-2">Timestamp</th>
                </tr>
                </thead>
                <tbody>
                {sortedMessages.map(msg => {
                    return <FrameRow key={msg.id} message={msg} hiddenIds={hiddenIds} selectedIds={selectedIds} onToggleSelect={onToggleSelect} onToggleHide={onToggleHide} />
                })}
                </tbody>
            </table>
        </div>
    )
}

export default LiveTable