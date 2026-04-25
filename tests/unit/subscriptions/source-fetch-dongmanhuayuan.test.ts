import { describe, expect, it, vi } from "vitest"

import { fetchDongmanhuayuanSubscriptionCandidates } from "../../../src/lib/subscriptions/source-fetch/dongmanhuayuan"

describe("fetchDongmanhuayuanSubscriptionCandidates", () => {
  it("parses detail URLs from fetched Dongmanhuayuan list HTML without opening a tab", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        `
          <table>
            <tbody>
              <tr><td><a href="/detail/7XROA.html">资源一</a></td></tr>
              <tr><td><a href="https://www.dongmanhuayuan.com/detail/69Q29.html">资源二</a></td></tr>
            </tbody>
          </table>
        `,
        { status: 200, headers: { "Content-Type": "text/html" } }
      )
    )

    await expect(fetchDongmanhuayuanSubscriptionCandidates(fetchImpl)).resolves.toEqual([
      {
        sourceId: "dongmanhuayuan",
        title: "资源一",
        detailUrl: "https://www.dongmanhuayuan.com/detail/7XROA.html",
        magnetUrl: "",
        torrentUrl: "",
        subgroup: ""
      },
      {
        sourceId: "dongmanhuayuan",
        title: "资源二",
        detailUrl: "https://www.dongmanhuayuan.com/detail/69Q29.html",
        magnetUrl: "",
        torrentUrl: "",
        subgroup: ""
      }
    ])

    expect(fetchImpl).toHaveBeenCalledWith("https://www.dongmanhuayuan.com/")
  })

  it("throws on HTTP error response", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 500 }))

    await expect(fetchDongmanhuayuanSubscriptionCandidates(fetchImpl)).rejects.toThrow(
      "Dongmanhuayuan subscription fetch failed: 500"
    )
  })
})
