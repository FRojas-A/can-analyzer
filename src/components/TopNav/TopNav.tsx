import { Activity, Circle, Eye, Radio } from "lucide-react";
import Button from "../ui/button";

interface TopNavProps {
    connectionStatus: "connecting" | "LIVE" | "offline" | "error"
    hiddenCount: number
    showHidden: boolean
    onToggleShowHidden: () => void
}

export default function TopNav({
    connectionStatus,
    hiddenCount,
    showHidden,
    onToggleShowHidden,
}: TopNavProps) {
    return (
        <header className="col-span-1 lg:col-span-2 border-b flex justify-between items-center p-2">
            <div className="flex gap-4">
                <div className="flex gap-2">
                    <Activity className="text-primary" size={20} />
                    <h1 className="text-sm font-semibold tracking-tight">CAN Bus Analyzer</h1>
                </div>
                <div className="flex items-center gap-1.5 ml-4">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse-dot" />
                    <span className={connectionStatus === "LIVE" ? "text-success" : "text-muted-foreground"}>{connectionStatus}</span>
                </div>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                    <Circle size={12} className="mr-1 fill-current" /> Record
                </Button>
                <Button variant="ghost" size="sm" className="text-xs">
                    <Radio size={12} className="mr-1" /> Pause
                </Button>
                <Button
                    variant={showHidden ? "secondary" : "ghost"}
                    size="sm"
                    className="text-xs"
                    onClick={onToggleShowHidden}
                >
                    <Eye size={12} className="mr-1" /> {showHidden ? "Hide Hidden" : `Show Hidden${hiddenCount > 0 ? ` (${hiddenCount})` : ""}`}
                </Button>
            </div>
        </header>
    );
}