import { describe, expect, it, vi } from "vitest"

import { fetchKisssubSubscriptionCandidates } from "../../../src/lib/subscriptions/source-fetch/kisssub"

describe("fetchKisssubSubscriptionCandidates", () => {
  it("parses rss items into kisssub candidates without prebuilt direct links", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `<?xml version="1.0" encoding="utf-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title><![CDATA[[LoliHouse] Episode 01]]></title>
              <link>https://www.kisssub.org/show-86584c42ac1abb6a346effaa1faff53448f1b71a.html</link>
            </item>
          </channel>
        </rss>`
    })

    await expect(fetchKisssubSubscriptionCandidates(fetchImpl as never)).resolves.toEqual([
      {
        sourceId: "kisssub",
        title: "[LoliHouse] Episode 01",
        detailUrl: "https://www.kisssub.org/show-86584c42ac1abb6a346effaa1faff53448f1b71a.html",
        magnetUrl: "",
        torrentUrl: "",
        subgroup: ""
      }
    ])
  })

  it("handles multiple items and skips malformed entries", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `<?xml version="1.0" encoding="utf-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title><![CDATA[[Group] Episode A]]></title>
              <link>https://www.kisssub.org/show-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.html</link>
            </item>
            <item>
              <title><![CDATA[Invalid Link]]></title>
              <link>https://www.kisssub.org/other-page.html</link>
            </item>
            <item>
              <title><![CDATA[[Group] Episode B]]></title>
              <link>https://www.kisssub.org/show-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.html</link>
            </item>
          </channel>
        </rss>`
    })

    const result = await fetchKisssubSubscriptionCandidates(fetchImpl as never)
    expect(result).toHaveLength(2)
    expect(result[0]?.title).toBe("[Group] Episode A")
    expect(result[1]?.title).toBe("[Group] Episode B")
  })

  it("throws when the rss request fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500
    })

    await expect(fetchKisssubSubscriptionCandidates(fetchImpl as never)).rejects.toThrow(
      "Kisssub subscription fetch failed: 500"
    )
  })
})
