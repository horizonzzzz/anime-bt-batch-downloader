import { describe, expect, it } from "vitest"

import { DEFAULT_SETTINGS, sanitizeSettings } from "../../../src/lib/settings"

describe("sanitizeSettings", () => {
  it("uses 3 as the default concurrency and retry count", () => {
    expect(sanitizeSettings({})).toMatchObject({
      concurrency: 3,
      retryCount: 3
    })
  })

  it("uses defaults and normalizes the base url", () => {
    expect(
      sanitizeSettings({
        downloaders: {
          qbittorrent: {
            baseUrl: " http://127.0.0.1:17474/// ",
            username: " admin ",
            password: "123456"
          }
        }
      })
    ).toEqual({
      ...DEFAULT_SETTINGS,
      downloaders: {
        ...DEFAULT_SETTINGS.downloaders,
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: "123456"
        }
      }
    })
  })

  it("hydrates transmission settings and normalizes its base url", () => {
    expect(
      sanitizeSettings({
        currentDownloaderId: "transmission",
        downloaders: {
          transmission: {
            baseUrl: " http://127.0.0.1:9091/transmission/rpc/// ",
            username: " admin ",
            password: "secret"
          }
        }
      })
    ).toMatchObject({
      currentDownloaderId: "transmission",
      downloaders: {
        qbittorrent: DEFAULT_SETTINGS.downloaders.qbittorrent,
        transmission: {
          baseUrl: "http://127.0.0.1:9091/transmission/rpc",
          username: "admin",
          password: "secret"
        }
      }
    })
  })

  it("normalizes per-source delivery modes and falls back to source defaults", () => {
    expect(
      sanitizeSettings({
        sourceDeliveryModes: {
          kisssub: "torrent-file",
          dongmanhuayuan: "torrent-file",
          acgrip: "magnet",
          bangumimoe: "torrent-file"
        }
      })
    ).toMatchObject({
      sourceDeliveryModes: {
        kisssub: "torrent-file",
        dongmanhuayuan: "magnet",
        acgrip: "torrent-file",
        bangumimoe: "torrent-file"
      }
    })
  })

  it("defaults every source to enabled", () => {
    expect(sanitizeSettings({}).enabledSources).toEqual({
      kisssub: true,
      dongmanhuayuan: true,
      acgrip: true,
      bangumimoe: true
    })
  })

  it("keeps all sources enabled when older settings omit enabledSources", () => {
    expect(
      sanitizeSettings({
        downloaders: {
          qbittorrent: {
            baseUrl: "http://127.0.0.1:17474",
            username: "admin"
          }
        }
      }).enabledSources
    ).toEqual({
      kisssub: true,
      dongmanhuayuan: true,
      acgrip: true,
      bangumimoe: true
    })
  })

  it("normalizes per-source enablement and falls back to defaults for invalid values", () => {
    expect(
      sanitizeSettings({
        enabledSources: {
          kisssub: false,
          dongmanhuayuan: "false",
          acgrip: null,
          bangumimoe: true
        } as never
      }).enabledSources
    ).toEqual({
      kisssub: false,
      dongmanhuayuan: true,
      acgrip: true,
      bangumimoe: true
    })
  })

  it("clamps numeric settings to the existing limits", () => {
    expect(
      sanitizeSettings({
        concurrency: 99,
        injectTimeoutMs: 1,
        domSettleMs: 99999,
        retryCount: -5
      })
    ).toMatchObject({
      concurrency: 5,
      injectTimeoutMs: 3000,
      domSettleMs: 10000,
      retryCount: 0
    })
  })

  it("normalizes and keeps the last used save path", () => {
    expect(
      sanitizeSettings({
        lastSavePath: "  D:\\Downloads\\Anime  "
      })
    ).toMatchObject({
      lastSavePath: "D:\\Downloads\\Anime"
    })
  })

  it("defaults filters to an empty array", () => {
    expect(sanitizeSettings({}).filters).toEqual([])
  })

  it("normalizes filters and trims valid nested fields", () => {
    expect(
      sanitizeSettings({
        filters: [
          {
            id: " filter-1 ",
            name: " 爱恋 1080 简繁 ",
            enabled: true,
            must: [
              {
                id: " condition-1 ",
                field: "subgroup",
                operator: "contains",
                value: " 爱恋字幕社 "
              },
              {
                id: " condition-2 ",
                field: "title",
                operator: "contains",
                value: " 1080 "
              }
            ],
            any: [
              {
                id: " condition-3 ",
                field: "title",
                operator: "contains",
                value: " 简 "
              },
              {
                id: " condition-4 ",
                field: "title",
                operator: "contains",
                value: " 繁 "
              }
            ]
          }
        ]
      }).filters
    ).toEqual([
      {
        id: "filter-1",
        name: "爱恋 1080 简繁",
        enabled: true,
        sourceIds: ["kisssub", "dongmanhuayuan", "acgrip", "bangumimoe"],
        must: [
          {
            id: "condition-1",
            field: "subgroup",
            operator: "contains",
            value: "爱恋字幕社"
          },
          {
            id: "condition-2",
            field: "title",
            operator: "contains",
            value: "1080"
          }
        ],
        any: [
          {
            id: "condition-3",
            field: "title",
            operator: "contains",
            value: "简"
          },
          {
            id: "condition-4",
            field: "title",
            operator: "contains",
            value: "繁"
          }
        ]
      }
    ])
  })

  it("drops invalid filters and conditions during sanitization", () => {
    expect(
      sanitizeSettings({
        filters: [
          {
            id: "filter-valid",
            name: "保留 Kisssub 1080",
            enabled: true,
            must: [
              {
                id: "condition-valid",
                field: "source",
                operator: "is",
                value: "kisssub"
              }
            ],
            any: [
              {
                id: "condition-any",
                field: "title",
                operator: "contains",
                value: "1080p"
              }
            ]
          },
          {
            id: "filter-invalid",
            name: "空筛选器",
            enabled: true,
            must: [],
            any: []
          }
        ]
      }).filters
    ).toEqual([])
  })

  it("normalizes filter enabled flags through the shared boolean path", () => {
    expect(
      sanitizeSettings({
        filters: [
          {
            id: "filter-disabled",
            name: "字符串 false",
            enabled: "false",
            must: [
              {
                id: "condition-title",
                field: "title",
                operator: "contains",
                value: "1080"
              }
            ],
            any: []
          }
        ]
      }).filters
    ).toEqual([
      {
        id: "filter-disabled",
        name: "字符串 false",
        enabled: false,
        sourceIds: ["kisssub", "dongmanhuayuan", "acgrip", "bangumimoe"],
        must: [
          {
            id: "condition-title",
            field: "title",
            operator: "contains",
            value: "1080"
          }
        ],
        any: []
      }
    ])
  })

  it("drops subscriptions without any valid source ids instead of broadening them to all sites", () => {
    expect(
      sanitizeSettings({
        subscriptions: [
          {
            id: "sub-invalid",
            name: "Invalid scope",
            enabled: true,
            sourceIds: ["invalid-source"],
            multiSiteModeEnabled: false,
            titleQuery: "Medalist",
            subgroupQuery: "",
            advanced: {
              must: [],
              any: []
            },
            deliveryMode: "invalid-mode",
            createdAt: "2026-04-13T00:00:00.000Z",
            baselineCreatedAt: "2026-04-13T00:00:00.000Z"
          }
        ]
      } as never).subscriptions
    ).toEqual([])
  })

  it("prunes runtime state entries for subscriptions dropped during sanitization", () => {
    expect(
      sanitizeSettings({
        subscriptions: [
          {
            id: "sub-invalid",
            name: "Invalid scope",
            enabled: true,
            sourceIds: ["invalid-source"],
            multiSiteModeEnabled: false,
            titleQuery: "Medalist",
            subgroupQuery: "",
            advanced: {
              must: [],
              any: []
            },
            deliveryMode: "direct-only",
            createdAt: "2026-04-13T00:00:00.000Z",
            baselineCreatedAt: "2026-04-13T00:00:00.000Z"
          },
          {
            id: "sub-valid",
            name: "Valid scope",
            enabled: true,
            sourceIds: ["bangumimoe"],
            multiSiteModeEnabled: false,
            titleQuery: "Medalist",
            subgroupQuery: "",
            advanced: {
              must: [],
              any: []
            },
            deliveryMode: "direct-only",
            createdAt: "2026-04-13T00:00:00.000Z",
            baselineCreatedAt: "2026-04-13T00:00:00.000Z"
          }
        ],
        subscriptionRuntimeStateById: {
          "sub-invalid": {
            lastScanAt: "2026-04-13T01:00:00.000Z",
            lastMatchedAt: null,
            lastError: "",
            seenFingerprints: ["fp-invalid"],
            recentHits: []
          },
          "sub-valid": {
            lastScanAt: "2026-04-13T02:00:00.000Z",
            lastMatchedAt: null,
            lastError: "",
            seenFingerprints: ["fp-valid"],
            recentHits: []
          }
        }
      } as never).subscriptionRuntimeStateById
    ).toEqual({
      "sub-valid": {
        lastScanAt: "2026-04-13T02:00:00.000Z",
        lastMatchedAt: null,
        lastError: "",
        seenFingerprints: ["fp-valid"],
        recentHits: []
      }
    })
  })

  it("drops duplicate subscriptions after ids are trimmed", () => {
    expect(
      sanitizeSettings({
        subscriptions: [
          {
            id: " sub-1 ",
            name: "First",
            enabled: true,
            sourceIds: ["bangumimoe"],
            multiSiteModeEnabled: false,
            titleQuery: "Medalist",
            subgroupQuery: "",
            advanced: {
              must: [],
              any: []
            },
            deliveryMode: "direct-only",
            createdAt: "2026-04-13T00:00:00.000Z",
            baselineCreatedAt: "2026-04-13T00:00:00.000Z"
          },
          {
            id: "sub-1",
            name: "Second",
            enabled: true,
            sourceIds: ["kisssub"],
            multiSiteModeEnabled: false,
            titleQuery: "Frieren",
            subgroupQuery: "",
            advanced: {
              must: [],
              any: []
            },
            deliveryMode: "direct-only",
            createdAt: "2026-04-13T00:00:00.000Z",
            baselineCreatedAt: "2026-04-13T00:00:00.000Z"
          }
        ]
      } as never).subscriptions
    ).toEqual([
      expect.objectContaining({
        id: "sub-1",
        name: "First"
      })
    ])
  })

  it("drops legacy source conditions from any clauses instead of migrating them", () => {
    expect(
      sanitizeSettings({
        filters: [
          {
            id: "filter-valid",
            name: "保留 Bangumi 1080",
            enabled: true,
            must: [
              {
                id: "condition-must",
                field: "source",
                operator: "is",
                value: "bangumimoe"
              }
            ],
            any: [
              {
                id: "condition-any-source",
                field: "source",
                operator: "is",
                value: "bangumimoe"
              },
              {
                id: "condition-any-title",
                field: "title",
                operator: "contains",
                value: "1080"
              }
            ]
          }
        ]
      }).filters
    ).toEqual([])
  })

  it("defaults filters without legacy source conditions to all supported sites", () => {
    expect(
      sanitizeSettings({
        filters: [
          {
            id: "filter-global",
            name: "全站 1080",
            enabled: true,
            must: [
              {
                id: "condition-title",
                field: "title",
                operator: "contains",
                value: "1080"
              }
            ],
            any: []
          }
        ]
      }).filters
    ).toEqual([
      {
        id: "filter-global",
        name: "全站 1080",
        enabled: true,
        sourceIds: ["kisssub", "dongmanhuayuan", "acgrip", "bangumimoe"],
        must: [
          {
            id: "condition-title",
            field: "title",
            operator: "contains",
            value: "1080"
          }
        ],
        any: []
      }
    ])
  })

  it("does not migrate legacy source conditions into sourceIds when explicit sourceIds are missing", () => {
    expect(
      sanitizeSettings({
        filters: [
          {
            id: "filter-legacy-source-scope",
            name: "旧 Bangumi 1080",
            enabled: true,
            must: [
              {
                id: "condition-source",
                field: "source",
                operator: "is",
                value: "bangumimoe"
              },
              {
                id: "condition-title",
                field: "title",
                operator: "contains",
                value: "1080"
              }
            ],
            any: []
          }
        ]
      }).filters
    ).toEqual([
      {
        id: "filter-legacy-source-scope",
        name: "旧 Bangumi 1080",
        enabled: true,
        sourceIds: ["kisssub", "dongmanhuayuan", "acgrip", "bangumimoe"],
        must: [
          {
            id: "condition-title",
            field: "title",
            operator: "contains",
            value: "1080"
          }
        ],
        any: []
      }
    ])
  })

  it("drops filters when removing legacy source conditions leaves no must conditions", () => {
    expect(
      sanitizeSettings({
        filters: [
          {
            id: "filter-source-only",
            name: "仅 Bangumi",
            enabled: true,
            must: [
              {
                id: "condition-source",
                field: "source",
                operator: "is",
                value: "bangumimoe"
              }
            ],
            any: []
          }
        ]
      }).filters
    ).toEqual([])
  })

  it("drops legacy filterGroups data instead of migrating it", () => {
    expect(
      sanitizeSettings({
        filterGroups: [
          {
            id: "group-1",
            name: "旧规则组",
            enabled: true,
            description: "",
            rules: [
              {
                id: "rule-1",
                name: "旧规则",
                enabled: true,
                action: "include",
                relation: "and",
                conditions: [
                  {
                    id: "condition-1",
                    field: "title",
                    operator: "contains",
                    value: "1080p"
                  }
                ]
              }
            ]
          }
        ]
      } as never).filters
    ).toEqual([])
  })

  it("normalizes subscription settings, runtime state, and notification rounds", () => {
    expect(
      sanitizeSettings({
        subscriptionsEnabled: 1,
        pollingIntervalMinutes: 999,
        notificationsEnabled: false,
        notificationDownloadActionEnabled: "true",
        lastSchedulerRunAt: "2026-04-13T01:23:45.000Z",
      subscriptions: [
        {
          id: " sub-1 ",
          name: " Bangumi.moe Medalist ",
          enabled: "false",
          sourceIds: ["bangumimoe", "invalid-source"],
          multiSiteModeEnabled: false,
          titleQuery: " Medalist ",
            subgroupQuery: " 爱恋字幕社 ",
            advanced: {
              must: [
                {
                  id: " condition-1 ",
                  field: "title",
                  operator: "contains",
                  value: " Medalist "
                }
              ],
              any: []
            },
            deliveryMode: "direct-only",
            createdAt: "2026-04-13T00:00:00.000Z",
            baselineCreatedAt: "2026-04-13T00:00:00.000Z"
          }
        ],
        subscriptionRuntimeStateById: {
          "sub-1": {
            lastScanAt: "2026-04-13T02:00:00.000Z",
            lastMatchedAt: null,
            lastError: " timeout ",
            seenFingerprints: Array.from({ length: 205 }, (_, index) => ` fp-${index} `),
            recentHits: Array.from({ length: 25 }, (_, index) => ({
              id: ` hit-${index} `,
              subscriptionId: " sub-1 ",
              sourceId: "bangumimoe",
              title: ` Title ${index} `,
              normalizedTitle: ` title-${index} `,
              subgroup: " 爱恋字幕社 ",
              detailUrl: ` https://bangumi.moe/torrent/${index} `,
              magnetUrl: "",
              torrentUrl: "",
              discoveredAt: "2026-04-13T00:00:00.000Z",
              downloadedAt: null,
              downloadStatus: "idle"
            })).concat([
              {
                id: "hit-other",
                subscriptionId: "sub-other",
                sourceId: "bangumimoe",
                title: "Other",
                normalizedTitle: "other",
                subgroup: "",
                detailUrl: "https://bangumi.moe/torrent/other",
                magnetUrl: "",
                torrentUrl: "",
                discoveredAt: "2026-04-13T00:00:00.000Z",
                downloadedAt: null,
                downloadStatus: "idle"
              }
            ])
          }
        },
        subscriptionNotificationRounds: [
          {
            id: " round-1 ",
            createdAt: "2026-04-13T03:00:00.000Z",
            hitIds: [" hit-1 ", "", " hit-2 "]
          }
        ]
      } as never)
    ).toMatchObject({
      subscriptionsEnabled: true,
      pollingIntervalMinutes: 120,
      notificationsEnabled: false,
      notificationDownloadActionEnabled: true,
      lastSchedulerRunAt: "2026-04-13T01:23:45.000Z",
      subscriptions: [
        {
          id: "sub-1",
          name: "Bangumi.moe Medalist",
          enabled: false,
          sourceIds: ["bangumimoe"],
          titleQuery: "Medalist",
          subgroupQuery: "爱恋字幕社",
          deliveryMode: "direct-only"
        }
      ],
      subscriptionNotificationRounds: [
        {
          id: "round-1",
          hitIds: ["hit-1", "hit-2"]
        }
      ]
    })

    const sanitized = sanitizeSettings({
      subscriptions: [
        {
          id: "sub-1",
          name: "Valid scope",
          enabled: true,
          sourceIds: ["bangumimoe"],
          multiSiteModeEnabled: false,
          titleQuery: "Medalist",
          subgroupQuery: "",
          advanced: {
            must: [],
            any: []
          },
          deliveryMode: "direct-only",
          createdAt: "2026-04-13T00:00:00.000Z",
          baselineCreatedAt: "2026-04-13T00:00:00.000Z"
        }
      ],
      subscriptionRuntimeStateById: {
        "sub-1": {
          lastScanAt: null,
          lastMatchedAt: null,
          lastError: "",
          seenFingerprints: Array.from({ length: 205 }, (_, index) => `fp-${index}`),
          recentHits: Array.from({ length: 25 }, (_, index) => ({
            id: `hit-${index}`,
            subscriptionId: "sub-1",
            sourceId: "bangumimoe",
            title: `Title ${index}`,
            normalizedTitle: `title-${index}`,
            subgroup: "",
            detailUrl: `https://bangumi.moe/torrent/${index}`,
            magnetUrl: "",
            torrentUrl: "",
            discoveredAt: "2026-04-13T00:00:00.000Z",
            downloadedAt: null,
            downloadStatus: "idle"
          }))
        }
      }
    } as never)

    expect(sanitized.subscriptionRuntimeStateById["sub-1"]?.seenFingerprints).toHaveLength(200)
    expect(sanitized.subscriptionRuntimeStateById["sub-1"]?.recentHits).toHaveLength(20)
    expect(
      sanitizeSettings({
        subscriptions: [
          {
            id: "sub-1",
            name: "Valid scope",
            enabled: true,
            sourceIds: ["bangumimoe"],
            multiSiteModeEnabled: false,
            titleQuery: "Medalist",
            subgroupQuery: "",
            advanced: {
              must: [],
              any: []
            },
            deliveryMode: "direct-only",
            createdAt: "2026-04-13T00:00:00.000Z",
            baselineCreatedAt: "2026-04-13T00:00:00.000Z"
          }
        ],
        subscriptionRuntimeStateById: {
          "sub-1": {
            lastScanAt: null,
            lastMatchedAt: null,
            lastError: "",
            seenFingerprints: ["fp-1", "fp-2", "fp-1"],
            recentHits: []
          }
        }
      } as never).subscriptionRuntimeStateById["sub-1"]?.seenFingerprints
    ).toEqual(["fp-2", "fp-1"])

    const sanitizedMalformedHit = sanitizeSettings({
      subscriptions: [
        {
          id: "sub-1",
          name: "Valid scope",
          enabled: true,
          sourceIds: ["bangumimoe"],
          multiSiteModeEnabled: false,
          titleQuery: "Medalist",
          subgroupQuery: "",
          advanced: {
            must: [],
            any: []
          },
          deliveryMode: "direct-only",
          createdAt: "2026-04-13T00:00:00.000Z",
          baselineCreatedAt: "2026-04-13T00:00:00.000Z"
        }
      ],
      subscriptionRuntimeStateById: {
        "sub-1": {
          lastScanAt: null,
          lastMatchedAt: null,
          lastError: "",
          seenFingerprints: [],
          recentHits: [
            {
              id: "hit-bad",
              subscriptionId: "sub-1",
              sourceId: "bangumimoe",
              title: "Bad Hit",
              normalizedTitle: "bad-hit",
              subgroup: "",
              detailUrl: "https://bangumi.moe/torrent/bad",
              magnetUrl: "",
              torrentUrl: "",
              discoveredAt: "   ",
              downloadedAt: null,
              downloadStatus: "idle"
            }
          ]
        }
      }
    } as never)

    expect(sanitizedMalformedHit.subscriptionRuntimeStateById["sub-1"]?.recentHits).toEqual([])
  })
})
