import { BATCH_EVENT } from "./lib/constants"
import { createBatchDownloadManager } from "./lib/background-batch"
import { extractSingleItem } from "./lib/extraction"
import { addTorrentFilesToQb, addUrlsToQb, loginQb, qbFetchText } from "./lib/qb"
import { ensureSettings, getSettings, sanitizeSettings, saveSettings } from "./lib/settings"
import type { BatchEventPayload, BatchItem, Settings } from "./lib/types"

type RuntimeRequest =
  | { type: "GET_SETTINGS" }
  | { type: "SAVE_SETTINGS"; settings?: Partial<Settings> }
  | { type: "TEST_QB_CONNECTION"; settings?: Partial<Settings> | null }
  | { type: "OPEN_OPTIONS_PAGE" }
  | { type: "START_BATCH_DOWNLOAD"; items?: BatchItem[]; savePath?: string }

const batchDownloadManager = createBatchDownloadManager({
  saveSettings,
  extractSingleItem,
  sendBatchEvent,
  loginQb,
  addUrlsToQb,
  addTorrentFilesToQb
})

chrome.runtime.onInstalled.addListener(() => {
  void ensureSettings()
})

chrome.runtime.onMessage.addListener((message: RuntimeRequest, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") {
    return false
  }

  void (async () => {
    try {
      switch (message.type) {
        case "GET_SETTINGS":
          sendResponse({ ok: true, settings: await getSettings() })
          return
        case "SAVE_SETTINGS":
          sendResponse({
            ok: true,
            settings: await saveSettings(message.settings ?? {})
          })
          return
        case "TEST_QB_CONNECTION":
          sendResponse({
            ok: true,
            result: await testQbConnection(message.settings ?? null)
          })
          return
        case "OPEN_OPTIONS_PAGE":
          await chrome.runtime.openOptionsPage()
          sendResponse({ ok: true })
          return
        case "START_BATCH_DOWNLOAD":
          sendResponse(
            await batchDownloadManager.startBatchDownload(
              typeof sender.tab?.id === "number" ? sender.tab.id : null,
              message.items ?? [],
              message.savePath
            )
          )
          return
        default:
          sendResponse({
            ok: false,
            error: `Unsupported message type: ${String((message as { type: string }).type)}`
          })
      }
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })()

  return true
})

async function testQbConnection(overrideSettings: Partial<Settings> | null) {
  const settings = sanitizeSettings({
    ...(await getSettings()),
    ...(overrideSettings ?? {})
  })

  await loginQb(settings)
  const version = await qbFetchText(settings, "/api/v2/app/version", { method: "GET" })

  return {
    baseUrl: settings.qbBaseUrl,
    version: version.trim() || "unknown"
  }
}

async function sendBatchEvent(tabId: number, payload: BatchEventPayload) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: BATCH_EVENT,
      ...payload
    })
  } catch {
    // Ignore tabs that navigated away or were closed.
  }
}

export {}
