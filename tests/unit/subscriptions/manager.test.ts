import { describe, expect, it, vi } from "vitest"

import type { DownloaderAdapter, DownloaderTorrentFile } from "../../../src/lib/downloader"
import { DEFAULT_SETTINGS } from "../../../src/lib/settings/defaults"
import type {
  Settings,
  SubscriptionEntry,
  SubscriptionHitRecord,
  SubscriptionRuntimeState
} from "../../../src/lib/shared/types"
import { SubscriptionManager } from "../../../src/lib/subscriptions"
import type { SubscriptionCandidate } from "../../../src/lib/subscriptions/types"

function createSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    ...DEFAULT_SETTINGS,
    subscriptionsEnabled: true,
    notificationsEnabled: true,
    subscriptions: [],
    subscriptionRuntimeStateById: {},
    subscriptionNotificationRounds: [],
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

function createRuntimeState(
  overrides: Partial<SubscriptionRuntimeState> = {}
): SubscriptionRuntimeState {
  return {
    lastScanAt: "2026-04-10T00:00:00.000Z",
    lastMatchedAt: null,
    lastError: "",
    seenFingerprints: [],
    recentHits: [],
    ...overrides
  }
}

function createHit(
  overrides: Partial<SubscriptionHitRecord> = {}
): SubscriptionHitRecord {
  return {
    id: "subscription-hit:sub-1:https%3A%2F%2Facg.rip%2Ft%2F100.torrent",
    subscriptionId: "sub-1",
    sourceId: "acgrip",
    title: "[LoliHouse] Medalist - 01 [1080p]",
    normalizedTitle: "[lolihouse] medalist - 01 [1080p]",
    subgroup: "",
    detailUrl: "https://acg.rip/t/100",
    magnetUrl: "",
    torrentUrl: "https://acg.rip/t/100.torrent",
    discoveredAt: "2026-04-14T08:00:00.000Z",
    downloadedAt: null,
    downloadStatus: "idle",
    ...overrides
  }
}

function createCandidate(
  overrides: Partial<SubscriptionCandidate> = {}
): SubscriptionCandidate {
  return {
    sourceId: "acgrip",
    title: "[LoliHouse] Medalist - 01 [1080p]",
    normalizedTitle: "[lolihouse] medalist - 01 [1080p]",
    detailUrl: "https://acg.rip/t/100",
    magnetUrl: "",
    torrentUrl: "https://acg.rip/t/100.torrent",
    subgroup: "",
    ...overrides
  }
}

describe("SubscriptionManager", () => {
  it("scans subscriptions and returns the updated runtime snapshot needed for persistence", async () => {
    const now = "2026-04-14T08:00:00.000Z"
    const baseSettings = createSettings({
      subscriptions: [createSubscription()],
      subscriptionRuntimeStateById: {
        "sub-1": createRuntimeState({
          seenFingerprints: ["https://acg.rip/t/099.torrent"]
        })
      }
    })

    const manager = new SubscriptionManager(baseSettings)
    const result = await manager.scan({
      now: () => now,
      scanCandidatesFromSource: vi.fn(async () => [createCandidate()])
    })

    expect(result.runtimeSnapshot).toEqual({
      lastSchedulerRunAt: now,
      subscriptionRuntimeStateById: result.settings.subscriptionRuntimeStateById,
      subscriptionNotificationRounds: result.settings.subscriptionNotificationRounds
    })
    expect(result.settings.lastSchedulerRunAt).toBe(now)
    expect(result.newHits).toHaveLength(1)
    expect(result.notificationRound).toEqual(
      expect.objectContaining({
        createdAt: now,
        hitIds: result.newHits.map((hit) => hit.id),
        hits: result.newHits
      })
    )
    expect(result.settings.subscriptionRuntimeStateById["sub-1"]).toEqual(
      expect.objectContaining({
        lastScanAt: now,
        lastMatchedAt: now,
        recentHits: [
          expect.objectContaining({
            detailUrl: "https://acg.rip/t/100",
            downloadStatus: "idle"
          })
        ]
      })
    )
  })

  it("downloads retained notification hits and updates runtime plus retained round hits together", async () => {
    const now = "2026-04-14T09:30:00.000Z"
    const settings = createSettings({
      subscriptions: [
        createSubscription({
          id: "sub-1",
          sourceIds: ["bangumimoe"],
          deliveryMode: "direct-only"
        }),
        createSubscription({
          id: "sub-2",
          sourceIds: ["acgrip"],
          deliveryMode: "allow-detail-extraction"
        })
      ],
      subscriptionRuntimeStateById: {
        "sub-1": createRuntimeState({
          recentHits: [
            createHit({
              id: "hit-direct",
              subscriptionId: "sub-1",
              sourceId: "bangumimoe",
              detailUrl: "https://bangumi.moe/torrent/100",
              magnetUrl: "magnet:?xt=urn:btih:AAA111",
              torrentUrl: ""
            }),
            createHit({
              id: "hit-duplicate",
              subscriptionId: "sub-1",
              sourceId: "bangumimoe",
              detailUrl: "https://bangumi.moe/torrent/101",
              magnetUrl: "magnet:?xt=urn:btih:AAA111",
              torrentUrl: ""
            })
          ]
        }),
        "sub-2": createRuntimeState({
          recentHits: [
            createHit({
              id: "hit-extract",
              subscriptionId: "sub-2",
              sourceId: "acgrip",
              detailUrl: "https://acg.rip/t/200",
              magnetUrl: "",
              torrentUrl: ""
            })
          ]
        })
      },
      subscriptionNotificationRounds: [
        {
          id: "subscription-round:20260414093000000",
          createdAt: now,
          hitIds: ["hit-direct", "hit-duplicate", "hit-extract"]
        }
      ]
    })
    const downloader: DownloaderAdapter = {
      id: "qbittorrent",
      displayName: "qBittorrent",
      authenticate: vi.fn(async () => undefined),
      addUrls: vi.fn(async () => ({
        entries: [
          {
            url: "magnet:?xt=urn:btih:AAA111",
            status: "submitted" as const
          }
        ]
      })),
      addTorrentFiles: vi.fn(async () => undefined),
      testConnection: vi.fn(async () => ({
        baseUrl: "http://localhost:8080",
        version: "5.0.0"
      }))
    }
    const fetchTorrentForUpload = vi.fn(
      async (): Promise<DownloaderTorrentFile> => ({
        filename: "medalist-02.torrent",
        blob: new Blob(["torrent"])
      })
    )
    const extractSingleItem = vi.fn(async () => ({
      ok: true as const,
      title: "[LoliHouse] Medalist - 02 [1080p]",
      detailUrl: "https://acg.rip/t/200",
      hash: "",
      magnetUrl: "",
      torrentUrl: "https://acg.rip/t/200.torrent",
      failureReason: ""
    }))

    const manager = new SubscriptionManager(settings)
    const result = await manager.downloadFromNotification(
      { roundId: "subscription-round:20260414093000000" },
      {
        downloader,
        fetchTorrentForUpload,
        extractSingleItem,
        now: () => now
      }
    )

    expect(result.runtimeSnapshot).toEqual({
      subscriptionRuntimeStateById: result.settings.subscriptionRuntimeStateById,
      lastSchedulerRunAt: result.settings.lastSchedulerRunAt,
      subscriptionNotificationRounds: result.settings.subscriptionNotificationRounds
    })
    expect(result.attemptedHits).toBe(3)
    expect(result.submittedCount).toBe(2)
    expect(result.duplicateCount).toBe(1)
    expect(result.failedCount).toBe(0)
    expect(downloader.authenticate).toHaveBeenCalledTimes(1)
    expect(downloader.addUrls).toHaveBeenCalledWith(
      settings,
      ["magnet:?xt=urn:btih:AAA111"],
      undefined
    )
    expect(fetchTorrentForUpload).toHaveBeenCalledWith("https://acg.rip/t/200.torrent")
    expect(result.settings.subscriptionRuntimeStateById["sub-1"]?.recentHits).toEqual([
      expect.objectContaining({
        id: "hit-direct",
        downloadStatus: "submitted",
        downloadedAt: now
      }),
      expect.objectContaining({
        id: "hit-duplicate",
        downloadStatus: "duplicate",
        downloadedAt: now
      })
    ])
    expect(result.settings.subscriptionRuntimeStateById["sub-2"]?.recentHits).toEqual([
      expect.objectContaining({
        id: "hit-extract",
        downloadStatus: "submitted",
        downloadedAt: now
      })
    ])
    expect(result.settings.subscriptionNotificationRounds).toEqual([
      expect.objectContaining({
        id: "subscription-round:20260414093000000",
        hitIds: ["hit-direct", "hit-duplicate", "hit-extract"],
        hits: [
          expect.objectContaining({
            id: "hit-direct",
            downloadStatus: "submitted",
            downloadedAt: now
          }),
          expect.objectContaining({
            id: "hit-duplicate",
            downloadStatus: "duplicate",
            downloadedAt: now
          }),
          expect.objectContaining({
            id: "hit-extract",
            downloadStatus: "submitted",
            downloadedAt: now
          })
        ]
      })
    ])
  })

  it("reconciles runtime state after subscription edits without touching unrelated settings", () => {
    const settings = createSettings({
      currentDownloaderId: "transmission",
      subscriptions: [createSubscription()],
      subscriptionRuntimeStateById: {
        "sub-1": createRuntimeState({
          seenFingerprints: ["fp-1"],
          recentHits: [createHit({ id: "hit-1" })]
        })
      },
      subscriptionNotificationRounds: [
        {
          id: "subscription-round:20260414093000000",
          createdAt: "2026-04-14T09:30:00.000Z",
          hitIds: ["hit-1"],
          hits: [createHit({ id: "hit-1" })]
        }
      ]
    })

    const manager = new SubscriptionManager(settings)
    const nextSettings = manager.reconcileAfterEdit(
      settings.subscriptions,
      [
        createSubscription({
          titleQuery: "bang dream"
        })
      ]
    )

    expect(nextSettings.currentDownloaderId).toBe("transmission")
    expect(nextSettings.subscriptionRuntimeStateById["sub-1"]).toEqual({
      lastScanAt: null,
      lastMatchedAt: null,
      lastError: "",
      seenFingerprints: [],
      recentHits: []
    })
    expect(nextSettings.subscriptionNotificationRounds).toEqual([])
  })

  it("reconciles edits from an injected runtime snapshot boundary instead of ad hoc settings reads", () => {
    const settings = createSettings({
      subscriptions: [createSubscription()],
      subscriptionRuntimeStateById: {}
    })
    const runtimeBackfill = {
      lastSchedulerRunAt: "2026-04-14T09:30:00.000Z",
      subscriptionRuntimeStateById: {
        "sub-1": createRuntimeState({
          seenFingerprints: ["fp-1"],
          recentHits: [createHit({ id: "hit-1" })]
        })
      },
      subscriptionNotificationRounds: [
        {
          id: "subscription-round:20260414093000000",
          createdAt: "2026-04-14T09:30:00.000Z",
          hitIds: ["hit-1"],
          hits: [createHit({ id: "hit-1" })]
        }
      ]
    }

    const manager = new SubscriptionManager(settings, runtimeBackfill)
    const patch = manager.reconcileAfterEditPatch(settings.subscriptions, [
      createSubscription({
        titleQuery: "bang dream"
      })
    ])

    expect(patch).toEqual({
      subscriptionRuntimeStateById: {
        "sub-1": {
          lastScanAt: null,
          lastMatchedAt: null,
          lastError: "",
          seenFingerprints: [],
          recentHits: []
        }
      },
      subscriptionNotificationRounds: []
    })
  })
})
