import Dexie, { type Table } from "dexie"

import type { SubscriptionEntry } from "../shared/types"
import type {
  NotificationRoundRow,
  SubscriptionMetaRow,
  SubscriptionRuntimeRow
} from "./store-types"

export class SubscriptionDatabase extends Dexie {
  subscriptions!: Table<SubscriptionEntry, string>
  subscriptionRuntime!: Table<SubscriptionRuntimeRow, string>
  notificationRounds!: Table<NotificationRoundRow, string>
  subscriptionMeta!: Table<SubscriptionMetaRow, string>

  constructor() {
    super("anime-bt-subscriptions")

    this.version(1).stores({
      subscriptions: "id, enabled, *sourceIds, createdAt",
      subscriptionRuntime: "subscriptionId, lastScanAt, lastMatchedAt",
      subscriptionHits: "id, subscriptionId, discoveredAt, downloadStatus, [subscriptionId+discoveredAt]",
      notificationRounds: "id, createdAt",
      subscriptionMeta: "key"
    })

    this.version(2)
      .stores({
        subscriptions: "id, enabled, *sourceIds, createdAt",
        subscriptionRuntime: "subscriptionId, lastScanAt, lastMatchedAt",
        subscriptionHits: null,
        notificationRounds: "id, createdAt",
        subscriptionMeta: "key"
      })
      .upgrade(async (transaction) => {
        await transaction.table("subscriptions").clear()
        await transaction.table("subscriptionRuntime").clear()
        await transaction.table("notificationRounds").clear()
        await transaction.table("subscriptionMeta").clear()
      })
  }
}

export const subscriptionDb = new SubscriptionDatabase()

export async function resetSubscriptionDb(): Promise<void> {
  subscriptionDb.close()
  await Dexie.delete(subscriptionDb.name)
  await subscriptionDb.open()
}
