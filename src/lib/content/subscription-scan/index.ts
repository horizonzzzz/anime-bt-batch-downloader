import type { PageSubscriptionScanner, DeclarativeScanSchema } from "./types"
import type { SourceId } from "../../shared/types"

import { createAcgRipScanner } from "./acgrip"
import { createBangumiMoeScanner } from "./bangumimoe"

/**
 * Registry of page-side subscription scanners.
 *
 * Maps sourceId to scanner implementations that run in content script context.
 * Uses Partial because not all sources are supported - unsupported sources return null.
 */
const scannerRegistry: Partial<Record<SourceId, PageSubscriptionScanner>> = {
  acgrip: createAcgRipScanner(),
  bangumimoe: createBangumiMoeScanner()
}

/**
 * Get the page-side scanner for a source, if supported.
 */
export function getPageSubscriptionScanner(sourceId: SourceId): PageSubscriptionScanner | null {
  return scannerRegistry[sourceId] ?? null
}

// Re-export types for convenience
export type { PageSubscriptionScanner, DeclarativeScanSchema } from "./types"