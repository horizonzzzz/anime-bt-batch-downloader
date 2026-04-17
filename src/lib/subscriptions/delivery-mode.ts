import type { SourceId, SubscriptionDeliveryMode } from "../shared/types"

const DETAIL_EXTRACTION_REQUIRED_SOURCES = new Set<SourceId>(["bangumimoe"])

export function requiresSubscriptionDetailExtraction(sourceIds: SourceId[]): boolean {
  return sourceIds.some((sourceId) => DETAIL_EXTRACTION_REQUIRED_SOURCES.has(sourceId))
}

export function resolveSubscriptionDeliveryMode(
  sourceIds: SourceId[],
  requested: SubscriptionDeliveryMode
): SubscriptionDeliveryMode {
  if (requiresSubscriptionDetailExtraction(sourceIds)) {
    return "allow-detail-extraction"
  }

  return requested
}

export function getDefaultSubscriptionDeliveryMode(
  sourceIds: SourceId[]
): SubscriptionDeliveryMode {
  return resolveSubscriptionDeliveryMode(sourceIds, "direct-only")
}
