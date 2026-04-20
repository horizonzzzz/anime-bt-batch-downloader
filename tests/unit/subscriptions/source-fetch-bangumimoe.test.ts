import { describe, expect, it, vi } from "vitest"
import { fetchBangumiMoeSubscriptionCandidates } from "../../../src/lib/subscriptions/source-fetch/bangumimoe"

describe("fetchBangumiMoeSubscriptionCandidates", () => {
  it("reads latest torrents from the Bangumi API without a list-page tab", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          torrents: [
            {
              _id: "69e5c31584f11a93b597ac80",
              title: "[LoliHouse] Medalist - 01 [1080p]",
              magnet: "magnet:?xt=urn:btih:AAA111"
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )

    await expect(fetchBangumiMoeSubscriptionCandidates(fetchImpl)).resolves.toEqual([
      {
        sourceId: "bangumimoe",
        title: "[LoliHouse] Medalist - 01 [1080p]",
        detailUrl: "https://bangumi.moe/torrent/69e5c31584f11a93b597ac80",
        magnetUrl: "magnet:?xt=urn:btih:AAA111",
        torrentUrl:
          "https://bangumi.moe/download/torrent/69e5c31584f11a93b597ac80/%5BLoliHouse%5D%20Medalist%20-%2001%20%5B1080p%5D.torrent",
        subgroup: ""
      }
    ])

    expect(fetchImpl).toHaveBeenCalledWith("https://bangumi.moe/api/torrent/latest")
  })
})
