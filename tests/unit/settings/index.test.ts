import { describe, expect, it } from "vitest"

import { DEFAULT_SETTINGS, sanitizeSettings } from "../../../lib/settings"

describe("sanitizeSettings", () => {
  it("uses 7474 as the default qB WebUI address", () => {
    expect(sanitizeSettings({})).toMatchObject({
      qbBaseUrl: "http://127.0.0.1:7474"
    })
  })

  it("uses defaults and normalizes the base url", () => {
    expect(
      sanitizeSettings({
        qbBaseUrl: " http://127.0.0.1:17474/// ",
        qbUsername: " admin ",
        qbPassword: "123456"
      })
    ).toEqual({
      ...DEFAULT_SETTINGS,
      qbBaseUrl: "http://127.0.0.1:17474",
      qbUsername: "admin",
      qbPassword: "123456"
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
        qbBaseUrl: "http://127.0.0.1:17474",
        qbUsername: "admin"
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

  it("defaults filter rules to an empty array", () => {
    expect(sanitizeSettings({}).filterRules).toEqual([])
  })

  it("normalizes filter rules, trims conditions, and rewrites order", () => {
    expect(
      sanitizeSettings({
        filterRules: [
          {
            id: "rule-2",
            name: "  排除生肉  ",
            enabled: true,
            action: "exclude",
            sourceIds: ["kisssub", "kisssub", "bangumimoe"],
            order: 99,
            conditions: {
              titleIncludes: ["  1080p ", "", "  "],
              titleExcludes: [" RAW ", ""],
              subgroupIncludes: []
            }
          },
          {
            id: "rule-1",
            name: "  仅保留喵萌  ",
            enabled: false,
            action: "include",
            sourceIds: ["acgrip"],
            order: -1,
            conditions: {
              titleIncludes: [],
              titleExcludes: [],
              subgroupIncludes: [" 喵萌奶茶屋 ", ""]
            }
          }
        ]
      }).filterRules
    ).toEqual([
      {
        id: "rule-2",
        name: "排除生肉",
        enabled: true,
        action: "exclude",
        sourceIds: ["kisssub", "bangumimoe"],
        order: 0,
        conditions: {
          titleIncludes: ["1080p"],
          titleExcludes: ["RAW"],
          subgroupIncludes: []
        }
      },
      {
        id: "rule-1",
        name: "仅保留喵萌",
        enabled: false,
        action: "include",
        sourceIds: ["acgrip"],
        order: 1,
        conditions: {
          titleIncludes: [],
          titleExcludes: [],
          subgroupIncludes: ["喵萌奶茶屋"]
        }
      }
    ])
  })

  it("drops title exclude conditions from include rules during sanitization", () => {
    expect(
      sanitizeSettings({
        filterRules: [
          {
            id: "rule-include",
            name: "保留 1080p",
            enabled: true,
            action: "include",
            sourceIds: ["kisssub"],
            order: 0,
            conditions: {
              titleIncludes: ["1080p"],
              titleExcludes: ["RAW"],
              subgroupIncludes: []
            }
          }
        ]
      }).filterRules[0]?.conditions.titleExcludes
    ).toEqual([])
  })
})
