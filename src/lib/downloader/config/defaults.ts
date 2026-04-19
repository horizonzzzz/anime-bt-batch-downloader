import type { DownloaderConfig } from "./types"

export const DEFAULT_DOWNLOADER_CONFIG: DownloaderConfig = Object.freeze({
  activeId: "qbittorrent",
  profiles: {
    qbittorrent: {
      baseUrl: "http://127.0.0.1:7474",
      username: "",
      password: ""
    },
    transmission: {
      baseUrl: "http://127.0.0.1:9091/transmission/rpc",
      username: "",
      password: ""
    }
  }
})