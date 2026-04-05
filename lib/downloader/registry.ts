import type { DownloaderAdapter } from "./types"
import { qbDownloaderAdapter } from "./qb"

const DEFAULT_DOWNLOADER_ADAPTER: DownloaderAdapter = qbDownloaderAdapter

export function getDefaultDownloaderAdapter(): DownloaderAdapter {
  return DEFAULT_DOWNLOADER_ADAPTER
}
