import { getBrowser } from "../../shared/browser"
import { DEFAULT_SOURCE_CONFIG } from "./defaults"
import { sanitizeSourceConfig } from "./schema"
import type { SourceConfig } from "./types"

const SOURCE_CONFIG_STORAGE_KEY = "source_config"

type LegacyAppSettings = {
  enabledSources?: Partial<Record<string, boolean>>
  sourceDeliveryModes?: Partial<Record<string, string>>
  remoteScriptUrl?: string
  remoteScriptRevision?: string
}

function migrateFromLegacySettings(legacy: LegacyAppSettings): SourceConfig {
  return sanitizeSourceConfig({
    kisssub: {
      enabled: legacy.enabledSources?.kisssub ?? DEFAULT_SOURCE_CONFIG.kisssub.enabled,
      deliveryMode:
        (legacy.sourceDeliveryModes?.kisssub as SourceConfig["kisssub"]["deliveryMode"]) ??
        DEFAULT_SOURCE_CONFIG.kisssub.deliveryMode,
      script: {
        url: legacy.remoteScriptUrl ?? DEFAULT_SOURCE_CONFIG.kisssub.script.url,
        revision: legacy.remoteScriptRevision ?? DEFAULT_SOURCE_CONFIG.kisssub.script.revision
      }
    },
    dongmanhuayuan: {
      enabled:
        legacy.enabledSources?.dongmanhuayuan ?? DEFAULT_SOURCE_CONFIG.dongmanhuayuan.enabled,
      deliveryMode:
        (legacy.sourceDeliveryModes?.dongmanhuayuan as SourceConfig["dongmanhuayuan"]["deliveryMode"]) ??
        DEFAULT_SOURCE_CONFIG.dongmanhuayuan.deliveryMode
    },
    acgrip: {
      enabled: legacy.enabledSources?.acgrip ?? DEFAULT_SOURCE_CONFIG.acgrip.enabled,
      deliveryMode:
        (legacy.sourceDeliveryModes?.acgrip as SourceConfig["acgrip"]["deliveryMode"]) ??
        DEFAULT_SOURCE_CONFIG.acgrip.deliveryMode
    },
    bangumimoe: {
      enabled: legacy.enabledSources?.bangumimoe ?? DEFAULT_SOURCE_CONFIG.bangumimoe.enabled,
      deliveryMode:
        (legacy.sourceDeliveryModes?.bangumimoe as SourceConfig["bangumimoe"]["deliveryMode"]) ??
        DEFAULT_SOURCE_CONFIG.bangumimoe.deliveryMode
    }
  })
}

export async function getSourceConfig(): Promise<SourceConfig> {
  const extensionBrowser = getBrowser()
  const stored = await extensionBrowser.storage.local.get([
    SOURCE_CONFIG_STORAGE_KEY,
    "app_settings"
  ])

  // If source_config exists, use it directly
  if (stored[SOURCE_CONFIG_STORAGE_KEY]) {
    return sanitizeSourceConfig(stored[SOURCE_CONFIG_STORAGE_KEY])
  }

  // Migration: read from legacy app_settings fields
  const legacySettings = (stored["app_settings"] as LegacyAppSettings | undefined) ?? {}
  const migratedConfig = migrateFromLegacySettings(legacySettings)

  // Persist migrated config for future reads
  await extensionBrowser.storage.local.set({ [SOURCE_CONFIG_STORAGE_KEY]: migratedConfig })

  return migratedConfig
}

export async function saveSourceConfig(config: SourceConfig): Promise<SourceConfig> {
  const sanitized = sanitizeSourceConfig(config)
  await getBrowser().storage.local.set({
    [SOURCE_CONFIG_STORAGE_KEY]: sanitized
  })
  return sanitized
}