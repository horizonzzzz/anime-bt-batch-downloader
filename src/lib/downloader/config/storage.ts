import { getBrowser } from "../../shared/browser"
import { DEFAULT_DOWNLOADER_CONFIG } from "./defaults"
import { downloaderConfigSchema } from "./schema"
import type { DownloaderConfig } from "./types"
import type { AppSettings } from "../../shared/types"

const DOWNLOADER_CONFIG_STORAGE_KEY = "downloader_config"

type LegacyAppSettings = {
  currentDownloaderId?: string
  downloaders?: {
    qbittorrent?: {
      baseUrl?: string
      username?: string
      password?: string
    }
    transmission?: {
      baseUrl?: string
      username?: string
      password?: string
    }
  }
}

function migrateFromLegacySettings(legacy: LegacyAppSettings): DownloaderConfig {
  return {
    activeId: (legacy.currentDownloaderId as DownloaderConfig["activeId"]) ?? DEFAULT_DOWNLOADER_CONFIG.activeId,
    profiles: {
      qbittorrent: {
        baseUrl: legacy.downloaders?.qbittorrent?.baseUrl ?? DEFAULT_DOWNLOADER_CONFIG.profiles.qbittorrent.baseUrl,
        username: legacy.downloaders?.qbittorrent?.username ?? DEFAULT_DOWNLOADER_CONFIG.profiles.qbittorrent.username,
        password: legacy.downloaders?.qbittorrent?.password ?? DEFAULT_DOWNLOADER_CONFIG.profiles.qbittorrent.password
      },
      transmission: {
        baseUrl: legacy.downloaders?.transmission?.baseUrl ?? DEFAULT_DOWNLOADER_CONFIG.profiles.transmission.baseUrl,
        username: legacy.downloaders?.transmission?.username ?? DEFAULT_DOWNLOADER_CONFIG.profiles.transmission.username,
        password: legacy.downloaders?.transmission?.password ?? DEFAULT_DOWNLOADER_CONFIG.profiles.transmission.password
      }
    }
  }
}

export async function getDownloaderConfig(): Promise<DownloaderConfig> {
  const extensionBrowser = getBrowser()
  const stored = await extensionBrowser.storage.local.get([
    DOWNLOADER_CONFIG_STORAGE_KEY,
    "app_settings"
  ])

  // If downloader_config exists, use it directly
  if (stored[DOWNLOADER_CONFIG_STORAGE_KEY]) {
    return downloaderConfigSchema.parse(stored[DOWNLOADER_CONFIG_STORAGE_KEY])
  }

  // Migration: read from legacy app_settings fields
  const legacySettings = (stored["app_settings"] as LegacyAppSettings | undefined) ?? {}
  const migratedConfig = migrateFromLegacySettings(legacySettings)

  // Persist migrated config for future reads
  await extensionBrowser.storage.local.set({ [DOWNLOADER_CONFIG_STORAGE_KEY]: migratedConfig })

  return downloaderConfigSchema.parse(migratedConfig)
}

export async function saveDownloaderConfig(config: DownloaderConfig): Promise<DownloaderConfig> {
  const sanitized = downloaderConfigSchema.parse(config)
  await getBrowser().storage.local.set({
    [DOWNLOADER_CONFIG_STORAGE_KEY]: sanitized
  })
  return sanitized
}

export function appSettingsToDownloaderConfig(settings: AppSettings): DownloaderConfig {
  return {
    activeId: settings.currentDownloaderId,
    profiles: {
      qbittorrent: {
        baseUrl: settings.downloaders.qbittorrent.baseUrl,
        username: settings.downloaders.qbittorrent.username,
        password: settings.downloaders.qbittorrent.password
      },
      transmission: {
        baseUrl: settings.downloaders.transmission.baseUrl,
        username: settings.downloaders.transmission.username,
        password: settings.downloaders.transmission.password
      }
    }
  }
}