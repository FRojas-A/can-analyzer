import { Activity, Circle, Download, Radio, Upload } from "lucide-react";
import { useRef } from "react";
import Button from "../ui/button";
import type { ConnectionStatus } from "@/types/types";

interface TopNavProps {
    connectionStatus: ConnectionStatus
    onExportProfile: () => void
    onImportProfile: (file: File) => void
}

export default function TopNav({
    connectionStatus,
    onExportProfile,
    onImportProfile,
}: TopNavProps) {
    const importInputRef = useRef<HTMLInputElement>(null)

    return (
        <header className="col-span-1 lg:col-span-2 border-b flex justify-between items-center p-2">
            <div className="flex gap-4">
                <div className="flex gap-2">
                    <Activity className="text-primary" size={20} />
                    <h1 className="font-semibold tracking-tight">CAN Bus Analyzer</h1>
                </div>
                <div className="flex items-center gap-1.5 ml-4">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse-dot" />
                    <span className={connectionStatus === "LIVE" ? "text-success" : "text-muted-foreground"}>{connectionStatus}</span>
                </div>
            </div>
            <div className="flex gap-2">
                <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                            onImportProfile(file)
                        }
                        e.target.value = ""
                    }}
                />
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={onExportProfile}
                    title="Export profile"
                >
                    <Download size={12} className="mr-1" /> Export
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => importInputRef.current?.click()}
                    title="Import profile"
                >
                    <Upload size={12} className="mr-1" /> Import
                </Button>
                <Button variant="outline" size="sm" className="text-xs border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                    <Circle size={12} className="mr-1 fill-current" /> Record
                </Button>
                <Button variant="ghost" size="sm" className="text-xs">
                    <Radio size={12} className="mr-1" /> Pause
                </Button>
            </div>
        </header>
    );
}