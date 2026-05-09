import type { SourceSubscriptionScanCandidate } from "../../sources/types"
import { extractRssItems, extractRssTagValue } from "./rss"
import type { SubscriptionSourceFetchFunction, SubscriptionSourceFetcher } from "./types"

const KISSSUB_RSS_URL = "https://www.kisssub.org/rss.xml"

function extractDetailHash(detailUrl: string) {
  const match = detailUrl.match(/show-([a-f0-9]{40})\.html/i)
  return match ? match[1].toLowerCase() : ""
}

export async function fetchKisssubSubscriptionCandidates(
  fetchImpl: SubscriptionSourceFetchFunction = fetch
): Promise<SourceSubscriptionScanCandidate[]> {
  const response = await fetchImpl(KISSSUB_RSS_URL)
  if (!response.ok) {
    throw new Error(`Kisssub subscription fetch failed: ${response.status}`)
  }

  const xml = await response.text()
  const items = extractRssItems(xml)

  return items.flatMap((item) => {
    const title = extractRssTagValue(item, "title")
    const detailUrl = extractRssTagValue(item, "link")
    const hash = extractDetailHash(detailUrl)
    if (!title || !detailUrl || !hash) {
      return []
    }

    return [{
      sourceId: "kisssub",
      title,
      detailUrl,
      magnetUrl: "",
      torrentUrl: "",
      subgroup: ""
    }]
  })
}

export const kisssubSubscriptionSourceFetcher: SubscriptionSourceFetcher = {
  sourceId: "kisssub",
  fetchCandidates(fetchImpl) {
    return fetchKisssubSubscriptionCandidates(fetchImpl)
  }
}
