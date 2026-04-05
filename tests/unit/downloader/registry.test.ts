import { describe, expect, it } from "vitest"

import { getDefaultDownloaderAdapter } from "../../../lib/downloader"

describe("downloader registry", () => {
  it("returns the qBittorrent adapter as the current default", () => {
    const adapter = getDefaultDownloaderAdapter()

    expect(adapter.id).toBe("qbittorrent")
    expect(adapter.displayName).toBe("qBittorrent")
  })
})
