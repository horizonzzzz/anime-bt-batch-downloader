import type { DownloaderConfig } from "../config/types"
import type { DownloaderUrlSubmissionResult } from "../types"
import type { QbTorrentFile } from "./types"

type FetchLike = typeof fetch

function getQbProfile(config: DownloaderConfig) {
  return config.profiles.qbittorrent
}

export async function addUrlsToQb(
  config: DownloaderConfig,
  urls: string[],
  options: {
    savePath?: string
  } = {},
  fetchImpl: FetchLike = fetch
): Promise<DownloaderUrlSubmissionResult> {
  if (!urls.length) {
    return {
      entries: []
    }
  }
  const qbProfile = getQbProfile(config)

  const formData = new FormData()
  formData.append("urls", urls.join("\n"))
  const savePath = String(options.savePath ?? "").trim()
  if (savePath) {
    formData.append("savepath", savePath)
  }

  const response = await fetchImpl(`${qbProfile.baseUrl}/api/v2/torrents/add`, {
    method: "POST",
    credentials: "include",
    body: formData
  })

  if (!response.ok) {
    throw new Error(`qBittorrent rejected the batch add request with HTTP ${response.status}.`)
  }

  return {
    entries: urls.map((url) => ({
      url,
      status: "submitted" as const
    }))
  }
}

export async function addTorrentFilesToQb(
  config: DownloaderConfig,
  torrents: QbTorrentFile[],
  options: {
    savePath?: string
  } = {},
  fetchImpl: FetchLike = fetch
): Promise<void> {
  if (!torrents.length) {
    return
  }
  const qbProfile = getQbProfile(config)

  const formData = new FormData()
  for (const torrent of torrents) {
    formData.append(
      "torrents",
      new File([torrent.blob], torrent.filename, {
        type: torrent.blob.type || "application/x-bittorrent"
      })
    )
  }

  const savePath = String(options.savePath ?? "").trim()
  if (savePath) {
    formData.append("savepath", savePath)
  }

  const response = await fetchImpl(`${qbProfile.baseUrl}/api/v2/torrents/add`, {
    method: "POST",
    credentials: "include",
    body: formData
  })

  if (!response.ok) {
    throw new Error(`qBittorrent rejected the torrent file upload with HTTP ${response.status}.`)
  }
}