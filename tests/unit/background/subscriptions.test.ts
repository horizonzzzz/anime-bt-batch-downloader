import { describe, expect, it, vi } from "vitest"

import type { DownloaderAdapter, DownloaderTorrentFile } from "../../../src/lib/downloader"
import { DEFAULT_SETTINGS } from "../../../src/lib/settings/defaults"
import type {
  Settings,
  SubscriptionEntry,
  SubscriptionHitRecord,
  SubscriptionRuntimeState
} from "../../../src/lib/shared/types"
import {
  downloadSubscriptionHits,
  executeSubscriptionScan
} from "../../../src/lib/background/subscriptions"
import { createSubscriptionFingerprint } from "../../../src/lib/subscriptions"
import type { SubscriptionCandidate } from "../../../src/lib/subscriptions/types"
import {
  SUBSCRIPTION_ALARM_NAME,
  ensureSubscriptionAlarm
} from "../../../src/lib/subscriptions/scheduler"

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

function createDeferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

describe("subscription scheduler reconciliation", () => {
  it("creates the polling alarm when subscriptions are enabled and missing", async () => {
    const get = vi.fn().mockResolvedValue(undefined)
    const create = vi.fn().mockResolvedValue(undefined)
    const clear = vi.fn().mockResolvedValue(undefined)

    await ensureSubscriptionAlarm(
      createSettings({
        pollingIntervalMinutes: 45
      }),
      { get, create, clear }
    )

    expect(get).toHaveBeenCalledWith(SUBSCRIPTION_ALARM_NAME)
    expect(create).toHaveBeenCalledWith(SUBSCRIPTION_ALARM_NAME, {
      periodInMinutes: 45
    })
    expect(clear).not.toHaveBeenCalled()
  })

  it("clears the polling alarm when subscriptions are disabled", async () => {
    const get = vi.fn().mockResolvedValue({
      name: SUBSCRIPTION_ALARM_NAME,
      periodInMinutes: 30
    })
    const create = vi.fn().mockResolvedValue(undefined)
    const clear = vi.fn().mockResolvedValue(true)

    await ensureSubscriptionAlarm(
      createSettings({
        subscriptionsEnabled: false
      }),
      { get, create, clear }
    )

    expect(get).toHaveBeenCalledWith(SUBSCRIPTION_ALARM_NAME)
    expect(clear).toHaveBeenCalledWith(SUBSCRIPTION_ALARM_NAME)
    expect(create).not.toHaveBeenCalled()
  })
})

describe("downloadSubscriptionHits", () => {
  it("downloads retained notification-round hits and persists submission outcomes", async () => {
    const now = "2026-04-14T09:30:00.000Z"
    const savedSettings: { value: Settings | null } = { value: null }
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
            }),
            createHit({
              id: "hit-submitted",
              subscriptionId: "sub-1",
              sourceId: "bangumimoe",
              detailUrl: "https://bangumi.moe/torrent/102",
              magnetUrl: "magnet:?xt=urn:btih:BBB222",
              torrentUrl: "",
              downloadedAt: "2026-04-14T09:00:00.000Z",
              downloadStatus: "submitted"
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
          hitIds: ["hit-direct", "hit-duplicate", "hit-extract", "hit-submitted"]
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
    const saveSettings = vi.fn(async (nextSettings: Settings) => {
      savedSettings.value = nextSettings
      return nextSettings
    })
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

    await downloadSubscriptionHits(
      {
        roundId: "subscription-round:20260414093000000"
      },
      {
        getSettings: async () => settings,
        saveSettings,
        getDownloader: () => downloader,
        fetchTorrentForUpload,
        extractSingleItem,
        now: () => now
      }
    )

    expect(downloader.authenticate).toHaveBeenCalledTimes(1)
    expect(downloader.addUrls).toHaveBeenCalledWith(
      settings,
      ["magnet:?xt=urn:btih:AAA111"],
      undefined
    )
    expect(extractSingleItem).toHaveBeenCalledTimes(1)
    expect(fetchTorrentForUpload).toHaveBeenCalledWith("https://acg.rip/t/200.torrent")
    expect(downloader.addTorrentFiles).toHaveBeenCalledTimes(1)
    expect(saveSettings).toHaveBeenCalledTimes(1)
    expect(savedSettings.value?.subscriptionRuntimeStateById["sub-1"]?.recentHits).toEqual([
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
        id: "hit-submitted",
        downloadStatus: "submitted",
        downloadedAt: "2026-04-14T09:00:00.000Z"
      })
    ])
    expect(savedSettings.value?.subscriptionRuntimeStateById["sub-2"]?.recentHits).toEqual([
      expect.objectContaining({
        id: "hit-extract",
        downloadStatus: "submitted",
        downloadedAt: now
      })
    ])
  })

  it("throws a clear error when the requested notification round is missing", async () => {
    await expect(
      downloadSubscriptionHits(
        {
          roundId: "subscription-round:missing"
        },
        {
          getSettings: async () =>
            createSettings({
              subscriptions: [createSubscription()],
              subscriptionNotificationRounds: []
            })
        }
      )
    ).rejects.toThrow("Subscription notification round not found: subscription-round:missing")
  })

  it("serializes overlapping download requests so retained hits are not submitted twice", async () => {
    const now = "2026-04-14T10:00:00.000Z"
    const persisted: { current: Settings } = {
      current: createSettings({
        subscriptions: [
          createSubscription({
            sourceIds: ["bangumimoe"]
          })
        ],
        subscriptionRuntimeStateById: {
          "sub-1": createRuntimeState({
            recentHits: [
              createHit({
                id: "hit-1",
                sourceId: "bangumimoe",
                detailUrl: "https://bangumi.moe/torrent/100",
                magnetUrl: "magnet:?xt=urn:btih:AAA111",
                torrentUrl: ""
              })
            ]
          })
        },
        subscriptionNotificationRounds: [
          {
            id: "subscription-round:20260414100000000",
            createdAt: now,
            hitIds: ["hit-1"]
          }
        ]
      })
    }
    const authenticateGate = createDeferredPromise<void>()
    const getSettings = vi.fn(async () => persisted.current)
    const saveSettings = vi.fn(async (nextSettings: Settings) => {
      persisted.current = nextSettings
      return nextSettings
    })
    const downloader: DownloaderAdapter = {
      id: "qbittorrent",
      displayName: "qBittorrent",
      authenticate: vi.fn(async () => authenticateGate.promise),
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

    const firstDownload = downloadSubscriptionHits(
      { roundId: "subscription-round:20260414100000000" },
      {
        getSettings,
        saveSettings,
        getDownloader: () => downloader,
        now: () => now
      }
    )
    await Promise.resolve()

    const secondDownload = downloadSubscriptionHits(
      { roundId: "subscription-round:20260414100000000" },
      {
        getSettings,
        saveSettings,
        getDownloader: () => downloader,
        now: () => now
      }
    )

    expect(getSettings).toHaveBeenCalledTimes(1)
    expect(downloader.addUrls).not.toHaveBeenCalled()

    authenticateGate.resolve()

    const [, secondResult] = await Promise.all([firstDownload, secondDownload])

    expect(getSettings).toHaveBeenCalledTimes(2)
    expect(downloader.addUrls).toHaveBeenCalledTimes(1)
    expect(saveSettings).toHaveBeenCalledTimes(1)
    expect(secondResult.attemptedHits).toBe(0)
    expect(persisted.current.subscriptionRuntimeStateById["sub-1"]?.recentHits).toEqual([
      expect.objectContaining({
        id: "hit-1",
        downloadStatus: "submitted",
        downloadedAt: now
      })
    ])
  })
})

describe("executeSubscriptionScan", () => {
  it("creates one aggregated notification round with the retained hit ids", async () => {
    const now = "2026-04-14T08:00:00.000Z"
    const savedSettings: { value: Settings | null } = { value: null }
    const baseSettings = createSettings({
      subscriptions: [createSubscription()],
      subscriptionRuntimeStateById: {
        "sub-1": createRuntimeState({
          seenFingerprints: ["https://acg.rip/t/099.torrent"]
        })
      }
    })
    const createNotification = vi.fn().mockResolvedValue(undefined)
    const saveSettings = vi.fn(async (settings: Settings) => {
      savedSettings.value = settings
      return settings
    })

    const result = await executeSubscriptionScan({
      getSettings: async () => baseSettings,
      saveSettings,
      createNotification,
      now: () => now,
      scanCandidatesFromSource: vi.fn(async () => [
        createCandidate(),
        createCandidate({
          title: "[LoliHouse] Medalist - 02 [1080p]",
          normalizedTitle: "[lolihouse] medalist - 02 [1080p]",
          detailUrl: "https://acg.rip/t/101",
          torrentUrl: "https://acg.rip/t/101.torrent"
        })
      ])
    })

    expect(result.notificationRound).not.toBeNull()
    expect(result.notificationRound?.id.startsWith("subscription-round:")).toBe(true)
    expect(result.newHits).toHaveLength(2)
    expect(saveSettings).toHaveBeenCalledTimes(1)
    expect(savedSettings.value?.subscriptionNotificationRounds).toHaveLength(1)
    expect(savedSettings.value?.subscriptionNotificationRounds[0]?.hitIds).toEqual(
      savedSettings.value?.subscriptionRuntimeStateById["sub-1"]?.recentHits.map((hit) => hit.id)
    )
    expect(result.notificationRound?.hitIds).toEqual(
      savedSettings.value?.subscriptionNotificationRounds[0]?.hitIds
    )
    expect(createNotification).toHaveBeenCalledTimes(1)
    expect(createNotification.mock.calls[0]?.[0]).toBe(result.notificationRound?.id)
  })

  it("does not create a notification when a scan yields no new hits", async () => {
    const now = "2026-04-14T09:00:00.000Z"
    const candidate = createCandidate()
    const fingerprint = createSubscriptionFingerprint(candidate)
    const createNotification = vi.fn().mockResolvedValue(undefined)
    const saveSettings = vi.fn(async (settings: Settings) => settings)

    const result = await executeSubscriptionScan({
      getSettings: async () =>
        createSettings({
          subscriptions: [createSubscription()],
          subscriptionRuntimeStateById: {
            "sub-1": createRuntimeState({
              seenFingerprints: [fingerprint]
            })
          }
        }),
      saveSettings,
      createNotification,
      now: () => now,
      scanCandidatesFromSource: vi.fn(async () => [candidate])
    })

    expect(result.notificationRound).toBeNull()
    expect(result.newHits).toEqual([])
    expect(createNotification).not.toHaveBeenCalled()
    expect(saveSettings).toHaveBeenCalledTimes(1)
  })

  it("seeds first-scan matches conservatively without creating hits or notifications", async () => {
    const now = "2026-04-14T10:00:00.000Z"
    const candidate = createCandidate()
    const fingerprint = createSubscriptionFingerprint(candidate)
    const savedSettings: { value: Settings | null } = { value: null }
    const createNotification = vi.fn().mockResolvedValue(undefined)

    const result = await executeSubscriptionScan({
      getSettings: async () =>
        createSettings({
          subscriptions: [createSubscription()],
          subscriptionRuntimeStateById: {}
        }),
      saveSettings: async (settings: Settings) => {
        savedSettings.value = settings
        return settings
      },
      createNotification,
      now: () => now,
      scanCandidatesFromSource: vi.fn(async () => [candidate])
    })

    expect(result.notificationRound).toBeNull()
    expect(result.newHits).toEqual([])
    expect(savedSettings.value?.subscriptionRuntimeStateById["sub-1"]).toEqual(
      expect.objectContaining({
        lastScanAt: now,
        lastMatchedAt: now,
        lastError: "",
        seenFingerprints: [fingerprint],
        recentHits: []
      })
    )
    expect(createNotification).not.toHaveBeenCalled()
  })

  it("serializes overlapping scans so later runs see persisted results from earlier runs", async () => {
    const persisted: { current: Settings } = {
      current: createSettings({
        subscriptions: [createSubscription()],
        subscriptionRuntimeStateById: {
          "sub-1": createRuntimeState({
            seenFingerprints: ["https://acg.rip/t/099.torrent"]
          })
        }
      })
    }
    const firstScanBlocker = createDeferredPromise<SubscriptionCandidate[]>()
    const firstCandidate = createCandidate()
    const secondCandidate = createCandidate({
      title: "[LoliHouse] Medalist - 02 [1080p]",
      normalizedTitle: "[lolihouse] medalist - 02 [1080p]",
      detailUrl: "https://acg.rip/t/101",
      torrentUrl: "https://acg.rip/t/101.torrent"
    })
    const getSettings = vi.fn(async () => persisted.current)
    const saveSettings = vi.fn(async (settings: Settings) => {
      persisted.current = settings
      return settings
    })

    const firstExecution = executeSubscriptionScan({
      getSettings,
      saveSettings,
      createNotification: vi.fn().mockResolvedValue(undefined),
      now: () => "2026-04-14T11:00:00.000Z",
      scanCandidatesFromSource: vi.fn(async () => firstScanBlocker.promise)
    })
    await Promise.resolve()

    const secondExecution = executeSubscriptionScan({
      getSettings,
      saveSettings,
      createNotification: vi.fn().mockResolvedValue(undefined),
      now: () => "2026-04-14T12:00:00.000Z",
      scanCandidatesFromSource: vi.fn(async () => [secondCandidate])
    })

    expect(getSettings).toHaveBeenCalledTimes(1)

    firstScanBlocker.resolve([firstCandidate])

    await Promise.all([firstExecution, secondExecution])

    expect(getSettings).toHaveBeenCalledTimes(2)
    expect(persisted.current.subscriptionRuntimeStateById["sub-1"]?.recentHits).toHaveLength(2)
    expect(
      persisted.current.subscriptionRuntimeStateById["sub-1"]?.recentHits.map((hit) => hit.detailUrl)
    ).toEqual(["https://acg.rip/t/100", "https://acg.rip/t/101"])
    expect(persisted.current.subscriptionNotificationRounds).toHaveLength(2)
  })

  it("treats notification creation failures as non-fatal after settings are saved", async () => {
    const now = "2026-04-14T13:00:00.000Z"
    const savedSettings: { value: Settings | null } = { value: null }
    const saveSettings = vi.fn(async (settings: Settings) => {
      savedSettings.value = settings
      return settings
    })
    const createNotification = vi.fn().mockRejectedValue(new Error("notifications unavailable"))

    await expect(
      executeSubscriptionScan({
        getSettings: async () =>
          createSettings({
            subscriptions: [createSubscription()],
            subscriptionRuntimeStateById: {
              "sub-1": createRuntimeState({
                seenFingerprints: ["https://acg.rip/t/099.torrent"]
              })
            }
          }),
        saveSettings,
        createNotification,
        now: () => now,
        scanCandidatesFromSource: vi.fn(async () => [createCandidate()])
      })
    ).resolves.toEqual(
      expect.objectContaining({
        notificationRound: expect.objectContaining({
          id: expect.stringMatching(/^subscription-round:/)
        }),
        newHits: expect.arrayContaining([
          expect.objectContaining({
            detailUrl: "https://acg.rip/t/100"
          })
        ])
      })
    )

    expect(saveSettings).toHaveBeenCalledTimes(1)
    expect(savedSettings.value?.subscriptionNotificationRounds).toHaveLength(1)
    expect(createNotification).toHaveBeenCalledTimes(1)
  })
})
