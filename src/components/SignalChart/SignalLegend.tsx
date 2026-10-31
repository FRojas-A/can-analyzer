import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ChartSignal } from "@/types/types"
import Button from "../ui/button"

interface SignalLegendProps {
  signals: ChartSignal[]
  hiddenKeys: Set<string>
  onToggleVisibility: (key: string) => void
  onSelectSignal?: (key: string) => void
}

const SignalLegend = ({
  signals,
  hiddenKeys,
  onToggleVisibility,
  onSelectSignal,
}: SignalLegendProps) => {
  return (
    <div className="flex w-56 shrink-0 flex-col border-l border-border">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-1 text-xs text-muted-foreground">
        <span>Signals</span>
        <span className="font-mono">{signals.length}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {signals.map((signal) => {
          const hidden = hiddenKeys.has(signal.key)
          return (
            <div
              key={signal.key}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-xs",
                onSelectSignal && "cursor-pointer hover:bg-muted/50",
              )}
              onClick={() => onSelectSignal?.(signal.key)}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: signal.color }}
              />
              <span className={cn("min-w-0 flex-1 truncate text-left font-mono", hidden && "opacity-50")}>
                {signal.name}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{signal.frameId}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleVisibility(signal.key)
                }}
                title={hidden ? "Show series" : "Hide series"}
              >
                {hidden ? <EyeOff size={12} /> : <Eye size={12} />}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SignalLegend
