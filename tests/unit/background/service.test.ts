import { beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_SETTINGS } from "../../../lib/settings/defaults"
import type { Settings } from "../../../lib/shared/types"

const {
  getSettingsMock,
  sanitizeSettingsMock,
  getDefaultDownloaderAdapterMock,
  testConnectionMock
} = vi.hoisted(() => ({
  getSettingsMock: vi.fn(),
  sanitizeSettingsMock: vi.fn(),
  getDefaultDownloaderAdapterMock: vi.fn(),
  testConnectionMock: vi.fn()
}))

vi.mock("../../../lib/settings", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/settings")>(
    "../../../lib/settings"
  )

  return {
    ...actual,
    getSettings: getSettingsMock,
    sanitizeSettings: sanitizeSettingsMock
  }
})

vi.mock("../../../lib/downloader", () => ({
  getDefaultDownloaderAdapter: getDefaultDownloaderAdapterMock
}))

import { testQbConnection } from "../../../lib/background/service"

describe("testQbConnection", () => {
  const storedSettings: Settings = {
    ...DEFAULT_SETTINGS,
    qbBaseUrl: "http://127.0.0.1:7474",
    qbUsername: "admin",
    qbPassword: "secret"
  }

  const sanitizedSettings: Settings = {
    ...storedSettings,
    qbBaseUrl: "http://127.0.0.1:17474",
    qbUsername: "root"
  }

  beforeEach(() => {
    vi.clearAllMocks()
    getSettingsMock.mockResolvedValue(storedSettings)
    sanitizeSettingsMock.mockReturnValue(sanitizedSettings)
    getDefaultDownloaderAdapterMock.mockReturnValue({
      testConnection: testConnectionMock
    })
    testConnectionMock.mockResolvedValue({
      baseUrl: "http://127.0.0.1:17474",
      version: "4.6.0"
    })
  })

  it("merges stored settings with overrides, sanitizes them, and uses the default downloader adapter", async () => {
    await expect(
      testQbConnection({
        qbBaseUrl: " http://127.0.0.1:17474/// ",
        qbUsername: " root "
      })
    ).resolves.toEqual({
      baseUrl: "http://127.0.0.1:17474",
      version: "4.6.0"
    })

    expect(getSettingsMock).toHaveBeenCalledTimes(1)
    expect(sanitizeSettingsMock).toHaveBeenCalledWith({
      ...storedSettings,
      qbBaseUrl: " http://127.0.0.1:17474/// ",
      qbUsername: " root "
    })
    expect(getDefaultDownloaderAdapterMock).toHaveBeenCalledTimes(1)
    expect(testConnectionMock).toHaveBeenCalledWith(sanitizedSettings)
  })

  it("returns adapter-provided fallback values unchanged", async () => {
    testConnectionMock.mockResolvedValueOnce({
      baseUrl: "http://127.0.0.1:17474",
      version: "unknown"
    })

    await expect(testQbConnection(null)).resolves.toEqual({
      baseUrl: "http://127.0.0.1:17474",
      version: "unknown"
    })
  })

  it("rethrows default adapter connection failures", async () => {
    testConnectionMock.mockRejectedValueOnce(new Error("bad login"))

    await expect(testQbConnection(null)).rejects.toThrow("bad login")
  })
})
