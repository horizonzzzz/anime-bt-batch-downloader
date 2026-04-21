import type { SubscriptionHitRecord } from "../shared/types"
import type { SubscriptionPolicyConfig } from "./policy/types"
import type { SourceConfig } from "../sources/config/types"
import { listSubscriptionHitsByIds } from "./hit-repository"
import {
  downloadPreparedSubscriptionHits,
  type SubscriptionNotificationDownloadDependencies
} from "./download-notification"

export type DownloadSubscriptionHitsByIdInput = {
  hitIds: string[]
  subscriptionPolicy: SubscriptionPolicyConfig
  sourceConfig: SourceConfig
}

export type DownloadSubscriptionHitsByIdResult = {
  attemptedHits: number
  submittedHits: number
  duplicateHits: number
  failedHits: number
}

export async function downloadSubscriptionHitsById(
  input: DownloadSubscriptionHitsByIdInput,
  dependencies: SubscriptionNotificationDownloadDependencies
): Promise<DownloadSubscriptionHitsByIdResult> {
  const hits = await listSubscriptionHitsByIds(input.hitIds)
  const actionableHits = hits.filter(
    (hit) => hit.downloadStatus !== "submitted" && hit.downloadStatus !== "duplicate"
  )

  const result = await downloadPreparedSubscriptionHits(
    {
      hits: actionableHits,
      subscriptionPolicy: input.subscriptionPolicy,
      sourceConfig: input.sourceConfig
    },
    dependencies
  )

  return {
    attemptedHits: result.attemptedHits,
    submittedHits: result.submittedCount,
    duplicateHits: result.duplicateCount,
    failedHits: result.failedCount
  }
}