import type {
  Settings,
  SubscriptionEntry,
  SubscriptionRuntimeState
} from "../shared/types"
import {
  createEmptySubscriptionRuntimeState,
  normalizeSubscriptionRuntimeState
} from "./runtime-state"

export type SubscriptionRuntimeStatePatch = Partial<SubscriptionRuntimeState>

export type DuplicateSubscriptionOptions = {
  now: string
  id?: string
}

export function readSubscriptionRuntimeState(
  settings: Pick<Settings, "subscriptionRuntimeStateById">,
  subscriptionId: string
): SubscriptionRuntimeState {
  const normalizedId = String(subscriptionId ?? "").trim()
  if (!normalizedId) {
    return createEmptySubscriptionRuntimeState()
  }

  return normalizeSubscriptionRuntimeState(
    settings.subscriptionRuntimeStateById?.[normalizedId],
    normalizedId
  )
}

export function updateSubscriptionRuntimeState(
  settings: Settings,
  subscriptionId: string,
  patch: SubscriptionRuntimeStatePatch
): Settings {
  const normalizedId = String(subscriptionId ?? "").trim()
  if (
    !normalizedId ||
    !settings.subscriptions.some((subscription) => subscription.id === normalizedId)
  ) {
    return settings
  }

  const current = readSubscriptionRuntimeState(settings, normalizedId)
  const nextState = normalizeSubscriptionRuntimeState({
    lastScanAt: patch.lastScanAt === undefined ? current.lastScanAt : patch.lastScanAt,
    lastMatchedAt:
      patch.lastMatchedAt === undefined ? current.lastMatchedAt : patch.lastMatchedAt,
    lastError: patch.lastError === undefined ? current.lastError : patch.lastError,
    seenFingerprints:
      patch.seenFingerprints === undefined
        ? current.seenFingerprints
        : patch.seenFingerprints,
    recentHits: patch.recentHits === undefined ? current.recentHits : patch.recentHits
  }, normalizedId)

  return {
    ...settings,
    subscriptionRuntimeStateById: {
      ...settings.subscriptionRuntimeStateById,
      [normalizedId]: nextState
    }
  }
}

export function duplicateSubscription(
  subscription: SubscriptionEntry,
  options: DuplicateSubscriptionOptions
): SubscriptionEntry {
  const now = String(options.now ?? "").trim()
  if (!now) {
    throw new Error("A duplication timestamp is required.")
  }

  const duplicatedId = normalizeDuplicateId(
    String(options.id ?? "").trim() || createDuplicateId(subscription.id, now),
    subscription.id
  )

  return {
    ...subscription,
    sourceIds: [...subscription.sourceIds],
    advanced: {
      must: subscription.advanced.must.map((condition) => ({ ...condition })),
      any: subscription.advanced.any.map((condition) => ({ ...condition }))
    },
    id: duplicatedId,
    createdAt: now,
    baselineCreatedAt: now
  }
}

function normalizeDuplicateId(id: string, originalId: string): string {
  if (id !== originalId) {
    return id
  }

  return `${originalId}-copy`
}

function createDuplicateId(originalId: string, now: string): string {
  const suffix = now.replace(/[^0-9]/g, "") || "copy"
  return `${originalId}-copy-${suffix}`
}
