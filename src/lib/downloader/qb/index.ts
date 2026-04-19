import type { DownloaderAdapter } from "../types"
import { loginQb, qbFetchText } from "./submission"
import { getQbLoginErrorMessage } from "./errors"
import { addTorrentFilesToQb, addUrlsToQb } from "./client"
export type { QbTorrentFile } from "./types"

export const qbDownloaderAdapter: DownloaderAdapter = {
  id: "qbittorrent",
  displayName: "qBittorrent",
  authenticate: loginQb,
  addUrls: addUrlsToQb,
  addTorrentFiles: addTorrentFilesToQb,
  async testConnection(config) {
    await loginQb(config)
    const version = await qbFetchText(config, "/api/v2/app/version", { method: "GET" })

    return {
      baseUrl: config.profiles.qbittorrent.baseUrl,
      version: version.trim() || "unknown"
    }
  }
}

export { qbFetchText, loginQb } from "./submission"
export { getQbLoginErrorMessage } from "./errors"
export { addTorrentFilesToQb, addUrlsToQb } from "./client"