import { getBrowser } from "../../shared/browser"
import type { SubscriptionPolicyConfig } from "./types"
import { DEFAULT_SUBSCRIPTION_POLICY_CONFIG } from "./defaults"
import { sanitizeSubscriptionPolicyConfig } from "./schema"

const SUBSCRIPTION_POLICY_STORAGE_KEY = "subscription_policy_config"

type LegacyAppSettings = {
  subscriptionsEnabled?: boolean
  pollingIntervalMinutes?: number
  subscriptionNotificationsEnabled?: boolean
  subscriptionNotificationDownloadActionEnabled?: boolean
}

function migrateFromLegacySettings(legacy: LegacyAppSettings): SubscriptionPolicyConfig {
  return sanitizeSubscriptionPolicyConfig({
    enabled: legacy.subscriptionsEnabled ?? DEFAULT_SUBSCRIPTION_POLICY_CONFIG.enabled,
    pollingIntervalMinutes: legacy.pollingIntervalMinutes ?? DEFAULT_SUBSCRIPTION_POLICY_CONFIG.pollingIntervalMinutes,
    notificationsEnabled: legacy.subscriptionNotificationsEnabled ?? DEFAULT_SUBSCRIPTION_POLICY_CONFIG.notificationsEnabled,
    notificationDownloadActionEnabled: legacy.subscriptionNotificationDownloadActionEnabled ?? DEFAULT_SUBSCRIPTION_POLICY_CONFIG.notificationDownloadActionEnabled
  })
}

export async function ensureSubscriptionPolicyConfig(): Promise<void> {
  const extensionBrowser = getBrowser()
  const stored = await extensionBrowser.storage.local.get([SUBSCRIPTION_POLICY_STORAGE_KEY, "app_settings"])

  if (stored[SUBSCRIPTION_POLICY_STORAGE_KEY]) {
    return
  }

  // Migration: read from legacy app_settings fields
  try {
    const legacySettings = (stored["app_settings"] as LegacyAppSettings | undefined) ?? {}
    const migratedConfig = migrateFromLegacySettings(legacySettings)
    await extensionBrowser.storage.local.set({ [SUBSCRIPTION_POLICY_STORAGE_KEY]: migratedConfig })
  } catch {
    await extensionBrowser.storage.local.set({ [SUBSCRIPTION_POLICY_STORAGE_KEY]: DEFAULT_SUBSCRIPTION_POLICY_CONFIG })
  }
}

export async function getSubscriptionPolicyConfig(): Promise<SubscriptionPolicyConfig> {
  const extensionBrowser = getBrowser()
  const stored = await extensionBrowser.storage.local.get([SUBSCRIPTION_POLICY_STORAGE_KEY, "app_settings"])

  if (stored[SUBSCRIPTION_POLICY_STORAGE_KEY]) {
    try {
      return sanitizeSubscriptionPolicyConfig(stored[SUBSCRIPTION_POLICY_STORAGE_KEY])
    } catch {
      await extensionBrowser.storage.local.set({ [SUBSCRIPTION_POLICY_STORAGE_KEY]: DEFAULT_SUBSCRIPTION_POLICY_CONFIG })
      return DEFAULT_SUBSCRIPTION_POLICY_CONFIG
    }
  }

  // Migration: read from legacy app_settings fields
  try {
    const legacySettings = (stored["app_settings"] as LegacyAppSettings | undefined) ?? {}
    const migratedConfig = migrateFromLegacySettings(legacySettings)
    const validated = sanitizeSubscriptionPolicyConfig(migratedConfig)
    await extensionBrowser.storage.local.set({ [SUBSCRIPTION_POLICY_STORAGE_KEY]: validated })
    return validated
  } catch {
    await extensionBrowser.storage.local.set({ [SUBSCRIPTION_POLICY_STORAGE_KEY]: DEFAULT_SUBSCRIPTION_POLICY_CONFIG })
    return DEFAULT_SUBSCRIPTION_POLICY_CONFIG
  }
}

export async function saveSubscriptionPolicyConfig(config: SubscriptionPolicyConfig): Promise<SubscriptionPolicyConfig> {
  const sanitized = sanitizeSubscriptionPolicyConfig(config)
  await getBrowser().storage.local.set({
    [SUBSCRIPTION_POLICY_STORAGE_KEY]: sanitized
  })
  return sanitized
}