import type { DownloaderConfig } from "./config/types"

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

export type DownloaderUrlSubmissionEntry = {
  url: string
  status: "submitted" | "duplicate" | "failed"
  error?: string
}

export type DownloaderUrlSubmissionResult = {
  entries: DownloaderUrlSubmissionEntry[]
}

export type DownloaderAdapter = {
  id: DownloaderConfig["activeId"]
  displayName: string
  authenticate: (config: DownloaderConfig) => Promise<void>
  addUrls: (
    config: DownloaderConfig,
    urls: string[],
    options?: DownloaderSubmitOptions
  ) => Promise<DownloaderUrlSubmissionResult>
  addTorrentFiles: (
    config: DownloaderConfig,
    torrents: DownloaderTorrentFile[],
    options?: DownloaderSubmitOptions
  ) => Promise<void>
  testConnection: (config: DownloaderConfig) => Promise<DownloaderConnectionResult>
}
