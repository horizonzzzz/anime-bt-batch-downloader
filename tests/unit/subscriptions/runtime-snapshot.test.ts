import { describe, expect, it } from "vitest"

import type {
  Settings,
  SubscriptionEntry,
  SubscriptionHitRecord,
  SubscriptionRuntimeState
} from "../../../src/lib/shared/types"
import { DEFAULT_SETTINGS } from "../../../src/lib/settings/defaults"
import { reconcileSubscriptionRuntimeSnapshot } from "../../../src/lib/subscriptions/runtime-snapshot"

type RuntimeSnapshot = Pick<
  Settings,
  "lastSchedulerRunAt" | "subscriptionRuntimeStateById" | "subscriptionNotificationRounds"
>

function createSubscription(
  overrides: Partial<SubscriptionEntry> = {}
): SubscriptionEntry {
  return {
    id: "sub-1",
    name: "Medalist",
    enabled: true,
    sourceIds: ["acgrip"],
    multiSiteModeEnabled: false,
    titleQuery: "medalist",
    subgroupQuery: "",
    advanced: {
      must: [],
      any: []
    },
    deliveryMode: "direct-only",
    createdAt: "2026-04-01T00:00:00.000Z",
    baselineCreatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides
  }
}

function createHit(
  overrides: Partial<SubscriptionHitRecord> = {}
): SubscriptionHitRecord {
  return {
    id: "hit-1",
    subscriptionId: "sub-1",
    sourceId: "acgrip",
    title: "[LoliHouse] Medalist - 01 [1080p]",
    normalizedTitle: "[lolihouse] medalist - 01 [1080p]",
    subgroup: "LoliHouse",
    detailUrl: "https://acg.rip/t/100",
    magnetUrl: "magnet:?xt=urn:btih:AAA111",
    torrentUrl: "",
    discoveredAt: "2026-04-14T08:00:00.000Z",
    downloadedAt: null,
    downloadStatus: "idle",
    ...overrides
  }
}

function createRuntimeState(
  overrides: Partial<SubscriptionRuntimeState> = {}
): SubscriptionRuntimeState {
  return {
    lastScanAt: "2026-04-14T09:00:00.000Z",
    lastMatchedAt: "2026-04-14T09:00:00.000Z",
    lastError: "",
    seenFingerprints: ["fp-1"],
    recentHits: [createHit()],
    ...overrides
  }
}

function createSnapshot(overrides: Partial<RuntimeSnapshot> = {}): RuntimeSnapshot {
  return {
    lastSchedulerRunAt: "2026-04-14T09:30:00.000Z",
    subscriptionRuntimeStateById: {},
    subscriptionNotificationRounds: [],
    ...overrides
  }
}

describe("reconcileSubscriptionRuntimeSnapshot", () => {
  it("resets runtime state and removes retained notification hits when subscription behavior changes", () => {
    const previousSubscription = createSubscription()
    const nextSubscription = createSubscription({
      titleQuery: "bang dream"
    })
    const snapshot = createSnapshot({
      subscriptionRuntimeStateById: {
        "sub-1": createRuntimeState()
      },
      subscriptionNotificationRounds: [
        {
          id: "subscription-round:20260414093000000",
          createdAt: "2026-04-14T09:30:00.000Z",
          hitIds: ["hit-1"],
          hits: [createHit()]
        }
      ]
    })

    const reconciled = reconcileSubscriptionRuntimeSnapshot(
      snapshot,
      [previousSubscription],
      [nextSubscription]
    )

    expect(reconciled.lastSchedulerRunAt).toBe(snapshot.lastSchedulerRunAt)
    expect(reconciled.subscriptionRuntimeStateById["sub-1"]).toEqual({
      lastScanAt: null,
      lastMatchedAt: null,
      lastError: "",
      seenFingerprints: [],
      recentHits: []
    })
    expect(reconciled.subscriptionNotificationRounds).toEqual([])
  })

  it("keeps runtime state and retained notification hits when only the subscription name changes", () => {
    const previousSubscription = createSubscription()
    const nextSubscription = createSubscription({
      name: "Medalist Renamed"
    })
    const snapshot = createSnapshot({
      subscriptionRuntimeStateById: {
        "sub-1": createRuntimeState()
      },
      subscriptionNotificationRounds: [
        {
          id: "subscription-round:20260414093000000",
          createdAt: "2026-04-14T09:30:00.000Z",
          hitIds: ["hit-1"],
          hits: [createHit()]
        }
      ]
    })

    const reconciled = reconcileSubscriptionRuntimeSnapshot(
      snapshot,
      [previousSubscription],
      [nextSubscription]
    )

    expect(reconciled).toEqual(snapshot)
  })

  it("removes runtime state and retained notification hits when a subscription is deleted", () => {
    const snapshot = createSnapshot({
      subscriptionRuntimeStateById: {
        "sub-1": createRuntimeState()
      },
      subscriptionNotificationRounds: [
        {
          id: "subscription-round:20260414093000000",
          createdAt: "2026-04-14T09:30:00.000Z",
          hitIds: ["hit-1"],
          hits: [createHit()]
        },
        {
          id: "subscription-round:20260414100000000",
          createdAt: "2026-04-14T10:00:00.000Z",
          hitIds: ["hit-2"],
          hits: [
            createHit({
              id: "hit-2",
              subscriptionId: "sub-2"
            })
          ]
        }
      ]
    })

    const reconciled = reconcileSubscriptionRuntimeSnapshot(
      snapshot,
      [createSubscription()],
      [createSubscription({ id: "sub-2", name: "Keep", titleQuery: "keep" })]
    )

    expect(reconciled.subscriptionRuntimeStateById).toEqual({})
    expect(reconciled.subscriptionNotificationRounds).toEqual([
      expect.objectContaining({
        id: "subscription-round:20260414100000000",
        hitIds: ["hit-2"]
      })
    ])
  })

  it("resets runtime state when a subscription is disabled", () => {
    const snapshot = createSnapshot({
      subscriptionRuntimeStateById: {
        "sub-1": createRuntimeState()
      },
      subscriptionNotificationRounds: [
        {
          id: "subscription-round:20260414093000000",
          createdAt: "2026-04-14T09:30:00.000Z",
          hitIds: ["hit-1"],
          hits: [createHit()]
        }
      ]
    })

    const reconciled = reconcileSubscriptionRuntimeSnapshot(
      snapshot,
      [createSubscription()],
      [createSubscription({ enabled: false })]
    )

    expect(reconciled.subscriptionRuntimeStateById["sub-1"]).toEqual(
      DEFAULT_SETTINGS.subscriptionRuntimeStateById["sub-1"] ?? {
        lastScanAt: null,
        lastMatchedAt: null,
        lastError: "",
        seenFingerprints: [],
        recentHits: []
      }
    )
    expect(reconciled.subscriptionNotificationRounds).toEqual([])
  })
})
