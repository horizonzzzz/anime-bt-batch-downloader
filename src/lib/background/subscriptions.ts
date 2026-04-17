import type { DownloaderAdapter, DownloaderTorrentFile } from "../downloader"
import { getDownloaderAdapter } from "../downloader"
import { getExtensionUrl, getBrowser } from "../shared/browser"
import type { BatchItem, ExtractionResult, Settings } from "../shared/types"
import { getSettings, mergeSettings, sanitizeSettings, saveSettings } from "../settings"
import { extractSingleItem } from "../sources/extraction"
import {
  buildSubscriptionRoundNotification,
  ensureSubscriptionAlarm,
  SubscriptionManager
} from "../subscriptions"
import type {
  DownloadSubscriptionHitsRequest,
  DownloadSubscriptionHitsResult,
  ScanSubscriptionsDependencies,
  ScanSubscriptionsResult,
  SubscriptionAlarmApi,
  SubscriptionRoundNotificationPayload
} from "../subscriptions"
import {
  createSettingsSubscriptionRuntimeRepository,
  type SubscriptionRuntimeRepository,
  type SubscriptionRuntimeSettingsPatch
} from "../subscriptions/runtime-repository"
import { fetchTorrentForUpload } from "./torrent-file"
import { i18n } from "../i18n"

let queuedSubscriptionMutation: Promise<void> = Promise.resolve()

export type ExecuteSubscriptionScanDependencies = ScanSubscriptionsDependencies & {
  runtimeRepository?: SubscriptionRuntimeRepository
  getSettings?: () => Promise<Settings>
  saveSettings?: (settings: SubscriptionRuntimeSettingsPatch) => Promise<Settings>
  createNotification?: (
    notificationId: string,
    options: SubscriptionRoundNotificationPayload["options"]
  ) => Promise<unknown>
}

export type ReconcileSubscriptionAlarmDependencies = {
  getSettings?: () => Promise<Settings>
  alarms?: SubscriptionAlarmApi
}

export type SaveSubscriptionAwareSettingsDependencies = {
  getSettings?: () => Promise<Settings>
  saveSettings?: (settings: Partial<Settings>) => Promise<Settings>
}

export type DownloadSubscriptionHitsDependencies = {
  runtimeRepository?: SubscriptionRuntimeRepository
  getSettings?: () => Promise<Settings>
  saveSettings?: (settings: SubscriptionRuntimeSettingsPatch) => Promise<Settings>
  getDownloader?: (settings: Settings) => DownloaderAdapter
  fetchTorrentForUpload?: (torrentUrl: string) => Promise<DownloaderTorrentFile>
  extractSingleItem?: (item: BatchItem, settings: Settings) => Promise<ExtractionResult>
  now?: () => string
}

export async function executeSubscriptionScan(
  dependencies: ExecuteSubscriptionScanDependencies = {}
): Promise<ScanSubscriptionsResult> {
  return enqueueSubscriptionMutation(() => executeSubscriptionScanOnce(dependencies))
}

export async function reconcileSubscriptionAlarm(
  dependencies: ReconcileSubscriptionAlarmDependencies = {}
): Promise<void> {
  const getSettingsImpl = dependencies.getSettings ?? getSettings
  const alarms = dependencies.alarms ?? getBrowser().alarms
  const settings = await getSettingsImpl()

  await ensureSubscriptionAlarm(settings, alarms)
}

export async function saveSettingsWithSubscriptionReconcile(
  settingsPatch: Partial<Settings>,
  dependencies: SaveSubscriptionAwareSettingsDependencies = {}
): Promise<Settings> {
  return enqueueSubscriptionMutation(() =>
    saveSettingsWithSubscriptionReconcileOnce(settingsPatch, dependencies)
  )
}

export async function downloadSubscriptionHits(
  request: DownloadSubscriptionHitsRequest,
  dependencies: DownloadSubscriptionHitsDependencies = {}
): Promise<DownloadSubscriptionHitsResult> {
  return enqueueSubscriptionMutation(() =>
    downloadSubscriptionHitsOnce(request, dependencies)
  )
}

async function executeSubscriptionScanOnce(
  dependencies: ExecuteSubscriptionScanDependencies
): Promise<ScanSubscriptionsResult> {
  const runtimeRepository = resolveRuntimeRepository(dependencies)
  const createNotificationImpl =
    dependencies.createNotification ?? createBrowserNotification
  const loaded = await runtimeRepository.load()
  const manager = new SubscriptionManager(loaded.settings, loaded.runtimeSnapshot)
  const result = await manager.scan({
    now: dependencies.now,
    scanCandidatesFromSource: dependencies.scanCandidatesFromSource
  })
  const savedSettings = await runtimeRepository.save(result.runtimeSnapshot)
  const { runtimeSnapshot: _runtimeSnapshot, ...scanResult } = result

  if (result.notificationRound && result.settings.notificationsEnabled) {
    const hitCount = result.notificationRound.hitIds.length
    const notification = buildSubscriptionRoundNotification(
      result.notificationRound,
      {
        title: i18n.t("subscriptions.notification.title"),
        message:
          hitCount === 1
            ? i18n.t("subscriptions.notification.messageOne")
            : i18n.t("subscriptions.notification.messageMany", [hitCount])
      },
      {
        iconUrl: getExtensionUrl("icon.png")
      }
    )
    try {
      await createNotificationImpl(notification.id, notification.options)
    } catch {
      // Notification delivery is best-effort once the scan result has been persisted.
    }
  }

  return {
    ...scanResult,
    settings: savedSettings
  }
}

async function saveSettingsWithSubscriptionReconcileOnce(
  settingsPatch: Partial<Settings>,
  dependencies: SaveSubscriptionAwareSettingsDependencies = {}
): Promise<Settings> {
  const saveSettingsImpl = dependencies.saveSettings ?? defaultSaveSettings

  if (!Object.prototype.hasOwnProperty.call(settingsPatch, "subscriptions")) {
    return saveSettingsImpl(settingsPatch)
  }

  const getSettingsImpl = dependencies.getSettings ?? getSettings
  const currentSettings = await getSettingsImpl()
  const mergedSettings = sanitizeSettings(mergeSettings(currentSettings, settingsPatch))
  const manager = new SubscriptionManager(currentSettings)
  const runtimePatch =
    manager.reconcileAfterEditPatch(
      currentSettings.subscriptions,
      mergedSettings.subscriptions
    ) ?? {}

  return saveSettingsImpl({
    ...settingsPatch,
    ...runtimePatch
  })
}

async function downloadSubscriptionHitsOnce(
  request: DownloadSubscriptionHitsRequest,
  dependencies: DownloadSubscriptionHitsDependencies = {}
): Promise<DownloadSubscriptionHitsResult> {
  const runtimeRepository = resolveRuntimeRepository(dependencies)
  const fetchTorrentForUploadImpl =
    dependencies.fetchTorrentForUpload ?? defaultFetchTorrentForUpload
  const extractSingleItemImpl = dependencies.extractSingleItem ?? defaultExtractSingleItem
  const loaded = await runtimeRepository.load()
  const settings = loaded.settings
  const getDownloaderImpl =
    dependencies.getDownloader ??
    ((targetSettings: Settings) => getDownloaderAdapter(targetSettings.currentDownloaderId))
  const manager = new SubscriptionManager(settings, loaded.runtimeSnapshot)
  const result = await manager.downloadFromNotification(request, {
    downloader: getDownloaderImpl(settings),
    fetchTorrentForUpload: fetchTorrentForUploadImpl,
    extractSingleItem: extractSingleItemImpl,
    now: dependencies.now
  })

  if (!result.runtimeSnapshot) {
    const { runtimeSnapshot: _runtimeSnapshot, ...downloadResult } = result
    return downloadResult
  }

  const savedSettings = await runtimeRepository.save(result.runtimeSnapshot)
  const { runtimeSnapshot: _runtimeSnapshot, ...downloadResult } = result

  return {
    ...downloadResult,
    settings: savedSettings
  }
}

async function defaultSaveSettings(settings: Partial<Settings>): Promise<Settings> {
  return saveSettings(settings)
}

async function defaultSaveSubscriptionRuntimeSettings(
  settings: SubscriptionRuntimeSettingsPatch
): Promise<Settings> {
  return saveSettings(settings)
}

function resolveRuntimeRepository(
  dependencies: {
    runtimeRepository?: SubscriptionRuntimeRepository
    getSettings?: () => Promise<Settings>
    saveSettings?: (settings: SubscriptionRuntimeSettingsPatch) => Promise<Settings>
  }
): SubscriptionRuntimeRepository {
  if (dependencies.runtimeRepository) {
    return dependencies.runtimeRepository
  }

  return createSettingsSubscriptionRuntimeRepository({
    getSettings: dependencies.getSettings ?? getSettings,
    saveSettings:
      dependencies.saveSettings ?? defaultSaveSubscriptionRuntimeSettings
  })
}

async function createBrowserNotification(
  notificationId: string,
  options: SubscriptionRoundNotificationPayload["options"]
): Promise<unknown> {
  return getBrowser().notifications.create(notificationId, {
    ...options,
    iconUrl: options.iconUrl ?? getExtensionUrl("icon.png")
  })
}

async function defaultFetchTorrentForUpload(torrentUrl: string): Promise<DownloaderTorrentFile> {
  return fetchTorrentForUpload(torrentUrl)
}

async function defaultExtractSingleItem(
  item: BatchItem,
  settings: Settings
): Promise<ExtractionResult> {
  return extractSingleItem(item, settings)
}

function enqueueSubscriptionMutation<T>(run: () => Promise<T>): Promise<T> {
  const execution = queuedSubscriptionMutation.then(run, run)
  queuedSubscriptionMutation = execution.then(
    () => undefined,
    () => undefined
  )

  return execution
}
