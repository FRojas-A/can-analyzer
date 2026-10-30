import FrameDetails from "./components/FrameDetails/FrameDetails"
import LiveTable from "./components/LiveTable/LiveTable"
import TopNav from "./components/TopNav/TopNav"
import Button from "./components/ui/button"
import Card from "./components/ui/card"
import { useCanMessages } from "./hooks/useCanMessages"
import { useFrameUiState } from "./hooks/useFrameUiState"
import { useVehicleProfile } from "./hooks/useVehicleProfile"

const FALLBACK_FRAME_COLOR = "#4FA6F8"

function App() {
  const { messages, messagesVersion, connectionStatus, connectionError } = useCanMessages()
  const vehicleProfile = useVehicleProfile()

  const {
    selectedIds,
    showHidden,
    selectedFrames,
    visibleCount,
    selectedSignalCount,
    toggleShowHidden,
    toggleSelect,
    hideSelectedFrames,
    toggleHideFrame,
  } = useFrameUiState(messages, messagesVersion, {
    hiddenIds: vehicleProfile.hiddenIds,
    frameColorById: vehicleProfile.frameColorById,
    signalsByFrameId: vehicleProfile.signalsByFrameId,
    toggleHideFrame: vehicleProfile.toggleHideFrame,
    hideFrames: vehicleProfile.hideFrames,
    assignFrameColor: vehicleProfile.assignFrameColor,
  })

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
        hiddenCount={vehicleProfile.hiddenIds.size}
        showHidden={showHidden}
        onToggleShowHidden={toggleShowHidden}
        onExportProfile={vehicleProfile.exportProfile}
        onImportProfile={vehicleProfile.importProfile}
      />

      <section className="col-span-1 overflow-hidden border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-3 py-1 border-b border-border text-xs">
          <span className="text-muted-foreground py-3">
            Frames: {visibleCount}/{messages.size} · Hidden: {vehicleProfile.hiddenIds.size} · Selected: {selectedIds.size} · Signals: {selectedSignalCount}
          </span>
          {selectedIds.size > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={hideSelectedFrames}
            >
              Hide Selected ({selectedIds.size})
            </Button>
          )}
        </div>
        {connectionError && <div className="px-3 py-1 text-xs text-destructive border-b border-border">{connectionError}</div>}
        {vehicleProfile.storageError && <div className="px-3 py-1 text-xs text-destructive border-b border-border">{vehicleProfile.storageError}</div>}

        <LiveTable
          messages={messages}
          messagesVersion={messagesVersion}
          selectedIds={selectedIds}
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

      <section className="col-span-2 overflow-y-auto p-2 border-t border-border">
        <div className="p-4 text-sm text-muted-foreground">Signal analysis coming soon...</div>
      </section>
    </div>
  )
}

export default App
