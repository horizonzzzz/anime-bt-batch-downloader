import { subscriptionDb } from "./db"
import type {
  NotificationRoundRow,
  SubscriptionDashboardRow,
  SubscriptionRuntimeRow
} from "./store-types"
import { listSubscriptions } from "./catalog-repository"

export const LAST_SCHEDULER_RUN_AT_META_KEY = "lastSchedulerRunAt"

export async function buildSubscriptionDashboardRows(): Promise<SubscriptionDashboardRow[]> {
  const [subscriptions, runtimeRows] = await Promise.all([listSubscriptions(), listSubscriptionRuntimeRows()])
  const runtimeBySubscriptionId = new Map(
    runtimeRows.map((row) => [row.subscriptionId, row] as const)
  )

  return subscriptions.map((subscription) => ({
    subscription,
    runtime: runtimeBySubscriptionId.get(subscription.id) ?? null,
    recentHits: runtimeBySubscriptionId.get(subscription.id)?.recentHits ?? []
  }))
}

export async function getLastSchedulerRunAt(): Promise<string | null> {
  const row = await subscriptionDb.subscriptionMeta.get(LAST_SCHEDULER_RUN_AT_META_KEY)
  return row?.value ?? null
}

export async function setLastSchedulerRunAt(value: string | null): Promise<void> {
  await subscriptionDb.subscriptionMeta.put({
    key: LAST_SCHEDULER_RUN_AT_META_KEY,
    value
  })
}

export async function buildSubscriptionRuntimeStatusRow() {
  const [lastSchedulerRunAt, notificationRounds, rows] = await Promise.all([
    getLastSchedulerRunAt(),
    listNotificationRounds(),
    buildSubscriptionRuntimeRows()
  ])

  return {
    lastSchedulerRunAt,
    notificationRounds,
    rows
  }
}

export async function listSubscriptionRuntimeRows(): Promise<SubscriptionRuntimeRow[]> {
  return subscriptionDb.subscriptionRuntime.toArray()
}

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

async function buildSubscriptionRuntimeRows() {
  const runtimeRows = await listSubscriptionRuntimeRows()

  return [...runtimeRows]
    .sort((left, right) => left.subscriptionId.localeCompare(right.subscriptionId))
    .map((row) => ({
      subscriptionId: row.subscriptionId,
      runtime: row,
      recentHits: row.recentHits
    }))
}
