import type { PageSubscriptionScanner } from "./types"
import type { SourceSubscriptionScanCandidate } from "../../sources/types"

/**
 * Bangumi list scan item selector.
 */
const LIST_SCAN_ITEM_SELECTOR = "md-list.torrent-list md-list-item, .torrent-list md-list-item"

/**
 * Poll interval for DOM stabilization checks.
 */
const POLL_INTERVAL_MS = 100

/**
 * Time window to consider DOM stable (no changes for this duration).
 */
const STABLE_WINDOW_MS = 300

/**
 * Maximum time to wait for stabilization.
 */
const MAX_WAIT_MS = 1500

/**
 * Sleep helper for async polling.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/**
 * Normalize text content by collapsing whitespace and trimming.
 */
function normalize(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Resolve a URL relative to the current page location.
 */
function resolveUrl(value: string): string {
  try {
    return new URL(value, window.location.href).href
  } catch {
    return ""
  }
}

/**
 * Get the title from a Bangumi torrent anchor element.
 *
 * Bangumi's DOM structure varies, so we search for the title in several places:
 * - h3 > span (most common)
 * - .torrent-title > h3 > .ng-binding or h3 > span
 * - .md-tile-content > .torrent-title > h3
 */
function getTitleFromAnchor(anchor: HTMLAnchorElement): string {
  const titleNode =
    anchor.closest("h3")?.querySelector("span") ||
    anchor.closest(".torrent-title")?.querySelector("h3 .ng-binding, h3 span, h3") ||
    anchor
      .closest(".md-tile-content")
      ?.querySelector(".torrent-title h3 .ng-binding, .torrent-title h3 span, .torrent-title h3")

  return normalize(titleNode?.textContent)
}

/**
 * Collect subscription candidates from the current DOM state.
 */
function collectCandidates(): SourceSubscriptionScanCandidate[] {
  const candidates: SourceSubscriptionScanCandidate[] = []
  const listItems = Array.from(document.querySelectorAll<HTMLElement>(LIST_SCAN_ITEM_SELECTOR))

  for (const listItem of listItems) {
    // Find the detail anchor (link to /torrent/{id})
    const anchor = Array.from(
      listItem.querySelectorAll<HTMLAnchorElement>(
        'a[href^="/torrent/"][target="_blank"], a[href*="/torrent/"][target="_blank"]'
      )
    ).find((candidate) => {
      const detailUrl = resolveUrl(candidate.getAttribute("href") || candidate.href)
      if (!detailUrl) {
        return false
      }

      try {
        return /\/torrent\/[a-f0-9]+$/i.test(new URL(detailUrl).pathname)
      } catch {
        return false
      }
    })

    if (!anchor) {
      continue
    }

    const detailUrl = resolveUrl(anchor.getAttribute("href") || anchor.href)
    if (!detailUrl) {
      continue
    }

    const title = getTitleFromAnchor(anchor)
    if (!title) {
      continue
    }

    candidates.push({
      sourceId: "bangumimoe",
      title,
      detailUrl,
      magnetUrl: "",
      torrentUrl: "",
      subgroup: ""
    })
  }

  return candidates
}

/**
 * Generate a signature for a list of candidates to detect changes.
 */
function getSignature(candidates: SourceSubscriptionScanCandidate[]): string {
  return candidates.map((candidate) => `${candidate.detailUrl}|${candidate.title}`).join("\n")
}

/**
 * Run async-stabilized subscription scan for Bangumi.
 *
 * Bangumi uses Angular, which hydrates the DOM asynchronously. We poll for
 * DOM changes and return candidates only after the DOM stabilizes (no changes
 * for STABLE_WINDOW_MS) or timeout expires.
 */
async function runAsyncStabilizedScan(): Promise<SourceSubscriptionScanCandidate[]> {
  const deadline = Date.now() + MAX_WAIT_MS
  let latestCandidates = collectCandidates()
  let latestSignature = getSignature(latestCandidates)
  let lastChangeAt = Date.now()

  while (Date.now() < deadline) {
    // If we have candidates and DOM has been stable, return them
    if (latestCandidates.length > 0 && Date.now() - lastChangeAt >= STABLE_WINDOW_MS) {
      return latestCandidates
    }

    await sleep(POLL_INTERVAL_MS)

    // Check for DOM changes
    const candidates = collectCandidates()
    const signature = getSignature(candidates)
    if (signature !== latestSignature) {
      latestCandidates = candidates
      latestSignature = signature
      lastChangeAt = Date.now()
    }
  }

  // Timeout expired, return whatever we have
  return latestCandidates
}

/**
 * Create the Bangumi page-side scanner.
 */
export function createBangumiMoeScanner(): PageSubscriptionScanner {
  return {
    sourceId: "bangumimoe",
    async scan() {
      return runAsyncStabilizedScan()
    }
  }
}