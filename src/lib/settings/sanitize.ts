import { normalizeSourceDeliveryModes } from "../sources/delivery"
import { resolveSubscriptionDeliveryMode } from "../subscriptions/delivery-mode"
import {
  normalizeSubscriptionHitRecord,
  normalizeSubscriptionRuntimeState
} from "../subscriptions/runtime-state"
import type {
  DownloaderId,
  FilterCondition,
  FilterEntry,
  Settings,
  SourceId,
  SubscriptionDeliveryMode,
  SubscriptionEntry,
  SubscriptionNotificationRound,
  SubscriptionRuntimeState
} from "../shared/types"
import { DEFAULT_SETTINGS } from "./defaults"
import { normalizeEnabledSources } from "./source-enablement"

type RawSettings = Record<string, unknown>

const VALID_SOURCE_IDS: SourceId[] = [
  "kisssub",
  "dongmanhuayuan",
  "acgrip",
  "bangumimoe"
]
const VALID_FILTER_CONDITION_FIELDS: Array<FilterCondition["field"]> = ["title", "subgroup"]
const VALID_SUBSCRIPTION_DELIVERY_MODES: SubscriptionDeliveryMode[] = [
  "direct-only",
  "allow-detail-extraction"
]
const DEFAULT_SUBSCRIPTION_DELIVERY_MODE: SubscriptionDeliveryMode = "direct-only"
const MIN_SUBSCRIPTION_POLLING_INTERVAL_MINUTES = 5
const MAX_SUBSCRIPTION_POLLING_INTERVAL_MINUTES = 120

export function sanitizeSettings(raw: RawSettings): Settings {
  const subscriptions = normalizeSubscriptions(raw.subscriptions ?? DEFAULT_SETTINGS.subscriptions)
  const validSubscriptionIds = new Set(subscriptions.map((subscription) => subscription.id))

  return {
    currentDownloaderId: normalizeDownloaderId(
      raw.currentDownloaderId ?? DEFAULT_SETTINGS.currentDownloaderId
    ),
    downloaders: normalizeDownloaders(raw.downloaders ?? DEFAULT_SETTINGS.downloaders),
    concurrency: clampInteger(raw.concurrency, 1, 5, DEFAULT_SETTINGS.concurrency),
    injectTimeoutMs: clampInteger(raw.injectTimeoutMs, 3000, 60000, DEFAULT_SETTINGS.injectTimeoutMs),
    domSettleMs: clampInteger(raw.domSettleMs, 200, 10000, DEFAULT_SETTINGS.domSettleMs),
    retryCount: clampInteger(raw.retryCount, 0, 5, DEFAULT_SETTINGS.retryCount),
    remoteScriptUrl: normalizeRemoteScriptUrl(raw.remoteScriptUrl ?? DEFAULT_SETTINGS.remoteScriptUrl),
    remoteScriptRevision:
      String(raw.remoteScriptRevision ?? DEFAULT_SETTINGS.remoteScriptRevision).trim() ||
      DEFAULT_SETTINGS.remoteScriptRevision,
    lastSavePath: normalizeSavePath(raw.lastSavePath ?? DEFAULT_SETTINGS.lastSavePath),
    sourceDeliveryModes: normalizeSourceDeliveryModes(
      raw.sourceDeliveryModes ?? DEFAULT_SETTINGS.sourceDeliveryModes
    ),
    enabledSources: normalizeEnabledSources(raw.enabledSources ?? DEFAULT_SETTINGS.enabledSources),
    filters: normalizeFilters(raw.filters ?? DEFAULT_SETTINGS.filters),
    subscriptionsEnabled: normalizeBoolean(
      raw.subscriptionsEnabled,
      DEFAULT_SETTINGS.subscriptionsEnabled
    ),
    pollingIntervalMinutes: clampInteger(
      raw.pollingIntervalMinutes,
      MIN_SUBSCRIPTION_POLLING_INTERVAL_MINUTES,
      MAX_SUBSCRIPTION_POLLING_INTERVAL_MINUTES,
      DEFAULT_SETTINGS.pollingIntervalMinutes
    ),
    notificationsEnabled: normalizeBoolean(
      raw.notificationsEnabled,
      DEFAULT_SETTINGS.notificationsEnabled
    ),
    notificationDownloadActionEnabled: normalizeBoolean(
      raw.notificationDownloadActionEnabled,
      DEFAULT_SETTINGS.notificationDownloadActionEnabled
    ),
    lastSchedulerRunAt: normalizeNullableString(
      raw.lastSchedulerRunAt,
      DEFAULT_SETTINGS.lastSchedulerRunAt
    ),
    subscriptions,
    subscriptionRuntimeStateById: normalizeSubscriptionRuntimeStateById(
      raw.subscriptionRuntimeStateById ?? DEFAULT_SETTINGS.subscriptionRuntimeStateById,
      validSubscriptionIds
    ),
    subscriptionNotificationRounds: normalizeSubscriptionNotificationRounds(
      raw.subscriptionNotificationRounds ?? DEFAULT_SETTINGS.subscriptionNotificationRounds
    )
  }
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value
  }

  if (value === 1 || value === "1" || value === "true") {
    return true
  }

  if (value === 0 || value === "0" || value === "false") {
    return false
  }

  return fallback
}

function normalizeDownloaderId(value: unknown): DownloaderId {
  return value === "qbittorrent" || value === "transmission"
    ? value
    : DEFAULT_SETTINGS.currentDownloaderId
}

function normalizeDownloaders(raw: unknown): Settings["downloaders"] {
  const record = raw && typeof raw === "object"
    ? (raw as Record<string, unknown>)
    : {}
  const qbRaw =
    record.qbittorrent && typeof record.qbittorrent === "object"
      ? (record.qbittorrent as Record<string, unknown>)
      : {}
  const transmissionRaw =
    record.transmission && typeof record.transmission === "object"
      ? (record.transmission as Record<string, unknown>)
      : {}

  return {
    qbittorrent: {
      baseUrl: normalizeBaseUrl(qbRaw.baseUrl, DEFAULT_SETTINGS.downloaders.qbittorrent.baseUrl),
      username: String(qbRaw.username ?? "").trim(),
      password: String(qbRaw.password ?? "")
    },
    transmission: {
      baseUrl: normalizeBaseUrl(
        transmissionRaw.baseUrl,
        DEFAULT_SETTINGS.downloaders.transmission.baseUrl
      ),
      username: String(transmissionRaw.username ?? "").trim(),
      password: String(transmissionRaw.password ?? "")
    }
  }
}

export function normalizeSavePath(path: unknown): string {
  return String(path ?? "").trim()
}

function normalizeNullableString(value: unknown, fallback: string | null): string | null {
  if (value == null) {
    return fallback
  }

  const normalized = String(value).trim()
  return normalized || fallback
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number.parseInt(String(value), 10)
  if (Number.isNaN(numeric)) {
    return fallback
  }

  return Math.min(max, Math.max(min, numeric))
}

function normalizeBaseUrl(url: unknown, fallback: string): string {
  const normalized = String(url ?? "")
    .trim()
    .replace(/\/+$/, "")

  return normalized || fallback
}

function normalizeRemoteScriptUrl(url: unknown): string {
  const normalized = String(url ?? "").trim()
  return normalized || DEFAULT_SETTINGS.remoteScriptUrl
}

function normalizeFilters(raw: unknown): FilterEntry[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((entry, index) => normalizeFilter(entry, index))
    .filter((entry): entry is FilterEntry => entry !== null)
}

function normalizeSubscriptions(raw: unknown): SubscriptionEntry[] {
  if (!Array.isArray(raw)) {
    return []
  }

  const seenIds = new Set<string>()

  return raw
    .map((entry, index) => normalizeSubscription(entry, index))
    .filter((entry): entry is SubscriptionEntry => entry !== null)
    .filter((entry) => {
      if (seenIds.has(entry.id)) {
        return false
      }

      seenIds.add(entry.id)
      return true
    })
}

function normalizeSubscription(raw: unknown, fallbackIndex: number): SubscriptionEntry | null {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const record = raw as Record<string, unknown>
  const id = String(record.id ?? "").trim() || `subscription-${fallbackIndex}`
  const name = String(record.name ?? "").trim()
  const createdAt = String(record.createdAt ?? "").trim()
  const baselineCreatedAt = String(record.baselineCreatedAt ?? "").trim()

  if (!name || !createdAt || !baselineCreatedAt) {
    return null
  }

  const sourceIds = normalizeSubscriptionSourceIds(record.sourceIds)
  if (!sourceIds.length) {
    return null
  }
  const deliveryMode = VALID_SUBSCRIPTION_DELIVERY_MODES.includes(
    record.deliveryMode as SubscriptionDeliveryMode
  )
    ? (record.deliveryMode as SubscriptionDeliveryMode)
    : DEFAULT_SUBSCRIPTION_DELIVERY_MODE

  return {
    id,
    name,
    enabled: normalizeBoolean(record.enabled, true),
    sourceIds,
    multiSiteModeEnabled: normalizeBoolean(record.multiSiteModeEnabled, false),
    titleQuery: String(record.titleQuery ?? "").trim(),
    subgroupQuery: String(record.subgroupQuery ?? "").trim(),
    advanced: {
      must: normalizeFilterConditions((record.advanced as { must?: unknown } | undefined)?.must),
      any: normalizeFilterConditions((record.advanced as { any?: unknown } | undefined)?.any)
    },
    deliveryMode: resolveSubscriptionDeliveryMode(sourceIds, deliveryMode),
    createdAt,
    baselineCreatedAt
  }
}

function normalizeSubscriptionSourceIds(raw: unknown): SourceId[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return Array.from(
    new Set(
      raw
        .map((entry) => String(entry ?? "").trim().toLowerCase() as SourceId)
        .filter((entry): entry is SourceId => VALID_SOURCE_IDS.includes(entry))
    )
  )
}

function normalizeSubscriptionRuntimeStateById(
  raw: unknown,
  validSubscriptionIds: ReadonlySet<string>
): Record<string, SubscriptionRuntimeState> {
  if (!raw || typeof raw !== "object") {
    return {}
  }

  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>)
      .map(([subscriptionId, value]) => {
        const normalizedId = String(subscriptionId).trim()
        if (!normalizedId || !validSubscriptionIds.has(normalizedId)) {
          return null
        }

        const normalizedState = normalizeSubscriptionRuntimeState(
          value as Partial<SubscriptionRuntimeState> | undefined,
          normalizedId
        )
        return [normalizedId, normalizedState] as const
      })
      .filter((entry): entry is readonly [string, SubscriptionRuntimeState] => entry !== null)
  )
}

function normalizeSubscriptionNotificationRounds(raw: unknown): SubscriptionNotificationRound[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((entry) => normalizeSubscriptionNotificationRound(entry))
    .filter((entry): entry is SubscriptionNotificationRound => entry !== null)
}

function normalizeSubscriptionNotificationRound(
  raw: unknown
): SubscriptionNotificationRound | null {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const record = raw as Record<string, unknown>
  const id = String(record.id ?? "").trim()
  const createdAt = String(record.createdAt ?? "").trim()
  if (!id || !createdAt) {
    return null
  }
  const hits = normalizeSubscriptionNotificationHits(record.hits)

  return {
    id,
    createdAt,
    hits,
    hitIds: Array.isArray(record.hitIds)
      ? record.hitIds
          .map((value) => String(value ?? "").trim())
          .filter((value) => value.length > 0)
      : hits.map((hit) => hit.id)
  }
}

function normalizeSubscriptionNotificationHits(raw: unknown): SubscriptionRuntimeState["recentHits"] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((entry) => normalizeSubscriptionHitRecord(entry))
    .filter((entry): entry is SubscriptionRuntimeState["recentHits"][number] => entry !== null)
}

function normalizeFilter(raw: unknown, fallbackIndex: number): FilterEntry | null {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const record = raw as Record<string, unknown>
  const name = String(record.name ?? "").trim()
  if (!name) {
    return null
  }

  const must = normalizeFilterConditions(record.must)
  const any = normalizeFilterConditions(record.any)
  if (!must.length) {
    return null
  }

  return {
    id: String(record.id ?? "").trim() || `filter-${fallbackIndex}`,
    name,
    enabled: normalizeBoolean(record.enabled, true),
    sourceIds: normalizeExplicitSourceIds(record.sourceIds),
    must,
    any
  }
}

function normalizeExplicitSourceIds(raw: unknown): SourceId[] {
  if (!Array.isArray(raw)) {
    return [...VALID_SOURCE_IDS]
  }

  const normalized = raw
    .map((entry) => String(entry ?? "").trim().toLowerCase() as SourceId)
    .filter((entry): entry is SourceId => VALID_SOURCE_IDS.includes(entry))

  if (!normalized.length) {
    return [...VALID_SOURCE_IDS]
  }

  return Array.from(new Set(normalized))
}

function normalizeFilterConditions(raw: unknown): FilterCondition[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((entry, index) => normalizeFilterCondition(entry, index))
    .filter((entry): entry is FilterCondition => entry !== null)
}

function normalizeFilterCondition(
  raw: unknown,
  fallbackIndex: number
): FilterCondition | null {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const record = raw as Record<string, unknown>
  const field = VALID_FILTER_CONDITION_FIELDS.includes(record.field as FilterCondition["field"])
    ? (record.field as FilterCondition["field"])
    : null
  if (!field) {
    return null
  }

  const value = String(record.value ?? "").trim()
  if (!value) {
    return null
  }

  const id = String(record.id ?? "").trim() || `condition-${fallbackIndex}`

  if (record.operator !== "contains") {
    return null
  }

  return {
    id,
    field,
    operator: "contains",
    value
  }
}
