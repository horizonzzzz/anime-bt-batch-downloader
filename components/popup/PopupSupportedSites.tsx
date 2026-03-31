import { POPUP_SUPPORTED_SITE_IDS, POPUP_SUPPORTED_SITE_META, type PopupStateViewModel } from "../../lib/shared/popup"
import { Badge, Card } from "../ui"

type PopupSupportedSitesProps = {
  supportedSites: PopupStateViewModel["supportedSites"]
}

function toSiteHref(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }

  return `https://${url}`
}

export function PopupSupportedSites({ supportedSites }: PopupSupportedSitesProps) {
  const supportedSiteLookup = new Map(supportedSites.map((site) => [site.id, site]))

  return (
    <Card className="grid gap-3 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">受支持站点</p>
        <p className="text-xs text-zinc-500">{POPUP_SUPPORTED_SITE_IDS.length} 个</p>
      </div>
      <ul className="grid gap-2">
        {POPUP_SUPPORTED_SITE_IDS.map((sourceId) => {
          const siteMeta = POPUP_SUPPORTED_SITE_META[sourceId]
          const siteState = supportedSiteLookup.get(sourceId)

          return (
            <li
              key={sourceId}
              className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-2.5 py-2">
              <div className="min-w-0">
                <a
                  aria-label={siteMeta.displayName}
                  className="truncate text-sm font-medium text-zinc-900 underline-offset-2 hover:text-blue-700 hover:underline"
                  href={toSiteHref(siteMeta.url)}
                  rel="noreferrer"
                  target="_blank">
                  {siteMeta.displayName}
                </a>
                <p className="truncate text-xs text-zinc-500">{siteMeta.url}</p>
              </div>
              <Badge variant={siteState?.enabled ? "success" : "muted"}>
                {siteState?.enabled ? "已启用" : "未启用"}
              </Badge>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
