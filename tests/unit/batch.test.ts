import { describe, expect, it } from "vitest"

import { classifyExtractionResult } from "../../lib/batch"

describe("classifyExtractionResult", () => {
  it("prefers magnet submissions and records the btih hash", () => {
    const seenHashes = new Set<string>()
    const seenUrls = new Set<string>()

    expect(
      classifyExtractionResult(
        {
          ok: true,
          title: "Episode 01",
          detailUrl: "https://www.kisssub.org/show-deadbeef.html",
          hash: "deadbeef",
          magnetUrl: "magnet:?xt=urn:btih:ABCDEF123456",
          torrentUrl: "https://example.com/file.torrent",
          failureReason: ""
        },
        seenHashes,
        seenUrls
      )
    ).toMatchObject({
      status: "ready",
      submitKind: "magnet",
      submitUrl: "magnet:?xt=urn:btih:ABCDEF123456",
      message: "Magnet resolved and queued for submission."
    })

    expect(seenHashes.has("abcdef123456")).toBe(true)
  })

  it("marks duplicate torrent urls without preparing a submission", () => {
    const seenHashes = new Set<string>()
    const seenUrls = new Set<string>(["https://example.com/file.torrent"])

    expect(
      classifyExtractionResult(
        {
          ok: true,
          title: "Episode 02",
          detailUrl: "https://www.kisssub.org/show-feedface.html",
          hash: "feedface",
          magnetUrl: "",
          torrentUrl: "https://example.com/file.torrent",
          failureReason: ""
        },
        seenHashes,
        seenUrls
      )
    ).toMatchObject({
      status: "duplicate",
      message: "Duplicate torrent URL skipped."
    })
  })
})
