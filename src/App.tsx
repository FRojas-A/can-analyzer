import FrameDetails from "./components/FrameDetails/FrameDetails"
import LiveTable from "./components/LiveTable/LiveTable"
import TopNav from "./components/TopNav/TopNav"
import Button from "./components/ui/button"
import Card from "./components/ui/card"
import { useCanMessages } from "./hooks/useCanMessages"
import { useFrameUiState } from "./hooks/useFrameUiState"

const FALLBACK_FRAME_COLOR = "#4FA6F8"

function App() {
  const { messages, connectionStatus, connectionError } = useCanMessages()
  const {
    selectedIds,
    hiddenIds,
    showHidden,
    selectedFrames,
    visibleMessages,
    selectedSignalCount,
    frameColorById,
    toggleShowHidden,
    toggleSelect,
    hideSelectedFrames,
    toggleHideFrame,
    handleSignalCountChange,
    handleFrameColorChange,
  } = useFrameUiState(messages)

  return (
    <div className="grid h-screen grid-rows-[auto_1fr] grid-cols-1 lg:grid-cols-[2fr_1fr]">
      <TopNav
        connectionStatus={connectionStatus}
        hiddenCount={hiddenIds.size}
        showHidden={showHidden}
        onToggleShowHidden={toggleShowHidden}
      />

      <section className="col-span-1 overflow-hidden border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-3 py-1 border-b border-border text-xs">
          <span className="text-muted-foreground py-3">
            Frames: {visibleMessages.size}/{messages.size} · Hidden: {hiddenIds.size} · Selected: {selectedIds.size} · Signals: {selectedSignalCount}
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

        <LiveTable
          messages={visibleMessages}
          selectedIds={selectedIds}
          hiddenIds={hiddenIds}
          frameColors={frameColorById}
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
              frameColor={frameColorById[frame.id] ?? FALLBACK_FRAME_COLOR}
              onFrameColorChange={handleFrameColorChange}
              onSignalCountChange={handleSignalCountChange}
            />
          ))
        )}
      </aside>
    </div>
  )
}

export default App
