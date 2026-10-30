import { useMemo } from "react"
import { Eye, EyeOff } from "lucide-react"
import { compareCanIds } from "./lib/can-utils"
import FrameDetails from "./components/FrameDetails/FrameDetails"
import LiveTable from "./components/LiveTable/LiveTable"
import SignalChart from "./components/SignalChart/SignalChart"
import TopNav from "./components/TopNav/TopNav"
import Button from "./components/ui/button"
import Card from "./components/ui/card"
import { useCanMessages } from "./hooks/useCanMessages"
import { useFrameUiState } from "./hooks/useFrameUiState"
import { useVehicleProfile } from "./hooks/useVehicleProfile"
import type { ChartSignal } from "./types/types"

const FALLBACK_FRAME_COLOR = "#4FA6F8"

function App() {
  const { messages, messagesVersion, connectionStatus, connectionError, capture, captureVersion, clearCapture } = useCanMessages()
  const vehicleProfile = useVehicleProfile()

  const {
    selectedIds,
    selectedIdsSet,
    selectionMode,
    showHidden,
    selectedFrames,
    visibleCount,
    signalCount,
    toggleShowHidden,
    toggleSelect,
    toggleSelectedVisibility,
    toggleHideFrame,
  } = useFrameUiState(messages, messagesVersion, {
    hiddenIds: vehicleProfile.hiddenIds,
    frameColorById: vehicleProfile.frameColorById,
    signalsByFrameId: vehicleProfile.signalsByFrameId,
    toggleHideFrame: vehicleProfile.toggleHideFrame,
    hideFrames: vehicleProfile.hideFrames,
    unhideFrames: vehicleProfile.unhideFrames,
    assignFrameColor: vehicleProfile.assignFrameColor,
  })

  const chartSignals: ChartSignal[] = useMemo(() => {
    void messagesVersion
    const list: ChartSignal[] = []
    const frameIds = Array.from(messages.keys()).sort(compareCanIds)
    for (const frameId of frameIds) {
      const signals = vehicleProfile.signalsByFrameId[frameId] ?? []
      const frameColor = vehicleProfile.frameColorById[frameId] ?? FALLBACK_FRAME_COLOR
      signals.forEach((signal, index) => {
        list.push({
          key: `${frameId}:${index}:${signal.name}`,
          frameId,
          name: signal.name,
          color: signal.color ?? frameColor,
          startBit: signal.startBit,
          bitLength: signal.bitLength,
          endianness: signal.endianness,
          scale: signal.scale,
          offset: signal.offset,
          transform: signal.transform,
        })
      })
    }
    return list
  }, [messages, messagesVersion, vehicleProfile.frameColorById, vehicleProfile.signalsByFrameId])

  if (!vehicleProfile.hydrated) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Loading profile...
      </div>
    )
  }

  return (
    <div className="grid h-screen grid-rows-[auto_2fr_1fr] grid-cols-1 lg:grid-cols-[2fr_1fr]">
      <TopNav
        connectionStatus={connectionStatus}
        onExportProfile={vehicleProfile.exportProfile}
        onImportProfile={vehicleProfile.importProfile}
      />

      <section className="col-span-1 overflow-hidden border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-3 py-1 border-b border-border text-xs">
          <span className="text-muted-foreground py-3">
            Frames: {visibleCount}/{messages.size} · Hidden: {vehicleProfile.hiddenIds.size} · Selected: {selectedIds.length} · Signals: {signalCount}
          </span>
          <div className="flex items-center gap-1">
            {selectedIds.length > 0 && (
              <Button
                type="button"
                variant={selectionMode === "show" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={toggleSelectedVisibility}
              >
                {selectionMode === "show" ? "Show Selected" : "Hide Selected"} ({selectedIds.length})
              </Button>
            )}
            {vehicleProfile.hiddenIds.size > 0 && (
              <>
                <Button
                  type="button"
                  variant={showHidden ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={toggleShowHidden}
                >
                  <Eye size={12} className="mr-1" />
                  {showHidden ? "Hide Hidden" : "Show Hidden"} ({vehicleProfile.hiddenIds.size})
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={vehicleProfile.unhideAllFrames}
                >
                  <EyeOff size={12} className="mr-1" />
                  Unhide All ({vehicleProfile.hiddenIds.size})
                </Button>
              </>
            )}
          </div>
        </div>
        {connectionError && <div className="px-3 py-1 text-xs text-destructive border-b border-border">{connectionError}</div>}
        {vehicleProfile.storageError && <div className="px-3 py-1 text-xs text-destructive border-b border-border">{vehicleProfile.storageError}</div>}

        <LiveTable
          messages={messages}
          messagesVersion={messagesVersion}
          selectedIds={selectedIdsSet}
          hiddenIds={vehicleProfile.hiddenIds}
          showHidden={showHidden}
          frameColors={vehicleProfile.frameColorById}
          onToggleSelect={toggleSelect}
          onToggleHide={toggleHideFrame}
        />
      </section>

      <aside className="col-span-1 overflow-y-auto p-2 space-y-2">
        {selectedFrames.length === 0 ? (
          <Card>
            <div className="p-4 text-sm text-muted-foreground">Select one or more frame rows to view details.</div>
          </Card>
        ) : (
          selectedFrames.map((frame) => (
            <FrameDetails
              key={frame.id}
              frame={frame}
              frameColor={vehicleProfile.frameColorById[frame.id] ?? FALLBACK_FRAME_COLOR}
              signals={vehicleProfile.signalsByFrameId[frame.id] ?? []}
              onUpdateSignals={(updater) => vehicleProfile.updateSignalsForFrame(frame.id, updater)}
              onFrameColorChange={vehicleProfile.setFrameColor}
            />
          ))
        )}
      </aside>

      <section className="col-span-2 overflow-hidden border-t border-border">
        <SignalChart
          signals={chartSignals}
          capture={capture}
          captureVersion={captureVersion}
          onClearCapture={clearCapture}
        />
      </section>
    </div>
  )
}

export default App
