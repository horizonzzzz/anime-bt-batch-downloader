import type { PageSubscriptionScanner, DeclarativeScanSchema } from "./types"
import type { SourceSubscriptionScanCandidate } from "../../sources/types"

import { runDeclarativeSubscriptionScan } from "./engine"

/**
 * ACG.RIP list scan row selector.
 */
const LIST_SCAN_ROW_SELECTOR = "table tr"

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
 * Check if a path matches ACG.RIP detail URL pattern.
 */
function matchesDetailPath(value: string): boolean {
  return /\/t\/\d+$/i.test(value)
}

/**
 * Check if a path matches ACG.RIP torrent file pattern.
 */
function matchesTorrentPath(value: string): boolean {
  return /\/t\/\d+\.torrent$/i.test(value)
}

/**
 * Find the detail anchor (link to /t/{id}) in an ACG.RIP table row.
 */
function findDetailAnchor(row: HTMLElement): HTMLAnchorElement | null {
  const anchors = row.querySelectorAll<HTMLAnchorElement>('a[href^="/t/"], a[href*="/t/"]')

  for (const anchor of Array.from(anchors)) {
    const detailUrl = resolveUrl(anchor.getAttribute("href") || anchor.href)
    if (!detailUrl) {
      continue
    }

    try {
      if (matchesDetailPath(new URL(detailUrl).pathname)) {
        return anchor
      }
    } catch {
      // Ignore malformed URLs and keep searching
    }
  }

  return null
}

/**
 * Find the torrent download URL in an ACG.RIP table row.
 */
function findTorrentUrl(row: HTMLElement): string {
  const anchors = row.querySelectorAll<HTMLAnchorElement>(
    'a[href$=".torrent"], a[href*=".torrent"]'
  )

  for (const candidate of Array.from(anchors)) {
    const candidateUrl = resolveUrl(candidate.getAttribute("href") || candidate.href)
    if (!candidateUrl) {
      continue
    }

    try {
      if (matchesTorrentPath(new URL(candidateUrl).pathname)) {
        return candidateUrl
      }
    } catch {
      // Ignore malformed torrent URLs and keep searching
    }
  }

  return ""
}

/**
 * Extract a subscription candidate from an ACG.RIP table row.
 */
function extractCandidateFromRow(row: HTMLElement): SourceSubscriptionScanCandidate | null {
  const detailAnchor = findDetailAnchor(row)
  if (!detailAnchor) {
    return null
  }

  const detailUrl = resolveUrl(detailAnchor.getAttribute("href") || detailAnchor.href)
  if (!detailUrl) {
    return null
  }

  const title = normalize(detailAnchor.textContent)
  if (!title) {
    return null
  }

  const torrentUrl = findTorrentUrl(row)

  return {
    sourceId: "acgrip",
    title,
    detailUrl,
    magnetUrl: "",
    torrentUrl,
    subgroup: ""
  }
}

/**
 * Declarative scan schema for ACG.RIP.
 */
const acgRipScanSchema: DeclarativeScanSchema = {
  listSelector: LIST_SCAN_ROW_SELECTOR,
  extractCandidate: extractCandidateFromRow
}

/**
 * Create the ACG.RIP page-side scanner.
 */
export function createAcgRipScanner(): PageSubscriptionScanner {
  return {
    sourceId: "acgrip",
    async scan() {
      return runDeclarativeSubscriptionScan(acgRipScanSchema)
    }
  }
}