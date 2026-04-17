import type {
  EditableSubscriptionDefinition,
  SubscriptionNotificationRound,
  SubscriptionRuntimeState
} from "../shared/types"

export type SubscriptionRuntimeSnapshot = {
  lastSchedulerRunAt: string | null
  subscriptionRuntimeStateById: Record<string, SubscriptionRuntimeState>
  subscriptionNotificationRounds: SubscriptionNotificationRound[]
}

export type { EditableSubscriptionDefinition }
