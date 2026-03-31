import { normalizeSourceDeliveryModes } from "../sources/delivery"
import type { FilterRule, FilterRuleAction, FilterRuleConditions, Settings, SourceId } from "../shared/types"
import { DEFAULT_SETTINGS } from "./defaults"
import { normalizeEnabledSources } from "./source-enablement"

type RawSettings = Partial<Settings> & Record<string, unknown>

export function sanitizeSettings(raw: RawSettings): Settings {
  return {
    qbBaseUrl: normalizeBaseUrl(raw.qbBaseUrl ?? DEFAULT_SETTINGS.qbBaseUrl),
    qbUsername: String(raw.qbUsername ?? "").trim(),
    qbPassword: String(raw.qbPassword ?? ""),
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
    filterRules: normalizeFilterRules(raw.filterRules ?? DEFAULT_SETTINGS.filterRules)
  }
}

export function normalizeSavePath(path: unknown): string {
  return String(path ?? "").trim()
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number.parseInt(String(value), 10)
  if (Number.isNaN(numeric)) {
    return fallback
  }

  return Math.min(max, Math.max(min, numeric))
}

function normalizeBaseUrl(url: unknown): string {
  const normalized = String(url ?? "")
    .trim()
    .replace(/\/+$/, "")

  return normalized || DEFAULT_SETTINGS.qbBaseUrl
}

function normalizeRemoteScriptUrl(url: unknown): string {
  const normalized = String(url ?? "").trim()
  return normalized || DEFAULT_SETTINGS.remoteScriptUrl
}

const VALID_SOURCE_IDS: SourceId[] = ["kisssub", "dongmanhuayuan", "acgrip", "bangumimoe"]
const VALID_FILTER_RULE_ACTIONS: FilterRuleAction[] = ["include", "exclude"]

export function normalizeFilterRules(raw: unknown): FilterRule[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((entry, index) => normalizeFilterRule(entry, index))
    .filter((entry): entry is FilterRule => entry !== null)
    .map((entry, index) => ({
      ...entry,
      order: index
    }))
}

function normalizeFilterRule(raw: unknown, fallbackOrder: number): FilterRule | null {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const record = raw as Record<string, unknown>
  const sourceIds = normalizeSourceIds(record.sourceIds)
  if (!sourceIds.length) {
    return null
  }

  const id = String(record.id ?? "").trim()
  const name = String(record.name ?? "").trim()
  if (!id || !name) {
    return null
  }

  const conditions = normalizeFilterRuleConditions(record.conditions)
  const action = VALID_FILTER_RULE_ACTIONS.includes(record.action as FilterRuleAction)
    ? (record.action as FilterRuleAction)
    : "exclude"

  if (action === "include") {
    conditions.titleExcludes = []
  }

  if (!hasFilterRuleConditions(conditions)) {
    return null
  }

  return {
    id,
    name,
    enabled: Boolean(record.enabled),
    action,
    sourceIds,
    order: clampInteger(record.order, 0, Number.MAX_SAFE_INTEGER, fallbackOrder),
    conditions
  }
}

function normalizeFilterRuleConditions(raw: unknown): FilterRuleConditions {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}

  return {
    titleIncludes: normalizeStringArray(record.titleIncludes),
    titleExcludes: normalizeStringArray(record.titleExcludes),
    subgroupIncludes: normalizeStringArray(record.subgroupIncludes)
  }
}

function hasFilterRuleConditions(conditions: FilterRuleConditions): boolean {
  return (
    conditions.titleIncludes.length > 0 ||
    conditions.titleExcludes.length > 0 ||
    conditions.subgroupIncludes.length > 0
  )
}

function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return []
  }

  const seen = new Set<string>()
  const values: string[] = []

  for (const entry of raw) {
    const normalized = String(entry ?? "").trim()
    if (!normalized || seen.has(normalized)) {
      continue
    }

    seen.add(normalized)
    values.push(normalized)
  }

  return values
}

function normalizeSourceIds(raw: unknown): SourceId[] {
  if (!Array.isArray(raw)) {
    return []
  }

  const seen = new Set<SourceId>()
  const values: SourceId[] = []

  for (const entry of raw) {
    if (!VALID_SOURCE_IDS.includes(entry as SourceId)) {
      continue
    }

    const sourceId = entry as SourceId
    if (seen.has(sourceId)) {
      continue
    }

    seen.add(sourceId)
    values.push(sourceId)
  }

  return values
}
