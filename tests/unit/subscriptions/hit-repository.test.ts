import { beforeEach, describe, expect, it } from "vitest"

import { resetSubscriptionDb, subscriptionDb } from "../../../src/lib/subscriptions"
import {
  createSubscriptionHitId,
  getSubscriptionHitById,
  listSubscriptionHits,
  listSubscriptionHitsByIds,
  listSubscriptionHitsBySubscriptionId,
  upsertSubscriptionHits
} from "../../../src/lib/subscriptions/hit-repository"

describe("subscription hit repository", () => {
  beforeEach(async () => {
    await resetSubscriptionDb()
  })

  it("persists hit rows with read and resolution state", async () => {
    const hitId = createSubscriptionHitId("sub-1", "fp-1")

    await upsertSubscriptionHits([
      {
        id: hitId,
        subscriptionId: "sub-1",
        sourceId: "acgrip",
        title: "[LoliHouse] Medalist - 01 [1080p]",
        normalizedTitle: "[lolihouse] medalist - 01 [1080p]",
        subgroup: "LoliHouse",
        detailUrl: "https://acg.rip/t/100",
        magnetUrl: "magnet:?xt=urn:btih:AAA111",
        torrentUrl: "",
        discoveredAt: "2026-04-21T08:00:00.000Z",
        downloadedAt: null,
        downloadStatus: "idle",
        readAt: null,
        resolvedAt: null
      }
    ])

    await expect(getSubscriptionHitById(hitId)).resolves.toEqual(
      expect.objectContaining({
        id: hitId,
        readAt: null,
        resolvedAt: null
      })
    )

    await expect(listSubscriptionHitsBySubscriptionId("sub-1")).resolves.toEqual([
      expect.objectContaining({ id: hitId })
    ])
    await expect(listSubscriptionHitsByIds([hitId])).resolves.toEqual([
      expect.objectContaining({ id: hitId })
    ])
    await expect(listSubscriptionHits()).resolves.toEqual([
      expect.objectContaining({ id: hitId })
    ])
    await expect(subscriptionDb.subscriptionHits.count()).resolves.toBe(1)
  })
})