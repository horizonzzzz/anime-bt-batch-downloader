import { getSubscriptionScanSourceAdapterById } from "../sources"
import { getBrowser } from "../shared/browser"
import {
  SCAN_SUBSCRIPTION_LIST_REQUEST,
  type ScanSubscriptionListMessage,
  type ScanSubscriptionListResultMessage
} from "../shared/messages"
import type { Browser } from "../shared/browser"
import type { SourceId } from "../shared/types"
import type { SourceSubscriptionScanCandidate } from "../sources/types"
import type { SubscriptionCandidate } from "./types"
import { waitForContentScriptReadySignal } from "./content-ready"

export type RunWithListPageTab = <T>(
  listPageUrl: string,
  run: (tabId: number) => Promise<T>
) => Promise<T>

type ScanSubscriptionCandidatesFromSourceDependencies = {
  getAdapterById?: typeof getSubscriptionScanSourceAdapterById
  runWithListPageTab?: RunWithListPageTab
  sendMessageToTab?: (tabId: number, message: ScanSubscriptionListMessage) => Promise<ScanSubscriptionListResultMessage>
  waitForContentScriptReady?: (tabId: number, sourceId: SourceId) => Promise<void>
}

export async function scanSubscriptionCandidatesFromSource(
  sourceId: SourceId,
  dependencies: ScanSubscriptionCandidatesFromSourceDependencies = {}
): Promise<SubscriptionCandidate[]> {
  const getAdapterById = dependencies.getAdapterById ?? getSubscriptionScanSourceAdapterById
  const adapter = getAdapterById(sourceId)
  if (!adapter?.subscriptionListScan) {
    return []
  }

  const runWithListPageTab = dependencies.runWithListPageTab ?? withListPageTab
  const sendMessageToTab = dependencies.sendMessageToTab ?? defaultSendMessageToTab
  const waitForContentScriptReady = dependencies.waitForContentScriptReady ?? defaultWaitForContentScriptReady

  const rawCandidates = await runWithListPageTab(adapter.subscriptionListScan.listPageUrl, async (tabId) => {
    await waitForContentScriptReady(tabId, sourceId)
    const response = await sendMessageToTab(tabId, {
      type: SCAN_SUBSCRIPTION_LIST_REQUEST,
      sourceId
    })

    if (!response?.ok) {
      throw new Error(response?.error ?? "Subscription scan failed in the content runtime.")
    }

    return response.candidates
  })

  return normalizeAndDedupeCandidates(sourceId, rawCandidates, (url) => adapter.matchesDetailUrl(url))
}

async function withListPageTab<T>(
  listPageUrl: string,
  run: (tabId: number) => Promise<T>
): Promise<T> {
  const tab = await getBrowser().tabs.create({
    url: listPageUrl,
    active: false
  })

  try {
    await waitForTabReady(tab.id!, 15000)
    return await run(tab.id!)
  } finally {
    await closeTabQuietly(tab.id!)
  }
}

async function waitForTabReady(tabId: number, timeoutMs: number): Promise<Browser.tabs.Tab> {
  return new Promise<Browser.tabs.Tab>((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const extensionBrowser = getBrowser()

    const cleanup = () => {
      extensionBrowser.tabs.onUpdated.removeListener(listener)
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
    }

    const listener = (
      updatedTabId: number,
      changeInfo: { status?: string },
      tab: Browser.tabs.Tab
    ) => {
      if (updatedTabId !== tabId) {
        return
      }

      if (changeInfo.status === "complete") {
        cleanup()
        resolve(tab)
      }
    }

    timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error("Timed out waiting for the list tab to finish loading."))
    }, timeoutMs)

    extensionBrowser.tabs.onUpdated.addListener(listener)

    void extensionBrowser.tabs
      .get(tabId)
      .then((tab) => {
        if (tab.status === "complete") {
          cleanup()
          resolve(tab)
        }
      })
      .catch(() => {
        cleanup()
        reject(new Error("The background list tab could not be opened."))
      })
  })
}

async function closeTabQuietly(tabId: number): Promise<void> {
  try {
    await getBrowser().tabs.remove(tabId)
  } catch {
    // Ignore already-closed tabs.
  }
}

function normalizeAndDedupeCandidates(
  sourceId: SourceId,
  candidates: SourceSubscriptionScanCandidate[],
  matchesDetailUrl: (url: URL) => boolean
): SubscriptionCandidate[] {
  const dedupe = new Set<string>()
  const normalized: SubscriptionCandidate[] = []

  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    if (!candidate || typeof candidate !== "object") {
      continue
    }

    const title = normalizeText(candidate.title)
    const detailUrl = normalizeUrl(candidate.detailUrl)
    const detailUrlObject = parseUrl(detailUrl)
    if (!title || !detailUrl || !detailUrlObject || !matchesDetailUrl(detailUrlObject)) {
      continue
    }

    const dedupeKey = `${sourceId}:${detailUrl}`
    if (dedupe.has(dedupeKey)) {
      continue
    }

    dedupe.add(dedupeKey)
    normalized.push({
      sourceId,
      title,
      normalizedTitle: title.toLowerCase(),
      detailUrl,
      magnetUrl: normalizeMagnetUrl(candidate.magnetUrl),
      torrentUrl: normalizeUrl(candidate.torrentUrl, detailUrl),
      subgroup: normalizeText(candidate.subgroup)
    })
  }

  return normalized
}

function normalizeText(value: string | undefined): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeMagnetUrl(value: string | undefined): string {
  const normalized = normalizeText(value)
  return /^magnet:/i.test(normalized) ? normalized : ""
}

function normalizeUrl(value: string | undefined, baseUrl?: string): string {
  const normalized = normalizeText(value)
  if (!normalized) {
    return ""
  }

  try {
    return new URL(normalized, baseUrl).href
  } catch {
    return ""
  }
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

async function defaultSendMessageToTab(
  tabId: number,
  message: ScanSubscriptionListMessage
): Promise<ScanSubscriptionListResultMessage> {
  return getBrowser().tabs.sendMessage(tabId, message)
}

async function defaultWaitForContentScriptReady(tabId: number, sourceId: SourceId): Promise<void> {
  await waitForContentScriptReadySignal(tabId, sourceId, 30000)
}
