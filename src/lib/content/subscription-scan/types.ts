import type { SourceId } from "../../shared/types"
import type { SourceSubscriptionScanCandidate } from "../../sources/types"

/**
 * Page-side scanner contract for subscription list scanning.
 *
 * These scanners run in the content script context (not injected scripts),
 * solving the ReferenceError bug where injected functions tried to access
 * module-scope imports.
 */
export type PageSubscriptionScanner = {
  sourceId: SourceId
  scan(): Promise<SourceSubscriptionScanCandidate[]>
}

/**
 * Declarative scan schema for simple selector-driven sources.
 *
 * Sources like ACG.RIP can be scanned declaratively with just selectors
 * and extraction functions, without custom async logic.
 */
export type DeclarativeScanSchema = {
  listSelector: string
  extractCandidate(item: HTMLElement): SourceSubscriptionScanCandidate | null
}