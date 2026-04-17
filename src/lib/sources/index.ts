import type { SourceId } from "../shared/types"
import { acgRipSourceAdapter } from "./acgrip"
import { bangumiMoeSourceAdapter } from "./bangumimoe"
import { dongmanhuayuanSourceAdapter } from "./dongmanhuayuan"
import { kisssubSourceAdapter } from "./kisssub"
import type { SourceAdapter } from "./types"

const sourceAdapters: SourceAdapter[] = [
  kisssubSourceAdapter,
  dongmanhuayuanSourceAdapter,
  acgRipSourceAdapter,
  bangumiMoeSourceAdapter
]

export function getSourceAdapters(): SourceAdapter[] {
  return sourceAdapters.slice()
}

export function getSourceAdapterById(id: SourceId): SourceAdapter | null {
  return sourceAdapters.find((adapter) => adapter.id === id) ?? null
}

export function getSubscriptionCapableSourceAdapterById(id: SourceId): SourceAdapter | null {
  const adapter = getSourceAdapterById(id)
  if (!adapter?.subscriptionListScan) {
    return null
  }

  return adapter
}

export function getSubscriptionScanSourceAdapterById(id: SourceId): SourceAdapter | null {
  return getSubscriptionCapableSourceAdapterById(id)
}

export function getSourceAdapterForPage(url: URL): SourceAdapter | null {
  return sourceAdapters.find((adapter) => adapter.matchesListPage(url)) ?? null
}

export function getSourceAdapterForDetailUrl(url: URL): SourceAdapter | null {
  return sourceAdapters.find((adapter) => adapter.matchesDetailUrl(url)) ?? null
}
