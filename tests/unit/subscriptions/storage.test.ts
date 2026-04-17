import { describe, expect, it } from "vitest"

import { DEFAULT_SETTINGS } from "../../../src/lib/settings/defaults"
import type {
  Settings,
  SubscriptionEntry,
  SubscriptionHitRecord,
  SubscriptionRuntimeState
} from "../../../src/lib/shared/types"
import {
  duplicateSubscription,
  readSubscriptionRuntimeState,
  updateSubscriptionRuntimeState
} from "../../../src/lib/subscriptions/storage"

function createSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    ...DEFAULT_SETTINGS,
    subscriptionRuntimeStateById: {},
    ...overrides
  }
}

function createHit(
  overrides: Partial<SubscriptionHitRecord> = {}
): SubscriptionHitRecord {
  return {
    id: "hit-1",
    subscriptionId: "sub-1",
    sourceId: "kisssub",
    title: "Episode 01",
    normalizedTitle: "episode 01",
    subgroup: "",
    detailUrl: "https://example.com/detail/1",
    magnetUrl: "magnet:?xt=urn:btih:111",
    torrentUrl: "",
    discoveredAt: "2026-04-13T00:00:00.000Z",
    downloadedAt: null,
    downloadStatus: "idle",
    ...overrides
  }
}

function createRuntimeState(
  overrides: Partial<SubscriptionRuntimeState> = {}
): SubscriptionRuntimeState {
  return {
    lastScanAt: "2026-04-13T00:00:00.000Z",
    lastMatchedAt: null,
    lastError: "",
    seenFingerprints: ["fp-initial"],
    recentHits: [createHit()],
    ...overrides
  }
}

function createSubscription(
  overrides: Partial<SubscriptionEntry> = {}
): SubscriptionEntry {
  return {
    id: "sub-1",
    name: "Medalist",
    enabled: true,
    sourceIds: ["kisssub"],
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

describe("subscription storage helpers", () => {
  it("returns an empty runtime state when the subscription runtime state is missing", () => {
    const state = readSubscriptionRuntimeState(
      createSettings({
        subscriptionRuntimeStateById: {}
      }),
      "sub-missing"
    )

    expect(state).toEqual({
      lastScanAt: null,
      lastMatchedAt: null,
      lastError: "",
      seenFingerprints: [],
      recentHits: []
    })
  })

  it("merges partial runtime state updates and retains seen fingerprints/recent hits caps", () => {
    const settings = createSettings({
      subscriptions: [createSubscription({ id: "sub-1" })],
      subscriptionRuntimeStateById: {
        "sub-1": createRuntimeState({
          lastScanAt: "2026-04-10T00:00:00.000Z",
          seenFingerprints: ["fp-old"],
          recentHits: [createHit({ id: "hit-old" })]
        })
      }
    })
    const seenFingerprints = Array.from({ length: 250 }, (_, index) => `fp-${index}`)
    const recentHits = Array.from({ length: 25 }, (_, index) =>
      createHit({
        id: `hit-${index}`,
        normalizedTitle: `episode ${index}`
      })
    )

    const nextSettings = updateSubscriptionRuntimeState(settings, "sub-1", {
      lastError: " fetch failed ",
      seenFingerprints,
      recentHits
    })
    const state = nextSettings.subscriptionRuntimeStateById["sub-1"]

    expect(state).toEqual(
      expect.objectContaining({
        lastScanAt: "2026-04-10T00:00:00.000Z",
        lastError: "fetch failed"
      })
    )
    expect(state?.seenFingerprints).toHaveLength(200)
    expect(state?.seenFingerprints[0]).toBe("fp-50")
    expect(state?.seenFingerprints.at(-1)).toBe("fp-249")
    expect(state?.recentHits).toHaveLength(20)
    expect(state?.recentHits[0]?.id).toBe("hit-5")
    expect(state?.recentHits.at(-1)?.id).toBe("hit-24")
  })

  it("does not create orphan runtime state for an unknown subscription id", () => {
    const settings = createSettings({
      subscriptions: [createSubscription({ id: "sub-1" })]
    })

    const nextSettings = updateSubscriptionRuntimeState(settings, "sub-missing", {
      lastError: "should not persist"
    })

    expect(nextSettings).toEqual(settings)
  })

  it("duplicates a subscription with a fresh id, createdAt, and baselineCreatedAt", () => {
    const now = "2026-05-01T00:00:00.000Z"
    const original = createSubscription({
      sourceIds: ["kisssub", "bangumimoe"],
      advanced: {
        must: [
          {
            id: "condition-1",
            field: "title",
            operator: "contains",
            value: "medalist"
          }
        ],
        any: []
      }
    })
    const duplicated = duplicateSubscription(original, {
      now
    })

    expect(duplicated.id).not.toBe("sub-1")
    expect(duplicated.createdAt).toBe(now)
    expect(duplicated.baselineCreatedAt).toBe(now)
    expect(duplicated.name).toBe("Medalist")

    duplicated.sourceIds.push("acgrip")
    duplicated.advanced.must[0]!.value = "frieren"

    expect(original.sourceIds).toEqual(["kisssub", "bangumimoe"])
    expect(original.advanced.must[0]?.value).toBe("medalist")
  })

  it("uses enough timestamp precision to avoid duplicate ids within the same second", () => {
    const duplicated = duplicateSubscription(createSubscription(), {
      now: "2026-05-01T00:00:00.123Z"
    })

    expect(duplicated.id).toBe("sub-1-copy-20260501000000123")
  })

  it("normalizes malformed recent hits when reading or updating runtime state", () => {
    const malformedSettings = createSettings({
      subscriptionRuntimeStateById: {
        "sub-1": {
          lastScanAt: " 2026-04-10T00:00:00.000Z ",
          lastMatchedAt: null,
          lastError: " timeout ",
          seenFingerprints: [" fp-1 "],
          recentHits: [
            {
              id: " hit-1 ",
              subscriptionId: " sub-1 ",
              sourceId: "KISSSUB",
              title: " Episode 01 ",
              normalizedTitle: " episode 01 ",
              subgroup: " 爱恋字幕社 ",
              detailUrl: " https://example.com/detail/1 ",
              magnetUrl: " magnet:?xt=urn:btih:111 ",
              torrentUrl: "",
              discoveredAt: " 2026-04-13T00:00:00.000Z ",
              downloadedAt: null,
              downloadStatus: "submitted"
            },
            {
              id: "",
              subscriptionId: "sub-1",
              sourceId: "kisssub",
              title: "Broken",
              normalizedTitle: "broken",
              subgroup: "",
              detailUrl: "",
              magnetUrl: "",
              torrentUrl: "",
              discoveredAt: "",
              downloadedAt: null,
              downloadStatus: "idle"
            }
          ]
        } as unknown as SubscriptionRuntimeState
      }
    })

    expect(readSubscriptionRuntimeState(malformedSettings, "sub-1")).toEqual({
      lastScanAt: "2026-04-10T00:00:00.000Z",
      lastMatchedAt: null,
      lastError: "timeout",
      seenFingerprints: ["fp-1"],
      recentHits: [
        expect.objectContaining({
          id: "hit-1",
          subscriptionId: "sub-1",
          sourceId: "kisssub",
          title: "Episode 01",
          normalizedTitle: "episode 01",
          subgroup: "爱恋字幕社",
          detailUrl: "https://example.com/detail/1",
          magnetUrl: "magnet:?xt=urn:btih:111",
          downloadStatus: "submitted"
        })
      ]
    })

    const updated = updateSubscriptionRuntimeState(createSettings({
      subscriptions: [createSubscription({ id: "sub-1" })]
    }), "sub-1", {
      recentHits: [
        {
          id: " hit-2 ",
          subscriptionId: " sub-1 ",
          sourceId: "bangumimoe",
          title: " Episode 02 ",
          normalizedTitle: " episode 02 ",
          subgroup: "",
          detailUrl: " https://example.com/detail/2 ",
          magnetUrl: "",
          torrentUrl: " https://example.com/2.torrent ",
          discoveredAt: " 2026-04-13T01:00:00.000Z ",
          downloadedAt: " 2026-04-13T01:10:00.000Z ",
          downloadStatus: "duplicate"
        },
        {
          id: "hit-other",
          subscriptionId: "sub-other",
          sourceId: "bangumimoe",
          title: "Other",
          normalizedTitle: "other",
          subgroup: "",
          detailUrl: "https://example.com/detail/other",
          magnetUrl: "",
          torrentUrl: "",
          discoveredAt: "2026-04-13T01:00:00.000Z",
          downloadedAt: null,
          downloadStatus: "idle"
        },
        {
          id: "",
          subscriptionId: "sub-1",
          sourceId: "bangumimoe",
          title: "Broken",
          normalizedTitle: "",
          subgroup: "",
          detailUrl: "",
          magnetUrl: "",
          torrentUrl: "",
          discoveredAt: "",
          downloadedAt: null,
          downloadStatus: "idle"
        }
      ] as unknown as SubscriptionHitRecord[]
    })

    expect(updated.subscriptionRuntimeStateById["sub-1"]?.recentHits).toEqual([
      expect.objectContaining({
        id: "hit-2",
        subscriptionId: "sub-1",
        sourceId: "bangumimoe",
        title: "Episode 02",
        normalizedTitle: "episode 02",
        detailUrl: "https://example.com/detail/2",
        torrentUrl: "https://example.com/2.torrent",
        discoveredAt: "2026-04-13T01:00:00.000Z",
        downloadedAt: "2026-04-13T01:10:00.000Z",
        downloadStatus: "duplicate"
      })
    ])
  })
})
