import type { DownloaderId } from "../../shared/types"

export type DownloaderProfile = {
  baseUrl: string
  username: string
  password: string
}

export type DownloaderConfig = {
  activeId: DownloaderId
  profiles: {
    qbittorrent: DownloaderProfile
    transmission: DownloaderProfile
  }
}