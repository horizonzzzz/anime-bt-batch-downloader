import type { DownloaderAdapter } from "../downloader"
import type { DownloaderConfig } from "../downloader/config/types"
import type {
  AppSettings,
  BatchEventPayload,
  BatchItem,
  BatchStats,
  ClassifiedBatchResult,
  ExtractionResult
} from "../shared/types"
import type { SourceConfig } from "../sources/config/types"

export type BatchJob = {
  sourceTabId: number
  stats: BatchStats
  results: ClassifiedBatchResult[]
  settings: AppSettings
  sourceConfig: SourceConfig
  savePath: string
}

export type BackgroundBatchDependencies = {
  saveSettings: (partialSettings: Partial<AppSettings>) => Promise<AppSettings>
  extractSingleItem: (item: BatchItem, settings: AppSettings) => Promise<ExtractionResult>
  sendBatchEvent: (tabId: number, payload: BatchEventPayload) => Promise<void>
  getDownloader: (config: DownloaderConfig) => DownloaderAdapter
  ensureDownloaderPermission: (config: DownloaderConfig) => Promise<void>
  fetchImpl?: typeof fetch
}
