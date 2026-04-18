import type { DeclarativeScanSchema } from "./types"
import type { SourceSubscriptionScanCandidate } from "../../sources/types"

/**
 * Generic declarative scanning engine for selector-driven sources.
 *
 * Sources like ACG.RIP can be scanned declaratively with just selectors
 * and extraction functions, without custom async logic.
 */
export async function runDeclarativeSubscriptionScan(
  schema: DeclarativeScanSchema
): Promise<SourceSubscriptionScanCandidate[]> {
  const listItems = Array.from(document.querySelectorAll<HTMLElement>(schema.listSelector))
  return listItems
    .map((item) => schema.extractCandidate(item))
    .filter((candidate): candidate is SourceSubscriptionScanCandidate => candidate !== null)
}