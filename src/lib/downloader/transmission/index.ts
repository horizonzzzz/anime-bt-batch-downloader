import type { DownloaderAdapter } from "../types"
import { authenticateTransmission, transmissionRpc } from "./client"
import { addTorrentFilesToTransmission, addUrlsToTransmission } from "./submission"

export const transmissionDownloaderAdapter: DownloaderAdapter = {
  id: "transmission",
  displayName: "Transmission",
  authenticate: authenticateTransmission,
  addUrls: addUrlsToTransmission,
  addTorrentFiles: addTorrentFilesToTransmission,
  async testConnection(config, fetchImpl = fetch) {
    const result = await transmissionRpc<{ version?: string }>(
      config,
      "session-get",
      {},
      fetchImpl
    )

    return {
      baseUrl: config.profiles.transmission.baseUrl,
      version: result.arguments?.version?.trim() || "unknown"
    }
  }
}

export { authenticateTransmission, transmissionRpc } from "./client"
export { addTorrentFilesToTransmission, addUrlsToTransmission } from "./submission"