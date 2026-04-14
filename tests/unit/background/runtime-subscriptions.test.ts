import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

type AlarmListener = Parameters<typeof fakeBrowser.alarms.onAlarm.addListener>[0]
type RuntimeInstalledListener = Parameters<typeof fakeBrowser.runtime.onInstalled.addListener>[0]
type RuntimeMessageListener = Parameters<typeof fakeBrowser.runtime.onMessage.addListener>[0]
type RuntimeStartupListener = NonNullable<
  Parameters<NonNullable<typeof fakeBrowser.runtime.onStartup>["addListener"]>[0]
>
type NotificationClickedListener = Parameters<typeof fakeBrowser.notifications.onClicked.addListener>[0]
type TabsUpdatedListener = Parameters<typeof fakeBrowser.tabs.onUpdated.addListener>[0]
type TabsActivatedListener = Parameters<typeof fakeBrowser.tabs.onActivated.addListener>[0]

const {
  downloadSubscriptionHitsMock,
  executeSubscriptionScanMock,
  getSettingsMock
} = vi.hoisted(() => ({
  downloadSubscriptionHitsMock: vi.fn(),
  executeSubscriptionScanMock: vi.fn(),
  getSettingsMock: vi.fn()
}))

const onAlarmAddListener = vi.fn()
const onClickedAddListener = vi.fn()
const onInstalledAddListener = vi.fn()
const onMessageAddListener = vi.fn()
const onStartupAddListener = vi.fn()
const onUpdatedAddListener = vi.fn()
const onActivatedAddListener = vi.fn()

vi.mock("../../../src/lib/background", async () => {
  const actual = await vi.importActual<typeof import("../../../src/lib/background")>(
    "../../../src/lib/background"
  )
  return {
    ...actual,
    createBatchDownloadManager: () => ({
      activeJobs: new Map<number, unknown>(),
      startBatchDownload: vi.fn()
    }),
    executeSubscriptionScan: executeSubscriptionScanMock,
    downloadSubscriptionHits: downloadSubscriptionHitsMock,
    fetchTorrentForUpload: vi.fn(),
    retryFailedItems: vi.fn(),
    testDownloaderConnection: vi.fn()
  }
})

vi.mock("../../../src/lib/settings", async () => {
  const actual = await vi.importActual<typeof import("../../../src/lib/settings")>(
    "../../../src/lib/settings"
  )
  return {
    ...actual,
    getSettings: getSettingsMock
  }
})

function installBrowserSpies() {
  vi.spyOn(fakeBrowser.alarms.onAlarm, "addListener").mockImplementation((listener: AlarmListener) => {
    onAlarmAddListener(listener)
  })
  vi.spyOn(fakeBrowser.notifications.onClicked, "addListener").mockImplementation(
    (listener: NotificationClickedListener) => {
      onClickedAddListener(listener)
    }
  )
  vi.spyOn(fakeBrowser.runtime.onInstalled, "addListener").mockImplementation(
    (listener: RuntimeInstalledListener) => {
      onInstalledAddListener(listener)
    }
  )
  vi.spyOn(fakeBrowser.runtime.onMessage, "addListener").mockImplementation(
    (listener: RuntimeMessageListener) => {
      onMessageAddListener(listener)
    }
  )
  fakeBrowser.runtime.onStartup &&
    vi.spyOn(fakeBrowser.runtime.onStartup, "addListener").mockImplementation(
      (listener: RuntimeStartupListener) => {
        onStartupAddListener(listener)
      }
    )
  vi.spyOn(fakeBrowser.action, "setIcon").mockImplementation(vi.fn(() => Promise.resolve()) as never)
  vi.spyOn(fakeBrowser.tabs, "query").mockImplementation(vi.fn(async () => []) as never)
  vi.spyOn(fakeBrowser.tabs, "get").mockImplementation(
    vi.fn(async () => ({ id: 1, url: "https://example.com/" })) as never
  )
  vi.spyOn(fakeBrowser.tabs, "sendMessage").mockImplementation(vi.fn() as never)
  vi.spyOn(fakeBrowser.tabs.onUpdated, "addListener").mockImplementation(
    (listener: TabsUpdatedListener) => {
      onUpdatedAddListener(listener)
    }
  )
  vi.spyOn(fakeBrowser.tabs.onActivated, "addListener").mockImplementation(
    (listener: TabsActivatedListener) => {
      onActivatedAddListener(listener)
    }
  )
}

describe("background subscription runtime boundary", () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.clearAllMocks()
    getSettingsMock.mockResolvedValue({
      notificationDownloadActionEnabled: true
    })
    installBrowserSpies()
    const { registerBackgroundRuntime } = await import("../../../src/entrypoints/background/runtime")
    registerBackgroundRuntime()
  })

  it("supports RUN_SUBSCRIPTION_SCAN_NOW runtime messages", async () => {
    executeSubscriptionScanMock.mockResolvedValue({
      settings: {},
      notificationRound: {
        id: "subscription-round:20260414093000000",
        createdAt: "2026-04-14T09:30:00.000Z",
        hitIds: ["hit-1"]
      },
      newHits: [],
      scannedSourceIds: [],
      errors: []
    })
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    const keepsPortOpen = listener?.(
      {
        type: "RUN_SUBSCRIPTION_SCAN_NOW"
      },
      {},
      sendResponse
    )

    expect(keepsPortOpen).toBe(true)
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })
    expect(executeSubscriptionScanMock).toHaveBeenCalledTimes(1)
    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      roundId: "subscription-round:20260414093000000"
    })
  })

  it("supports DOWNLOAD_SUBSCRIPTION_HITS runtime messages", async () => {
    downloadSubscriptionHitsMock.mockResolvedValue(undefined)
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    const keepsPortOpen = listener?.(
      {
        type: "DOWNLOAD_SUBSCRIPTION_HITS",
        roundId: "subscription-round:20260414093000000"
      },
      {},
      sendResponse
    )

    expect(keepsPortOpen).toBe(true)
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })
    expect(downloadSubscriptionHitsMock).toHaveBeenCalledWith({
      roundId: "subscription-round:20260414093000000"
    })
    expect(sendResponse).toHaveBeenCalledWith({
      ok: true
    })
  })

  it("downloads subscription hits when a subscription notification is clicked and ignores other ids", async () => {
    downloadSubscriptionHitsMock.mockResolvedValue(undefined)
    const listener = onClickedAddListener.mock.calls[0]?.[0]

    listener?.("not-a-subscription-round")
    await Promise.resolve()
    expect(downloadSubscriptionHitsMock).not.toHaveBeenCalled()

    listener?.("subscription-round:20260414093000000")
    await vi.waitFor(() => {
      expect(downloadSubscriptionHitsMock).toHaveBeenCalledTimes(1)
    })
    expect(downloadSubscriptionHitsMock).toHaveBeenCalledWith({
      roundId: "subscription-round:20260414093000000"
    })
  })

  it("does not download hits from notification clicks when the click action toggle is disabled", async () => {
    getSettingsMock.mockResolvedValue({
      notificationDownloadActionEnabled: false
    })
    downloadSubscriptionHitsMock.mockResolvedValue(undefined)
    const listener = onClickedAddListener.mock.calls[0]?.[0]

    listener?.("subscription-round:20260414093000000")
    await Promise.resolve()

    expect(getSettingsMock).toHaveBeenCalledTimes(1)
    expect(downloadSubscriptionHitsMock).not.toHaveBeenCalled()
  })

  it("swallows subscription notification click download errors", async () => {
    downloadSubscriptionHitsMock.mockRejectedValue(new Error("downloader offline"))
    const listener = onClickedAddListener.mock.calls[0]?.[0]

    expect(() => {
      listener?.("subscription-round:20260414093000000")
    }).not.toThrow()

    await vi.waitFor(() => {
      expect(downloadSubscriptionHitsMock).toHaveBeenCalledTimes(1)
    })
  })
})
