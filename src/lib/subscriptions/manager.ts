import type {
  SubscriptionEntry,
  Settings
} from "../shared/types"
import type { SubscriptionRuntimeSnapshot } from "./contracts"
import {
  downloadSubscriptionNotificationHits,
  type DownloadSubscriptionHitsRequest,
  type DownloadSubscriptionHitsResult,
  type SubscriptionDownloadNotificationPatch,
  type SubscriptionNotificationDownloadDependencies
} from "./download-notification"
import { reconcileSubscriptionRuntimeSnapshot } from "./runtime-snapshot"
import {
  applySubscriptionRuntimeSnapshot,
  createSubscriptionRuntimeSnapshot
} from "./runtime-repository"
import { scanSubscriptions } from "./scan"
import type {
  ScanSubscriptionsDependencies,
  ScanSubscriptionsResult
} from "./scan"

export type { SubscriptionRuntimeSettingsPatch } from "./runtime-repository"
export type SubscriptionEditRuntimeSettingsPatch = Pick<
  Settings,
  "subscriptionRuntimeStateById" | "subscriptionNotificationRounds"
>
export type SubscriptionManagerDownloadDependencies =
  SubscriptionNotificationDownloadDependencies
export type SubscriptionManagerDownloadResult = DownloadSubscriptionHitsResult & {
  runtimeSnapshot: SubscriptionRuntimeSnapshot | null
}
export type SubscriptionManagerScanResult = ScanSubscriptionsResult & {
  runtimeSnapshot: SubscriptionRuntimeSnapshot
}

export class SubscriptionManager {
  private readonly settingsWithRuntime: Settings

  constructor(
    settings: Settings,
    private readonly runtimeSnapshot: SubscriptionRuntimeSnapshot = createSubscriptionRuntimeSnapshot(
      settings
    )
  ) {
    this.settingsWithRuntime = applySubscriptionRuntimeSnapshot(
      settings,
      this.runtimeSnapshot
    )
  }

  getRuntimeSnapshot(): SubscriptionRuntimeSnapshot {
    return this.runtimeSnapshot
  }

  reconcileAfterEdit(
    previousSubscriptions: SubscriptionEntry[],
    nextSubscriptions: SubscriptionEntry[]
  ): Settings {
    const runtimePatch = this.reconcileAfterEditPatch(previousSubscriptions, nextSubscriptions)

    if (!runtimePatch) {
      return this.settingsWithRuntime
    }

    return {
      ...this.settingsWithRuntime,
      ...runtimePatch
    }
  }

  reconcileAfterEditPatch(
    previousSubscriptions: SubscriptionEntry[],
    nextSubscriptions: SubscriptionEntry[]
  ): SubscriptionEditRuntimeSettingsPatch | null {
    const snapshot = this.getRuntimeSnapshot()
    const reconciledSnapshot = reconcileSubscriptionRuntimeSnapshot(
      snapshot,
      previousSubscriptions,
      nextSubscriptions
    )

    if (reconciledSnapshot === snapshot) {
      return null
    }

    return {
      subscriptionRuntimeStateById: reconciledSnapshot.subscriptionRuntimeStateById,
      subscriptionNotificationRounds: reconciledSnapshot.subscriptionNotificationRounds
    }
  }

  async scan(
    dependencies: ScanSubscriptionsDependencies = {}
  ): Promise<SubscriptionManagerScanResult> {
    const result = await scanSubscriptions(this.settingsWithRuntime, dependencies)

    return {
      ...result,
      runtimeSnapshot: createSubscriptionRuntimeSnapshot(result.settings)
    }
  }

  async downloadFromNotification(
    request: DownloadSubscriptionHitsRequest,
    dependencies: SubscriptionManagerDownloadDependencies
  ): Promise<SubscriptionManagerDownloadResult> {
    const result = await downloadSubscriptionNotificationHits(
      this.settingsWithRuntime,
      request,
      dependencies
    )
    const { runtimePatch, ...downloadResult } = result

    return {
      ...downloadResult,
      runtimeSnapshot: runtimePatch
        ? createSubscriptionRuntimeSnapshot(result.settings)
        : null
    }
  }
}

export type {
  DownloadSubscriptionHitsRequest,
  DownloadSubscriptionHitsResult,
  SubscriptionDownloadNotificationPatch
}
