import { useState } from "react"

import { BatchAdvancedOptions } from "./batch-panel/BatchAdvancedOptions"
import { BatchPanelActions } from "./batch-panel/BatchPanelActions"
import { BatchPanelHeader } from "./batch-panel/BatchPanelHeader"
import { BatchPanelLauncher } from "./batch-panel/BatchPanelLauncher"
import { BatchSelectionSummary } from "./batch-panel/BatchSelectionSummary"
import { getBatchPanelViewState } from "./batch-panel/state"
import type { BatchPanelProps } from "./batch-panel/types"

export function BatchPanel({
  sourceName = "当前站点",
  isExpanded,
  selectedCount,
  running,
  statusText,
  savePath,
  savePathHint,
  onToggleExpanded,
  onSelectAll,
  onClear,
  onSavePathChange,
  onClearSavePath,
  onDownload,
  onOpenSettings
}: BatchPanelProps) {
  const panelPositionClassName =
    "anime-bt-content-root fixed bottom-[20px] right-[20px] z-[2147483647] max-[680px]:bottom-[var(--anime-bt-mobile-inset)] max-[680px]:left-[var(--anime-bt-mobile-inset)] max-[680px]:right-[var(--anime-bt-mobile-inset)]"
  const advancedOptionsId = "anime-bt-batch-advanced-options"
  const savePathInputId = "anime-bt-batch-save-path"
  const [showAdvanced, setShowAdvanced] = useState(false)
  const viewState = getBatchPanelViewState({
    running,
    selectedCount,
    showAdvanced
  })

  if (!isExpanded) {
    return (
      <div className={panelPositionClassName}>
        <div className="flex justify-end max-[680px]:justify-stretch">
          <BatchPanelLauncher
            selectedCount={selectedCount}
            onExpand={() => {
              onToggleExpanded(true)
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={panelPositionClassName}>
      <aside
        data-anime-bt-role="panel-shell"
        className="w-[min(var(--anime-bt-panel-width),calc(100vw-24px))] overflow-hidden rounded-[var(--anime-bt-radius-xl)] border border-[rgba(135,151,173,0.24)] bg-[linear-gradient(180deg,rgba(252,253,255,0.98)_0%,rgba(243,247,252,0.98)_100%)] text-[#182636] shadow-[var(--anime-bt-shadow-floating)] backdrop-blur-[18px] max-[680px]:w-full"
        aria-label="批量下载面板">
        <BatchPanelHeader
          sourceName={sourceName}
          onOpenSettings={onOpenSettings}
          onMinimize={() => {
            onToggleExpanded(false)
          }}
        />

        <div className="flex flex-col gap-[var(--anime-bt-panel-gap)] p-[18px]">
          <BatchSelectionSummary selectedCount={selectedCount} statusText={statusText} />
          <BatchAdvancedOptions
            showAdvanced={showAdvanced}
            advancedState={viewState.advancedState}
            advancedOptionsId={advancedOptionsId}
            savePathInputId={savePathInputId}
            savePath={savePath}
            savePathHint={savePathHint}
            disablePathActions={viewState.disablePathActions}
            onToggle={() => {
              setShowAdvanced((open) => !open)
            }}
            onSavePathChange={onSavePathChange}
            onClearSavePath={onClearSavePath}
          />
        </div>
        <BatchPanelActions
          running={running}
          disableClear={viewState.disableClear}
          disableDownload={viewState.disableDownload}
          downloadLabel={viewState.downloadLabel}
          onSelectAll={onSelectAll}
          onClear={onClear}
          onDownload={onDownload}
        />
      </aside>
    </div>
  )
}
