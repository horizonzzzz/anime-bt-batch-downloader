import type { DownloaderId } from "../shared/types"
import type { DownloaderAdapter } from "./types"
import { qbDownloaderAdapter } from "./qb"

export type DownloaderMeta = {
  id: DownloaderId
  displayName: string
}

const DOWNLOADER_ADAPTERS: Record<DownloaderId, DownloaderAdapter> = {
  qbittorrent: qbDownloaderAdapter
}

export const SUPPORTED_DOWNLOADERS: DownloaderMeta[] = [
  {
    id: "qbittorrent",
    displayName: "qBittorrent"
  }
]

export function getDownloaderAdapter(id: DownloaderId): DownloaderAdapter {
  return DOWNLOADER_ADAPTERS[id]
}

export function getDownloaderMeta(id: DownloaderId): DownloaderMeta {
  const meta = SUPPORTED_DOWNLOADERS.find((entry) => entry.id === id)
  if (!meta) {
    throw new Error(`Unsupported downloader: ${id}`)
  }

  return meta
}
