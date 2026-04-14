import type {
  SubscriptionHitRecord,
  SubscriptionNotificationRound
} from "../shared/types"

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
  hitIds: string[]
}): SubscriptionNotificationRound {
  return {
    id: createSubscriptionNotificationRoundId(input.createdAt),
    createdAt: String(input.createdAt ?? "").trim(),
    hitIds: normalizeHitIds(input.hitIds)
  }
}

export function retainSubscriptionNotificationRounds(
  rounds: SubscriptionNotificationRound[]
): SubscriptionNotificationRound[] {
  const normalizedRounds = Array.isArray(rounds)
    ? rounds.filter(
        (round) =>
          round &&
          typeof round === "object" &&
          parseSubscriptionNotificationRoundId(round.id) !== null &&
          String(round.createdAt ?? "").trim().length > 0
      )
    : []

  return normalizedRounds.slice(-SUBSCRIPTION_NOTIFICATION_ROUND_RETENTION_CAP)
}

export function buildSubscriptionRoundNotification(
  round: Pick<SubscriptionNotificationRound, "id" | "hitIds">,
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

export function collectNotificationRoundHitIds(
  hits: SubscriptionHitRecord[]
): string[] {
  return normalizeHitIds(hits.map((hit) => hit.id))
}

function normalizeHitIds(hitIds: string[]): string[] {
  if (!Array.isArray(hitIds)) {
    return []
  }

  return Array.from(
    new Set(
      hitIds
        .map((hitId) => String(hitId ?? "").trim())
        .filter((hitId) => hitId.length > 0)
    )
  )
}
