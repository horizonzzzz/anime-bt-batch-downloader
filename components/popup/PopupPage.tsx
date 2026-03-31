import { HiOutlineCog6Tooth } from "react-icons/hi2"

import type { PopupOptionsRoute, PopupStateViewModel } from "../../lib/shared/popup"
import type { SourceId } from "../../lib/shared/types"
import { Button } from "../ui"
import { PopupFooter } from "./PopupFooter"
import { PopupQuickActions } from "./PopupQuickActions"
import { PopupStatusCard } from "./PopupStatusCard"
import { PopupSupportedSites } from "./PopupSupportedSites"

export type PopupPageProps = {
  state: PopupStateViewModel
  onOpenGeneralOptions: () => void
  onOpenOptionsRoute: (route: PopupOptionsRoute) => void
  onToggleCurrentSiteEnabled: (sourceId: SourceId, enabled: boolean) => void
  actionsDisabled?: boolean
}

export function PopupPage({
  state,
  onOpenGeneralOptions,
  onOpenOptionsRoute,
  onToggleCurrentSiteEnabled,
  actionsDisabled = false
}: PopupPageProps) {
  return (
    <div className="w-[360px] space-y-3 bg-zinc-50 p-3 text-zinc-900">
      <header className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2.5 shadow-panel">
        <div className="space-y-0.5">
          <h1 className="text-sm font-semibold">Anime BT Batch</h1>
          <p className="text-xs text-zinc-500">Popup 控制台</p>
        </div>
        <Button
          aria-label="打开设置"
          disabled={actionsDisabled}
          size="sm"
          type="button"
          variant="ghost"
          onClick={onOpenGeneralOptions}>
          <HiOutlineCog6Tooth aria-hidden="true" className="h-4 w-4" />
        </Button>
      </header>

      <PopupStatusCard
        qbConfigured={state.qbConfigured}
        activeTab={state.activeTab}
        actionsDisabled={actionsDisabled}
        onOpenGeneralOptions={onOpenGeneralOptions}
        onToggleCurrentSiteEnabled={onToggleCurrentSiteEnabled}
      />

      {state.qbConfigured ? (
        <PopupQuickActions disabled={actionsDisabled} onOpenOptionsRoute={onOpenOptionsRoute} />
      ) : null}

      <PopupSupportedSites supportedSites={state.supportedSites} />

      <PopupFooter version={state.version} helpUrl={state.helpUrl} />
    </div>
  )
}
