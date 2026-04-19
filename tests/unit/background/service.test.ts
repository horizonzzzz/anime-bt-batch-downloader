import { beforeEach, describe, expect, it, vi } from "vitest"

import type { DownloaderConfig } from "../../../src/lib/downloader/config/types"
import { DEFAULT_DOWNLOADER_CONFIG } from "../../../src/lib/downloader/config/defaults"

const {
  getDownloaderConfigMock,
  getDownloaderAdapterMock,
  getDownloaderMetaMock,
  testConnectionMock,
  permissionsContainsMock,
  permissionsRequestMock
} = vi.hoisted(() => ({
  getDownloaderConfigMock: vi.fn(),
  getDownloaderAdapterMock: vi.fn(),
  getDownloaderMetaMock: vi.fn(),
  testConnectionMock: vi.fn(),
  permissionsContainsMock: vi.fn(),
  permissionsRequestMock: vi.fn()
}))

vi.mock("../../../src/lib/downloader/config/storage", () => ({
  getDownloaderConfig: getDownloaderConfigMock
}))

vi.mock("../../../src/lib/downloader", () => ({
  getDownloaderAdapter: getDownloaderAdapterMock,
  getDownloaderMeta: getDownloaderMetaMock
}))

vi.mock("../../../src/lib/shared/browser", async () => {
  const actual = await vi.importActual<typeof import("../../../src/lib/shared/browser")>(
    "../../../src/lib/shared/browser"
  )

  return {
    ...actual,
    getBrowser: vi.fn(() => ({
      permissions: {
        contains: permissionsContainsMock,
        request: permissionsRequestMock
      }
    }))
  }
})

import { testDownloaderConnection } from "../../../src/lib/background/service"

describe("testDownloaderConnection", () => {
  const storedConfig: DownloaderConfig = {
    ...DEFAULT_DOWNLOADER_CONFIG,
    profiles: {
      ...DEFAULT_DOWNLOADER_CONFIG.profiles,
      qbittorrent: {
        baseUrl: "http://127.0.0.1:7474",
        username: "admin",
        password: "secret"
      }
    }
  }

  const overrideConfig: DownloaderConfig = {
    activeId: "qbittorrent",
    profiles: {
      qbittorrent: {
        baseUrl: "http://127.0.0.1:17474",
        username: "root",
        password: "secret"
      },
      transmission: DEFAULT_DOWNLOADER_CONFIG.profiles.transmission
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    getDownloaderConfigMock.mockResolvedValue(storedConfig)
    getDownloaderAdapterMock.mockReturnValue({
      testConnection: testConnectionMock
    })
    getDownloaderMetaMock.mockReturnValue({
      id: "qbittorrent",
      displayName: "qBittorrent"
    })
    testConnectionMock.mockResolvedValue({
      baseUrl: "http://127.0.0.1:17474",
      version: "4.6.0"
    })
    permissionsContainsMock.mockResolvedValue(true)
    permissionsRequestMock.mockResolvedValue(true)
  })

  it("tests downloader connection from DownloaderConfig overrides", async () => {
    await expect(
      testDownloaderConnection(overrideConfig)
    ).resolves.toEqual({
      downloaderId: "qbittorrent",
      displayName: "qBittorrent",
      baseUrl: "http://127.0.0.1:17474",
      version: "4.6.0"
    })

    expect(getDownloaderConfigMock).not.toHaveBeenCalled()
    expect(getDownloaderAdapterMock).toHaveBeenCalledWith("qbittorrent")
    expect(permissionsContainsMock).toHaveBeenCalledWith({
      origins: ["http://127.0.0.1/*"]
    })
    expect(permissionsRequestMock).not.toHaveBeenCalled()
    expect(testConnectionMock).toHaveBeenCalledWith(overrideConfig)
  })

  it("returns adapter-provided fallback values unchanged", async () => {
    testConnectionMock.mockResolvedValueOnce({
      baseUrl: "http://127.0.0.1:17474",
      version: "unknown"
    })

    await expect(testDownloaderConnection(null)).resolves.toEqual({
      downloaderId: "qbittorrent",
      displayName: "qBittorrent",
      baseUrl: "http://127.0.0.1:17474",
      version: "unknown"
    })

    expect(getDownloaderConfigMock).toHaveBeenCalledTimes(1)
  })

  it("rethrows default adapter connection failures", async () => {
    testConnectionMock.mockRejectedValueOnce(new Error("bad login"))

    await expect(testDownloaderConnection(null)).rejects.toThrow("bad login")
  })

  it("fails with a permission-specific error when downloader host access is missing", async () => {
    permissionsContainsMock.mockResolvedValueOnce(false)
    permissionsRequestMock.mockResolvedValueOnce(false)

    await expect(testDownloaderConnection(null)).rejects.toThrow("权限")
    expect(permissionsRequestMock).toHaveBeenCalledWith({
      origins: ["http://127.0.0.1/*"]
    })
    expect(testConnectionMock).not.toHaveBeenCalled()
  })

  it("fails with a permission-specific error when downloader host access is denied", async () => {
    permissionsContainsMock.mockResolvedValueOnce(false)
    permissionsRequestMock.mockResolvedValueOnce(false)

    await expect(testDownloaderConnection(null)).rejects.toThrow("权限")
    expect(testConnectionMock).not.toHaveBeenCalled()
  })

  it("requests downloader host access interactively for popup-style probes without overrides", async () => {
    permissionsContainsMock.mockResolvedValueOnce(false)
    permissionsRequestMock.mockResolvedValueOnce(true)

    await expect(testDownloaderConnection(null)).resolves.toEqual({
      downloaderId: "qbittorrent",
      displayName: "qBittorrent",
      baseUrl: "http://127.0.0.1:17474",
      version: "4.6.0"
    })

    expect(permissionsRequestMock).toHaveBeenCalledWith({
      origins: ["http://127.0.0.1/*"]
    })
    expect(getDownloaderConfigMock).toHaveBeenCalledTimes(1)
    expect(testConnectionMock).toHaveBeenCalledWith(storedConfig)
  })

  it("skips interactive permission request when override config is provided", async () => {
    permissionsContainsMock.mockResolvedValueOnce(false)

    await expect(testDownloaderConnection(overrideConfig)).rejects.toThrow("权限")
    expect(permissionsRequestMock).not.toHaveBeenCalled()
  })
})
