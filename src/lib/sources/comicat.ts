import { normalizeTitle } from "../download-preparation"
import { getBrowser } from "../shared/browser"
import { DEFAULT_SOURCE_DELIVERY_MODES, getSupportedDeliveryModes } from "./delivery"
import { withDetailTab } from "./detail-tab"
import { matchesSourceHost } from "./matching"
import type { BatchItem, ExtractionResult } from "../shared/types"
import type { ExtractionContext, SourceAdapter } from "./types"

const ENTRY_SELECTOR = 'a[href*="show-"][href$=".html"]'
const VISITOR_TEST_PATHNAME = /^\/public\/html\/start\/?$/i
const VISITOR_TEST_FORM_SELECTOR = 'form[action*="page=visitor-test"]'
const MAIN_EXECUTION_WORLD = "MAIN" as const
const COMICAT_FIELD_FAILURE =
  "The Comicat detail page no longer exposes the fields required to build download links."

type ComicatDetailSnapshot = {
  title: string
  hash: string
  announce: string
  torrentUrl: string
}

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
}

function matchesHost(url: URL) {
  return matchesSourceHost("comicat", url)
}

function extractComicatDetailHash(detailUrl: string): string {
  const match = detailUrl.match(/show-([a-f0-9]{40})\.html/i)
  return match ? match[1].toLowerCase() : ""
}

function getComicatDetailAnchors(root: ParentNode, pageUrl: URL) {
  return Array.from(root.querySelectorAll<HTMLAnchorElement>(ENTRY_SELECTOR)).filter((anchor) => {
    try {
      return comicatSourceAdapter.matchesDetailUrl(
        new URL(anchor.getAttribute("href") || anchor.href, pageUrl.href)
      )
    } catch {
      return false
    }
  })
}

function isVisitorTestDocument(root: ParentNode): boolean {
  return Boolean(root.querySelector(VISITOR_TEST_FORM_SELECTOR))
}

export function parseComicatDetailSnapshot(
  snapshot: ComicatDetailSnapshot
): Omit<ExtractionResult, "detailUrl"> {
  const hash = normalizeText(snapshot.hash).toLowerCase()
  const announce = normalizeText(snapshot.announce)
  const torrentUrl = normalizeText(snapshot.torrentUrl)
  const magnetUrl = hash
    ? announce
      ? `magnet:?xt=urn:btih:${hash}&tr=${announce}`
      : `magnet:?xt=urn:btih:${hash}`
    : ""

  return {
    ok: Boolean(magnetUrl || torrentUrl),
    title: normalizeTitle(snapshot.title),
    hash,
    magnetUrl,
    torrentUrl,
    failureReason: magnetUrl || torrentUrl ? "" : COMICAT_FIELD_FAILURE
  }
}

async function executeExtraction(
  tabId: number,
  domSettleMs: number
): Promise<ComicatDetailSnapshot> {
  const execution = await getBrowser().scripting.executeScript({
    target: { tabId },
    world: MAIN_EXECUTION_WORLD,
    func: comicatDetailExtractionScript,
    args: [domSettleMs]
  })

  return execution[0]?.result as ComicatDetailSnapshot
}

export const comicatSourceAdapter: SourceAdapter = {
  id: "comicat",
  displayName: "Comicat",
  supportedDeliveryModes: getSupportedDeliveryModes("comicat"),
  defaultDeliveryMode: DEFAULT_SOURCE_DELIVERY_MODES.comicat,
  matchesListPage(url) {
    if (!matchesHost(url) || this.matchesDetailUrl(url)) {
      return false
    }

    return (
      url.pathname === "/" ||
      /^\/\d+\.html$/i.test(url.pathname) ||
      /^\/sort-\d+-\d+\.html$/i.test(url.pathname) ||
      /^\/(?:animovie|complete|discuss|cloudfile)-\d+\.html$/i.test(url.pathname) ||
      /^\/search\.php$/i.test(url.pathname)
    )
  },
  matchesListDocument(root, pageUrl) {
    if (!matchesHost(pageUrl) || this.matchesDetailUrl(pageUrl) || !VISITOR_TEST_PATHNAME.test(pageUrl.pathname)) {
      return false
    }

    if (isVisitorTestDocument(root)) {
      return false
    }

    return getComicatDetailAnchors(root, pageUrl).length > 0
  },
  matchesDetailUrl(url) {
    return matchesHost(url) && /\/show-[a-f0-9]{40}\.html$/i.test(url.pathname)
  },
  getDetailAnchors(root, pageUrl) {
    return getComicatDetailAnchors(root, pageUrl)
  },
  getBatchItemFromAnchor(anchor, pageUrl) {
    const title = normalizeText(anchor.textContent)
    if (!title) {
      return null
    }

    return {
      sourceId: "comicat",
      detailUrl: new URL(anchor.getAttribute("href") || anchor.href, pageUrl.href).href,
      title
    }
  },
  async extractSingleItem(item, context) {
    let lastFailure = "Unknown extraction error."

    for (let attempt = 0; attempt <= context.execution.retryCount; attempt += 1) {
      try {
        const snapshot = await withDetailTab(
          item.detailUrl,
          Math.max(context.execution.injectTimeoutMs, 10000),
          async (tabId) => executeExtraction(tabId, context.execution.domSettleMs)
        )

        return {
          ...parseComicatDetailSnapshot(snapshot),
          detailUrl: item.detailUrl
        }
      } catch (error: unknown) {
        lastFailure = error instanceof Error ? error.message : String(error)
      }
    }

    return {
      ok: false,
      title: item.title,
      detailUrl: item.detailUrl,
      hash: extractComicatDetailHash(item.detailUrl),
      magnetUrl: "",
      torrentUrl: "",
      failureReason: lastFailure
    }
  }
}

function comicatDetailExtractionScript(domSettleMs: number): Promise<ComicatDetailSnapshot> {
  const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))
  const normalize = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim()
  const html = () => document.documentElement.outerHTML
  const extractTorrentUrl = () => {
    const source = html()
    // Only trust down.php. Historical down-xxxx.torrent aliases can 404 and should be ignored.
    const downPhp =
      source.match(/down\.php\?date=\d+&amp;hash=[a-f0-9]+|down\.php\?date=\d+&hash=[a-f0-9]+/i)?.[0] ?? ""
    if (!downPhp) {
      return ""
    }
    return new URL(downPhp.replace(/&amp;/g, "&"), window.location.href).href
  }

  return (async () => {
    if (domSettleMs > 0) {
      await sleep(domSettleMs)
    }

    const config = (window as unknown as { Config?: Record<string, unknown> }).Config ?? {}
    return {
      title: normalize(config["bt_data_title"]) || document.title.replace(/\s*-\s*漫猫动漫.*$/u, "").trim(),
      hash: normalize(config["hash_id"]) || (window.location.pathname.match(/show-([a-f0-9]{40})\.html/i)?.[1] ?? ""),
      announce: normalize(config["announce"]),
      torrentUrl: extractTorrentUrl()
    }
  })()
}
