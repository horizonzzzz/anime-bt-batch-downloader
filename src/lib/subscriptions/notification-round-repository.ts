import { subscriptionDb } from "./db"
import type { SubscriptionHitRecord } from "../shared/types"
import type { NotificationRoundRow } from "./store-types"
import { parseSubscriptionNotificationRoundId } from "./notifications"

export async function listNotificationRounds(): Promise<NotificationRoundRow[]> {
  return subscriptionDb.notificationRounds.orderBy("createdAt").reverse().toArray()
}

export async function getNotificationRound(roundId: string): Promise<NotificationRoundRow | null> {
  const normalizedId = String(roundId ?? "").trim()
  if (!normalizedId) {
    return null
  }

  return (await subscriptionDb.notificationRounds.get(normalizedId)) ?? null
}

export async function clearNotificationRounds(): Promise<void> {
  await subscriptionDb.notificationRounds.clear()
}

export async function persistNotificationRoundDownloadState(
  roundId: string,
  hits: SubscriptionHitRecord[]
): Promise<void> {
  const normalizedRoundId = parseSubscriptionNotificationRoundId(roundId)
  if (!normalizedRoundId) {
    throw new Error(
      `Invalid subscription notification round id: ${String(roundId ?? "")}`
    )
  }

  await persistResolvedHitIdsInNotificationRounds(getResolvedHitIds(hits), [normalizedRoundId])
}

export async function persistNotificationRoundsDownloadState(
  hits: SubscriptionHitRecord[]
): Promise<void> {
  await persistResolvedHitIdsInNotificationRounds(getResolvedHitIds(hits))
}

function getResolvedHitIds(hits: SubscriptionHitRecord[]): Set<string> {
  return new Set(
    hits
      .filter(
        (hit) =>
          hit.downloadStatus === "submitted" ||
          hit.downloadStatus === "duplicate"
      )
      .map((hit) => hit.id)
  )
}

async function persistResolvedHitIdsInNotificationRounds(
  resolvedHitIds: ReadonlySet<string>,
  roundIds?: string[]
): Promise<void> {
  if (resolvedHitIds.size === 0) {
    return
  }

  await subscriptionDb.transaction(
    "rw",
    subscriptionDb.notificationRounds,
    async () => {
      const rounds = roundIds
        ? (await subscriptionDb.notificationRounds.bulkGet(roundIds)).flatMap((round) =>
            round ? [round] : []
          )
        : await subscriptionDb.notificationRounds.toArray()

      for (const round of rounds) {
        const retainedHits = round.hits.filter((hit) => !resolvedHitIds.has(hit.id))

        if (retainedHits.length === round.hits.length) {
          continue
        }

        if (retainedHits.length === 0) {
          await subscriptionDb.notificationRounds.delete(round.id)
          continue
        }

        await subscriptionDb.notificationRounds.put({
          ...round,
          hits: retainedHits
        })
      }
    }
  )
}
