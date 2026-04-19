import type { DownloaderId } from "../../shared/types"
import { getDownloaderConfig } from "../../downloader/config/storage"

export type HistoryPageContext = {
  currentDownloaderId: DownloaderId
}

export async function getHistoryPageContext(): Promise<HistoryPageContext> {
  const config = await getDownloaderConfig()
  return {
    currentDownloaderId: config.activeId
  }
}