import { describe, expect, it } from "vitest"

import {
  normalizeBatchItems
} from "../../../src/lib/background/preparation"

describe("normalizeBatchItems", () => {
  it("keeps valid source-aware items, normalizes prepared candidates, and de-duplicates repeats", () => {
    expect(
      normalizeBatchItems([
        null,
        {
          sourceId: "kisssub",
          detailUrl: "https://www.kisssub.org/show-deadbeef.html",
          title: "  Episode   01  "
        },
        {
          sourceId: "kisssub",
          detailUrl: "https://www.kisssub.org/show-deadbeef.html",
          title: "Duplicate"
        },
        {
          sourceId: "kisssub",
          detailUrl: "https://www.dongmanhuayuan.com/detail/G8Xvr.html",
          title: "Wrong site"
        },
        {
          sourceId: "dongmanhuayuan",
          detailUrl: "https://www.dongmanhuayuan.com/detail/G8Xvr.html",
          title: "Movie pack"
        },
        {
          sourceId: "acgrip",
          detailUrl: "https://acg.rip/t/350361",
          title: "",
          torrentUrl: "/t/350361.torrent"
        },
        {
          sourceId: "bangumimoe",
          detailUrl: "https://bangumi.moe/torrent/69c28b1384f11a93b5ff76a6",
          title: "[ANi] Episode 01",
          magnetUrl: " magnet:?xt=urn:btih:fbb0a8643346ca3e2d75a30c346113d12b268044 "
        },
        {
          sourceId: "unknown",
          detailUrl: "https://example.com/ignored",
          title: "Ignored"
        }
      ])
    ).toEqual([
      {
        sourceId: "kisssub",
        detailUrl: "https://www.kisssub.org/show-deadbeef.html",
        title: "Episode 01"
      },
      {
        sourceId: "dongmanhuayuan",
        detailUrl: "https://www.dongmanhuayuan.com/detail/G8Xvr.html",
        title: "Movie pack"
      },
      {
        sourceId: "acgrip",
        detailUrl: "https://acg.rip/t/350361",
        title: "https://acg.rip/t/350361",
        torrentUrl: "https://acg.rip/t/350361.torrent"
      },
      {
        sourceId: "bangumimoe",
        detailUrl: "https://bangumi.moe/torrent/69c28b1384f11a93b5ff76a6",
        title: "[ANi] Episode 01",
        magnetUrl: "magnet:?xt=urn:btih:fbb0a8643346ca3e2d75a30c346113d12b268044"
      }
    ])
  })
})
