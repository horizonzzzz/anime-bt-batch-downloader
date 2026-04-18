import type { SubscriptionHitRecord } from "../shared/types"
import type { NotificationRoundRow } from "./store-types"

export const SUBSCRIPTION_NOTIFICATION_ROUND_ID_PREFIX = "subscription-round:"
export const SUBSCRIPTION_NOTIFICATION_ROUND_RETENTION_CAP = 10

export type SubscriptionRoundNotificationPayload = {
  id: string
  options: {
    type: "basic"
    title: string
    message: string
    iconUrl?: string
  }
}

export function createSubscriptionNotificationRoundId(createdAt: string): string {
  const normalizedCreatedAt = String(createdAt ?? "").trim()
  const suffix = normalizedCreatedAt.replace(/[^0-9]/g, "") || String(Date.now())
  return `${SUBSCRIPTION_NOTIFICATION_ROUND_ID_PREFIX}${suffix}`
}

export function parseSubscriptionNotificationRoundId(id: string): string | null {
  const normalizedId = String(id ?? "").trim()
  return normalizedId.startsWith(SUBSCRIPTION_NOTIFICATION_ROUND_ID_PREFIX) ? normalizedId : null
}

export function createSubscriptionNotificationRound(input: {
  createdAt: string
  hits: SubscriptionHitRecord[]
}): NotificationRoundRow {
  return {
    id: createSubscriptionNotificationRoundId(input.createdAt),
    createdAt: String(input.createdAt ?? "").trim(),
    hits: normalizeNotificationHits(input.hits)
  }
}

export function retainSubscriptionNotificationRounds(
  rounds: NotificationRoundRow[]
): NotificationRoundRow[] {
  const normalizedRounds = Array.isArray(rounds)
    ? rounds.filter(
        (round) =>
          round &&
          typeof round === "object" &&
          parseSubscriptionNotificationRoundId(round.id) !== null &&
          String(round.createdAt ?? "").trim().length > 0 &&
          Array.isArray(round.hits)
      )
    : []

  return normalizedRounds
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .slice(-SUBSCRIPTION_NOTIFICATION_ROUND_RETENTION_CAP)
}

export function buildSubscriptionRoundNotification(
  round: Pick<NotificationRoundRow, "id" | "hits">,
  copy: {
    title: string
    message: string
  },
  options: {
    iconUrl?: string
  } = {}
): SubscriptionRoundNotificationPayload {
  return {
    id: String(round.id ?? "").trim(),
    options: {
      type: "basic",
      title: String(copy.title ?? "").trim(),
      message: String(copy.message ?? "").trim(),
      ...(options.iconUrl ? { iconUrl: options.iconUrl } : {})
    }
  }
}

function normalizeNotificationHits(hits: SubscriptionHitRecord[]): SubscriptionHitRecord[] {
  if (!Array.isArray(hits)) {
    return []
  }

  const hitsById = new Map<string, SubscriptionHitRecord>()

  for (const hit of hits) {
    const hitId = String(hit?.id ?? "").trim()
    if (!hitId) {
      continue
    }

    hitsById.set(hitId, {
      ...hit,
      id: hitId
    })
  }

  return [...hitsById.values()]
}
