import { HiOutlineExclamationTriangle } from "react-icons/hi2"

import { POPUP_SUPPORTED_SITE_META } from "../../lib/shared/popup"
import type { PopupActiveTabViewModel } from "../../lib/shared/popup"
import type { SourceId } from "../../lib/shared/types"
import { Button, Card, Switch } from "../ui"

type PopupStatusCardProps = {
  qbConfigured: boolean
  activeTab: PopupActiveTabViewModel
  onOpenGeneralOptions: () => void
  onToggleCurrentSiteEnabled: (sourceId: SourceId, enabled: boolean) => void
  actionsDisabled?: boolean
}

export function PopupStatusCard({
  qbConfigured,
  activeTab,
  onOpenGeneralOptions,
  onToggleCurrentSiteEnabled,
  actionsDisabled = false
}: PopupStatusCardProps) {
  if (!qbConfigured) {
    return (
      <Card className="grid gap-4 p-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-zinc-900">请先配置 qBittorrent WebUI</h2>
          <p className="text-sm leading-6 text-zinc-500">
            完成连接设置后，即可在受支持页面直接批量提交到 qB。
          </p>
        </div>
        <Button disabled={actionsDisabled} type="button" onClick={onOpenGeneralOptions}>
          前往连接设置
        </Button>
      </Card>
    )
  }

  if (!activeTab.supported || !activeTab.sourceId) {
    return (
      <Card className="grid gap-3 p-4">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-amber-700">
          <HiOutlineExclamationTriangle aria-hidden="true" className="h-4 w-4" />
          <span>当前页面暂不支持批量下载</span>
        </div>
        <p className="text-sm leading-6 text-zinc-500">
          请打开受支持站点页面，或在设置中查看站点状态。
        </p>
      </Card>
    )
  }

  const siteMeta = POPUP_SUPPORTED_SITE_META[activeTab.sourceId]
  const enabled = activeTab.enabled
  const title = enabled
    ? "当前页面已就绪，可直接批量下载"
    : "当前页面站点已禁用，启用后可恢复批量下载"

  return (
    <Card className="grid gap-4 p-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
        <p className="text-sm leading-6 text-zinc-500">
          {siteMeta.displayName} ({siteMeta.url})
        </p>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-zinc-900">当前站点启用状态</p>
          <p className="text-xs text-zinc-500">{enabled ? "已启用" : "未启用"}</p>
        </div>
        <Switch
          aria-label="当前站点启用开关"
          checked={enabled}
          disabled={actionsDisabled}
          onCheckedChange={(checked) => {
            onToggleCurrentSiteEnabled(activeTab.sourceId as SourceId, checked)
          }}
        />
      </div>
    </Card>
  )
}
