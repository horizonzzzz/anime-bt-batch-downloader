import type { Settings } from "../shared/types"

export type DownloaderId = "qbittorrent"

export type DownloaderSubmitOptions = {
  savePath?: string
}

export type DownloaderTorrentFile = {
  filename: string
  blob: Blob
}

export type DownloaderConnectionResult = {
  baseUrl: string
  version: string
}

export type DownloaderAdapter = {
  id: DownloaderId
  displayName: string
  authenticate: (settings: Settings) => Promise<void>
  addUrls: (
    settings: Settings,
    urls: string[],
    options?: DownloaderSubmitOptions
  ) => Promise<void>
  addTorrentFiles: (
    settings: Settings,
    torrents: DownloaderTorrentFile[],
    options?: DownloaderSubmitOptions
  ) => Promise<void>
  testConnection: (settings: Settings) => Promise<DownloaderConnectionResult>
}
