import type { SourceSubscriptionScanCandidate } from "../../sources/types"
import type { SubscriptionSourceFetchFunction, SubscriptionSourceFetcher } from "./types"

const DONGMANHUAYUAN_LIST_URL = "https://www.dongmanhuayuan.com/"
const DETAIL_ANCHOR_PATTERN =
  /<a\b[^>]*href="([^"]*\/detail\/[a-z0-9]+\.html)"[^>]*>([\s\S]*?)<\/a>/giu
const HTML_TAG_PATTERN = /<[^>]+>/g
const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  "#39": "'"
}

function normalize(value: string | null | undefined) {
  return decodeHtmlEntities(String(value ?? ""))
    .replace(HTML_TAG_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function absolutize(path: string) {
  return new URL(path, DONGMANHUAYUAN_LIST_URL).href
}

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (entity, token: string) => {
    const normalizedToken = token.toLowerCase()
    const namedEntity = NAMED_HTML_ENTITIES[normalizedToken]
    if (namedEntity) {
      return namedEntity
    }

    if (normalizedToken.startsWith("#x")) {
      const codePoint = Number.parseInt(normalizedToken.slice(2), 16)
      return Number.isNaN(codePoint) ? entity : String.fromCodePoint(codePoint)
    }

    if (normalizedToken.startsWith("#")) {
      const codePoint = Number.parseInt(normalizedToken.slice(1), 10)
      return Number.isNaN(codePoint) ? entity : String.fromCodePoint(codePoint)
    }

    return entity
  })
}

export async function fetchDongmanhuayuanSubscriptionCandidates(
  fetchImpl: SubscriptionSourceFetchFunction = fetch
): Promise<SourceSubscriptionScanCandidate[]> {
  const response = await fetchImpl(DONGMANHUAYUAN_LIST_URL)
  if (!response.ok) {
    throw new Error(`Dongmanhuayuan subscription fetch failed: ${response.status}`)
  }

  const html = await response.text()
  const detailMatches = html.matchAll(DETAIL_ANCHOR_PATTERN)
  const results: SourceSubscriptionScanCandidate[] = []

  for (const detailMatch of detailMatches) {
    const detailUrl = detailMatch[1]
    const title = normalize(detailMatch[2])

    if (!detailUrl || !title) {
      continue
    }

    results.push({
      sourceId: "dongmanhuayuan",
      title,
      detailUrl: absolutize(detailUrl),
      magnetUrl: "",
      torrentUrl: "",
      subgroup: ""
    })
  }

  return results
}

export const dongmanhuayuanSubscriptionSourceFetcher: SubscriptionSourceFetcher = {
  sourceId: "dongmanhuayuan",
  fetchCandidates(fetchImpl) {
    return fetchDongmanhuayuanSubscriptionCandidates(fetchImpl)
  }
}
