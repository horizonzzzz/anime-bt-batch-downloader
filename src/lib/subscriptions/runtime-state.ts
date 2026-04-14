import type {
  SourceId,
  SubscriptionHitRecord,
  SubscriptionRuntimeState
} from "../shared/types"
import { retainRecentHits, retainSeenFingerprints } from "./retention"

export function createEmptySubscriptionRuntimeState(): SubscriptionRuntimeState {
  return {
    lastScanAt: null,
    lastMatchedAt: null,
    lastError: "",
    seenFingerprints: [],
    recentHits: []
  }
}

export function normalizeSubscriptionRuntimeState(
  state: Partial<SubscriptionRuntimeState> | undefined,
  ownerSubscriptionId?: string
): SubscriptionRuntimeState {
  if (!state || typeof state !== "object") {
    return createEmptySubscriptionRuntimeState()
  }

  return {
    lastScanAt: normalizeNullableString(state.lastScanAt),
    lastMatchedAt: normalizeNullableString(state.lastMatchedAt),
    lastError: String(state.lastError ?? "").trim(),
    seenFingerprints: normalizeSeenFingerprints(state.seenFingerprints),
    recentHits: normalizeRecentHits(state.recentHits, ownerSubscriptionId)
  }
}

function normalizeNullableString(value: unknown): string | null {
  if (value == null) {
    return null
  }

  const normalized = String(value).trim()
  return normalized || null
}

function normalizeSeenFingerprints(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return retainSeenFingerprints(
    value
      .map((entry) => String(entry ?? "").trim())
      .filter((entry) => entry.length > 0)
  )
}

function normalizeRecentHits(value: unknown, ownerSubscriptionId?: string): SubscriptionHitRecord[] {
  if (!Array.isArray(value)) {
    return []
  }

  const normalizedOwnerId = String(ownerSubscriptionId ?? "").trim()

  return retainRecentHits(
    value
      .map((entry) => normalizeSubscriptionHitRecord(entry))
      .filter(
        (entry) =>
          entry !== null &&
          (!normalizedOwnerId || entry.subscriptionId === normalizedOwnerId)
      )
      .filter((entry): entry is SubscriptionHitRecord => entry !== null)
  )
}

export function normalizeSubscriptionHitRecord(value: unknown): SubscriptionHitRecord | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  const id = String(record.id ?? "").trim()
  const subscriptionId = String(record.subscriptionId ?? "").trim()
  const sourceId = normalizeSourceId(record.sourceId)
  const title = String(record.title ?? "").trim()
  const normalizedTitle = String(record.normalizedTitle ?? "").trim()
  const detailUrl = String(record.detailUrl ?? "").trim()
  const discoveredAt = String(record.discoveredAt ?? "").trim()

  if (!id || !subscriptionId || !sourceId || !title || !normalizedTitle || !detailUrl || !discoveredAt) {
    return null
  }

  return {
    id,
    subscriptionId,
    sourceId,
    title,
    normalizedTitle,
    subgroup: String(record.subgroup ?? "").trim(),
    detailUrl,
    magnetUrl: String(record.magnetUrl ?? "").trim(),
    torrentUrl: String(record.torrentUrl ?? "").trim(),
    discoveredAt,
    downloadedAt: normalizeNullableString(record.downloadedAt),
    downloadStatus: normalizeDownloadStatus(record.downloadStatus)
  }
}

function normalizeSourceId(value: unknown): SourceId | null {
  const normalized = String(value ?? "").trim().toLowerCase()
  return normalized === "kisssub" ||
    normalized === "dongmanhuayuan" ||
    normalized === "acgrip" ||
    normalized === "bangumimoe"
    ? normalized
    : null
}

function normalizeDownloadStatus(value: unknown): SubscriptionHitRecord["downloadStatus"] {
  const normalized = String(value ?? "").trim()
  return normalized === "submitted" ||
    normalized === "duplicate" ||
    normalized === "failed"
    ? normalized
    : "idle"
}
