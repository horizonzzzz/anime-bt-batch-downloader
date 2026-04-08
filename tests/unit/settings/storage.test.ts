import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

import { DEFAULT_SETTINGS } from "../../../src/lib/settings/defaults"
import { ensureSettings, getSettings, saveSettings } from "../../../src/lib/settings/storage"

describe("settings storage helpers", () => {
  let getSpy: ReturnType<typeof vi.spyOn>
  let setSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    getSpy = vi.spyOn(fakeBrowser.storage.local, "get")
    setSpy = vi.spyOn(fakeBrowser.storage.local, "set")
  })

  it("writes default settings when storage is empty", async () => {
    await ensureSettings()

    expect(setSpy).toHaveBeenCalledWith({
      settings_v2: DEFAULT_SETTINGS
    })
    await expect(fakeBrowser.storage.local.get("settings_v2")).resolves.toEqual({
      settings_v2: DEFAULT_SETTINGS
    })
  })

  it("does not overwrite existing settings during ensureSettings", async () => {
    await fakeBrowser.storage.local.set({
      settings_v2: {
        currentDownloaderId: "qbittorrent"
      }
    })

    await ensureSettings()

    expect(setSpy).toHaveBeenCalledTimes(1)
  })

  it("initializes the new storage key even when the legacy key still exists", async () => {
    await fakeBrowser.storage.local.set({
      settings: {
        currentDownloaderId: "qbittorrent"
      }
    })

    await ensureSettings()

    expect(setSpy).toHaveBeenCalledTimes(2)
    expect(setSpy).toHaveBeenLastCalledWith({
      settings_v2: DEFAULT_SETTINGS
    })
    await expect(fakeBrowser.storage.local.get(["settings", "settings_v2"])).resolves.toEqual({
      settings: {
        currentDownloaderId: "qbittorrent"
      },
      settings_v2: DEFAULT_SETTINGS
    })
  })

  it("hydrates missing defaults and sanitizes stored values when reading settings", async () => {
    await fakeBrowser.storage.local.set({
      settings_v2: {
        currentDownloaderId: "qbittorrent",
        downloaders: {
          qbittorrent: {
            baseUrl: " http://127.0.0.1:17474/// ",
            username: " admin "
          }
        },
        lastSavePath: "  D:\\Anime  ",
        enabledSources: {
          kisssub: false
        }
      }
    })

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      downloaders: {
        ...DEFAULT_SETTINGS.downloaders,
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: ""
        }
      },
      lastSavePath: "D:\\Anime",
      filters: [],
      enabledSources: {
        kisssub: false,
        dongmanhuayuan: true,
        acgrip: true,
        bangumimoe: true
      }
    })

    expect(setSpy).toHaveBeenCalledTimes(1)
  })

  it("ignores the legacy storage key when reading settings", async () => {
    await fakeBrowser.storage.local.set({
      settings: {
        currentDownloaderId: "qbittorrent",
        downloaders: {
          qbittorrent: {
            baseUrl: "http://legacy-host:9090",
            username: "legacy-user"
          }
        }
      },
      settings_v2: {
        currentDownloaderId: "qbittorrent",
        downloaders: {
          qbittorrent: {
            baseUrl: " http://127.0.0.1:17474/// ",
            username: " admin "
          }
        }
      }
    })

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      downloaders: {
        ...DEFAULT_SETTINGS.downloaders,
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: ""
        }
      }
    })
  })

  it("hydrates transmission defaults when reading older qb-only settings", async () => {
    await fakeBrowser.storage.local.set({
      settings_v2: {
        currentDownloaderId: "qbittorrent",
        downloaders: {
          qbittorrent: {
            baseUrl: " http://127.0.0.1:17474/// ",
            username: " admin "
          }
        }
      }
    })

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      downloaders: {
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: ""
        },
        transmission: DEFAULT_SETTINGS.downloaders.transmission
      }
    })
  })

  it("merges partial updates into the sanitized stored settings before persisting", async () => {
    await fakeBrowser.storage.local.set({
      settings_v2: {
        currentDownloaderId: "qbittorrent",
        downloaders: {
          qbittorrent: {
            baseUrl: " http://127.0.0.1:7474/// ",
            username: " admin "
          }
        },
        enabledSources: {
          kisssub: false
        }
      }
    })

    await expect(
      saveSettings({
        downloaders: {
          qbittorrent: {
            baseUrl: " http://127.0.0.1:17474/// "
          }
        },
        lastSavePath: "  D:\\Downloads\\Anime  ",
        enabledSources: {
          acgrip: false
        },
        filters: [
          {
            id: " filter-1 ",
            name: " Bangumi 1080 ",
            enabled: true,
            must: [
              {
                id: " condition-1 ",
                field: "source",
                operator: "is",
                value: "bangumimoe"
              }
            ],
            any: [
              {
                id: " condition-2 ",
                field: "title",
                operator: "contains",
                value: " 1080p "
              }
            ]
          }
        ]
      })
    ).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      downloaders: {
        ...DEFAULT_SETTINGS.downloaders,
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: ""
        }
      },
      lastSavePath: "D:\\Downloads\\Anime",
      filters: [
        {
          id: "filter-1",
          name: "Bangumi 1080",
          enabled: true,
          must: [
            {
              id: "condition-1",
              field: "source",
              operator: "is",
              value: "bangumimoe"
            }
          ],
          any: [
            {
              id: "condition-2",
              field: "title",
              operator: "contains",
              value: "1080p"
            }
          ]
        }
      ],
      enabledSources: {
        kisssub: false,
        dongmanhuayuan: true,
        acgrip: false,
        bangumimoe: true
      }
    })

    expect(setSpy).toHaveBeenLastCalledWith({
      settings_v2: {
        ...DEFAULT_SETTINGS,
        downloaders: {
          ...DEFAULT_SETTINGS.downloaders,
          qbittorrent: {
            baseUrl: "http://127.0.0.1:17474",
            username: "admin",
            password: ""
          }
        },
        lastSavePath: "D:\\Downloads\\Anime",
        filters: [
          {
            id: "filter-1",
            name: "Bangumi 1080",
            enabled: true,
            must: [
              {
                id: "condition-1",
                field: "source",
                operator: "is",
                value: "bangumimoe"
              }
            ],
            any: [
              {
                id: "condition-2",
                field: "title",
                operator: "contains",
                value: "1080p"
              }
            ]
          }
        ],
        enabledSources: {
          kisssub: false,
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
        downloaders: {
          qbittorrent: {
            username: " admin "
          }
        }
      })
    ).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      downloaders: {
        ...DEFAULT_SETTINGS.downloaders,
        qbittorrent: {
          ...DEFAULT_SETTINGS.downloaders.qbittorrent,
          username: "admin"
        }
      }
    })

    expect(setSpy).toHaveBeenCalledTimes(2)
    expect(setSpy.mock.calls[0]?.[0]).toEqual({
      settings_v2: DEFAULT_SETTINGS
    })
    expect(getSpy).toHaveBeenCalled()
  })
})
