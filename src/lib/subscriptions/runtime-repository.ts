import { getSettings, saveSettings } from "../settings"
import type { Settings } from "../shared/types"
import type { SubscriptionRuntimeSnapshot } from "./contracts"

export type SubscriptionRuntimeSettingsPatch = Pick<
  Settings,
  "lastSchedulerRunAt" | "subscriptionRuntimeStateById" | "subscriptionNotificationRounds"
>

export type SubscriptionRuntimeRepositoryLoadResult = {
  settings: Settings
  runtimeSnapshot: SubscriptionRuntimeSnapshot
}

export type SubscriptionRuntimeRepository = {
  load: () => Promise<SubscriptionRuntimeRepositoryLoadResult>
  save: (snapshot: SubscriptionRuntimeSnapshot) => Promise<Settings>
}

export type SettingsSubscriptionRuntimeRepositoryDependencies = {
  getSettings?: () => Promise<Settings>
  saveSettings?: (patch: SubscriptionRuntimeSettingsPatch) => Promise<Settings>
}

export function createSubscriptionRuntimeSnapshot(
  settings: Pick<
    Settings,
    "lastSchedulerRunAt" | "subscriptionRuntimeStateById" | "subscriptionNotificationRounds"
  >
): SubscriptionRuntimeSnapshot {
  return {
    lastSchedulerRunAt: settings.lastSchedulerRunAt,
    subscriptionRuntimeStateById: settings.subscriptionRuntimeStateById,
    subscriptionNotificationRounds: settings.subscriptionNotificationRounds
  }
}

export function toSubscriptionRuntimeSettingsPatch(
  snapshot: SubscriptionRuntimeSnapshot
): SubscriptionRuntimeSettingsPatch {
  return {
    lastSchedulerRunAt: snapshot.lastSchedulerRunAt,
    subscriptionRuntimeStateById: snapshot.subscriptionRuntimeStateById,
    subscriptionNotificationRounds: snapshot.subscriptionNotificationRounds
  }
}

export function applySubscriptionRuntimeSnapshot(
  settings: Settings,
  snapshot: SubscriptionRuntimeSnapshot
): Settings {
  return {
    ...settings,
    ...toSubscriptionRuntimeSettingsPatch(snapshot)
  }
}

export function createSettingsSubscriptionRuntimeRepository(
  dependencies: SettingsSubscriptionRuntimeRepositoryDependencies = {}
): SubscriptionRuntimeRepository {
  const getSettingsImpl = dependencies.getSettings ?? getSettings
  const saveSettingsImpl = dependencies.saveSettings ?? saveSettings

  return {
    async load() {
      const settings = await getSettingsImpl()
      return {
        settings,
        runtimeSnapshot: createSubscriptionRuntimeSnapshot(settings)
      }
    },
    async save(snapshot) {
      return saveSettingsImpl(toSubscriptionRuntimeSettingsPatch(snapshot))
    }
  }
}
