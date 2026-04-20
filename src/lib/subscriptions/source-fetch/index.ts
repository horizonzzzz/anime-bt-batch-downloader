import type { SourceId } from "../../shared/types"
import { acgRipSubscriptionSourceFetcher } from "./acgrip"
import type { SubscriptionSourceFetcher } from "./types"

const fetcherRegistry: Partial<Record<SourceId, SubscriptionSourceFetcher>> = {
  acgrip: acgRipSubscriptionSourceFetcher
}

export function getSubscriptionSourceFetcherById(sourceId: SourceId): SubscriptionSourceFetcher | null {
  return fetcherRegistry[sourceId] ?? null
}
