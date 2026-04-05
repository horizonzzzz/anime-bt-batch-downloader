import { describe, expect, it } from "vitest"

import { SUPPORTED_DOWNLOADERS, getDownloaderAdapter, getDownloaderMeta } from "../../../lib/downloader"

describe("downloader registry", () => {
  it("returns the qBittorrent adapter and metadata as the current supported downloader", () => {
    const adapter = getDownloaderAdapter("qbittorrent")
    const meta = getDownloaderMeta("qbittorrent")

    expect(adapter.id).toBe("qbittorrent")
    expect(adapter.displayName).toBe("qBittorrent")
    expect(meta).toEqual({
      id: "qbittorrent",
      displayName: "qBittorrent"
    })
    expect(SUPPORTED_DOWNLOADERS).toEqual([meta])
  })
})
