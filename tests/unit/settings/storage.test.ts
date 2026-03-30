import { beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_SETTINGS } from "../../../lib/settings/defaults"
import { ensureSettings, getSettings, saveSettings } from "../../../lib/settings/storage"

type StoredState = {
  settings?: unknown
}

function installChromeStorageMock(state: StoredState) {
  const get = vi.fn(async () => ({
    settings: state.settings
  }))
  const set = vi.fn(async (value: { settings: unknown }) => {
    state.settings = value.settings
  })

  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      storage: {
        local: {
          get,
          set
        }
      }
    }
  })

  return { get, set }
}

describe("settings storage helpers", () => {
  let state: StoredState
  let storage: ReturnType<typeof installChromeStorageMock>

  beforeEach(() => {
    vi.clearAllMocks()
    state = {}
    storage = installChromeStorageMock(state)
  })

  it("writes default settings when storage is empty", async () => {
    await ensureSettings()

    expect(storage.set).toHaveBeenCalledWith({
      settings: DEFAULT_SETTINGS
    })
    expect(state.settings).toEqual(DEFAULT_SETTINGS)
  })

  it("does not overwrite existing settings during ensureSettings", async () => {
    state.settings = {
      qbBaseUrl: "http://127.0.0.1:17474"
    }

    await ensureSettings()

    expect(storage.set).not.toHaveBeenCalled()
  })

  it("hydrates missing defaults and sanitizes stored values when reading settings", async () => {
    state.settings = {
      qbBaseUrl: " http://127.0.0.1:17474/// ",
      qbUsername: " admin ",
      lastSavePath: "  D:\\Anime  ",
      enabledSources: {
        kisssub: false
      }
    }

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      qbBaseUrl: "http://127.0.0.1:17474",
      qbUsername: "admin",
      lastSavePath: "D:\\Anime",
      filterRules: [],
      enabledSources: {
        kisssub: false,
        dongmanhuayuan: true,
        acgrip: true,
        bangumimoe: true
      }
    })

    expect(storage.set).not.toHaveBeenCalled()
  })

  it("merges partial updates into the sanitized stored settings before persisting", async () => {
    state.settings = {
      qbBaseUrl: " http://127.0.0.1:7474/// ",
      qbUsername: " admin ",
      filterRules: [
        {
          id: "rule-old",
          name: "  排除 RAW  ",
          enabled: true,
          action: "exclude",
          sourceIds: ["kisssub"],
          order: 0,
          conditions: {
            titleIncludes: [],
            titleExcludes: [" RAW "],
            subgroupIncludes: []
          }
        }
      ],
      enabledSources: {
        kisssub: false
      }
    }

    await expect(
      saveSettings({
        qbBaseUrl: " http://127.0.0.1:17474/// ",
        lastSavePath: "  D:\\Downloads\\Anime  ",
        enabledSources: {
          acgrip: false
        },
        filterRules: [
          {
            id: "rule-new",
            name: "  仅保留喵萌  ",
            enabled: true,
            action: "include",
            sourceIds: ["bangumimoe", "bangumimoe"],
            order: 9,
            conditions: {
              titleIncludes: [],
              titleExcludes: [],
              subgroupIncludes: [" 喵萌奶茶屋 ", ""]
            }
          }
        ]
      })
    ).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      qbBaseUrl: "http://127.0.0.1:17474",
      qbUsername: "admin",
      lastSavePath: "D:\\Downloads\\Anime",
      filterRules: [
        {
          id: "rule-new",
          name: "仅保留喵萌",
          enabled: true,
          action: "include",
          sourceIds: ["bangumimoe"],
          order: 0,
          conditions: {
            titleIncludes: [],
            titleExcludes: [],
            subgroupIncludes: ["喵萌奶茶屋"]
          }
        }
      ],
      enabledSources: {
        kisssub: true,
        dongmanhuayuan: true,
        acgrip: false,
        bangumimoe: true
      }
    })

    expect(storage.set).toHaveBeenCalledWith({
      settings: {
        ...DEFAULT_SETTINGS,
        qbBaseUrl: "http://127.0.0.1:17474",
        qbUsername: "admin",
        lastSavePath: "D:\\Downloads\\Anime",
        filterRules: [
          {
            id: "rule-new",
            name: "仅保留喵萌",
            enabled: true,
            action: "include",
            sourceIds: ["bangumimoe"],
            order: 0,
            conditions: {
              titleIncludes: [],
              titleExcludes: [],
              subgroupIncludes: ["喵萌奶茶屋"]
            }
          }
        ],
        enabledSources: {
          kisssub: true,
          dongmanhuayuan: true,
          acgrip: false,
          bangumimoe: true
        }
      }
    })
  })

  it("initializes defaults before saving when storage was previously empty", async () => {
    await expect(
      saveSettings({
        qbUsername: " admin "
      })
    ).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      qbUsername: "admin"
    })

    expect(storage.set).toHaveBeenCalledTimes(2)
    expect(storage.set.mock.calls[0]?.[0]).toEqual({
      settings: DEFAULT_SETTINGS
    })
  })
})
