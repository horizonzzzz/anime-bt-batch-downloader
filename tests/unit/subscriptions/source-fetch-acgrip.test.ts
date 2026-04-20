import { describe, expect, it, vi } from "vitest"
import { fetchAcgRipSubscriptionCandidates } from "../../../src/lib/subscriptions/source-fetch/acgrip"

describe("fetchAcgRipSubscriptionCandidates", () => {
  it("parses detail and torrent urls from fetched list HTML without opening a tab", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        `
          <table>
            <tr>
              <td><a href="/t/100">[LoliHouse] Medalist - 01 [1080p]</a></td>
              <td><a href="/t/100.torrent">Torrent</a></td>
            </tr>
            <tr>
              <td><a href="/t/101">[LoliHouse] Medalist - 02 [1080p]</a></td>
              <td><a href="/t/101.torrent">Torrent</a></td>
            </tr>
          </table>
        `,
        { status: 200, headers: { "Content-Type": "text/html" } }
      )
    )

    await expect(fetchAcgRipSubscriptionCandidates(fetchImpl)).resolves.toEqual([
      {
        sourceId: "acgrip",
        title: "[LoliHouse] Medalist - 01 [1080p]",
        detailUrl: "https://acg.rip/t/100",
        magnetUrl: "",
        torrentUrl: "https://acg.rip/t/100.torrent",
        subgroup: ""
      },
      {
        sourceId: "acgrip",
        title: "[LoliHouse] Medalist - 02 [1080p]",
        detailUrl: "https://acg.rip/t/101",
        magnetUrl: "",
        torrentUrl: "https://acg.rip/t/101.torrent",
        subgroup: ""
      }
    ])

    expect(fetchImpl).toHaveBeenCalledWith("https://acg.rip/")
  })
})