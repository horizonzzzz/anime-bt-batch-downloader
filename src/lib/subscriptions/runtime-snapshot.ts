import type {
  FilterCondition,
  SubscriptionEntry,
  SubscriptionNotificationRound,
  SubscriptionRuntimeState
} from "../shared/types"
import { produce } from "immer"
import type {
  EditableSubscriptionDefinition,
  SubscriptionRuntimeSnapshot
} from "./contracts"
import { createEmptySubscriptionRuntimeState } from "./runtime-state"

type NormalizedFilterCondition = Pick<FilterCondition, "field" | "operator" | "value">
type SubscriptionTrackingDefinition = Omit<
  EditableSubscriptionDefinition,
  "id" | "advanced"
> & {
  advanced: {
    must: NormalizedFilterCondition[]
    any: NormalizedFilterCondition[]
  }
}

export function reconcileSubscriptionRuntimeSnapshot(
  snapshot: SubscriptionRuntimeSnapshot,
  previousSubscriptions: SubscriptionEntry[],
  nextSubscriptions: SubscriptionEntry[]
): SubscriptionRuntimeSnapshot {
  const nextSubscriptionsById = new Map(
    nextSubscriptions.map((subscription) => [subscription.id, subscription] as const)
  )
  let nextRuntimeStateById = snapshot.subscriptionRuntimeStateById
  let nextNotificationRounds = snapshot.subscriptionNotificationRounds
  let changed = false

  for (const previousSubscription of previousSubscriptions) {
    const nextSubscription = nextSubscriptionsById.get(previousSubscription.id)

    if (!nextSubscription) {
      if (previousSubscription.id in nextRuntimeStateById) {
        nextRuntimeStateById = { ...nextRuntimeStateById }
        delete nextRuntimeStateById[previousSubscription.id]
        changed = true
      }

      const prunedRounds = removeSubscriptionHitsFromNotificationRounds(
        nextNotificationRounds,
        previousSubscription.id
      )
      if (prunedRounds !== nextNotificationRounds) {
        nextNotificationRounds = prunedRounds
        changed = true
      }
      continue
    }

    if (!hasSubscriptionTrackingDefinitionChanged(previousSubscription, nextSubscription)) {
      continue
    }

    const currentState = nextRuntimeStateById[previousSubscription.id]
    if (currentState && !isEmptyRuntimeState(currentState)) {
      nextRuntimeStateById = {
        ...nextRuntimeStateById,
        [previousSubscription.id]: createEmptySubscriptionRuntimeState()
      }
      changed = true
    }

    const prunedRounds = removeSubscriptionHitsFromNotificationRounds(
      nextNotificationRounds,
      previousSubscription.id
    )
    if (prunedRounds !== nextNotificationRounds) {
      nextNotificationRounds = prunedRounds
      changed = true
    }
  }

  if (!changed) {
    return snapshot
  }

  return {
    lastSchedulerRunAt: snapshot.lastSchedulerRunAt,
    subscriptionRuntimeStateById: nextRuntimeStateById,
    subscriptionNotificationRounds: nextNotificationRounds
  }
}

function hasSubscriptionTrackingDefinitionChanged(
  previousSubscription: SubscriptionEntry,
  nextSubscription: SubscriptionEntry
): boolean {
  return JSON.stringify(toTrackingDefinition(previousSubscription)) !==
    JSON.stringify(toTrackingDefinition(nextSubscription))
}

function toTrackingDefinition(subscription: SubscriptionEntry) {
  return {
    enabled: subscription.enabled,
    sourceIds: subscription.sourceIds,
    multiSiteModeEnabled: subscription.multiSiteModeEnabled,
    titleQuery: subscription.titleQuery,
    subgroupQuery: subscription.subgroupQuery,
    advanced: {
      must: subscription.advanced.must.map(normalizeConditionForComparison),
      any: subscription.advanced.any.map(normalizeConditionForComparison)
    },
    deliveryMode: subscription.deliveryMode
  } satisfies SubscriptionTrackingDefinition
}

function normalizeConditionForComparison(condition: FilterCondition) {
  return {
    field: condition.field,
    operator: condition.operator,
    value: condition.value
  }
}

function isEmptyRuntimeState(state: SubscriptionRuntimeState): boolean {
  return (
    state.lastScanAt === null &&
    state.lastMatchedAt === null &&
    !state.lastError &&
    state.seenFingerprints.length === 0 &&
    state.recentHits.length === 0
  )
}

function removeSubscriptionHitsFromNotificationRounds(
  rounds: SubscriptionNotificationRound[],
  subscriptionId: string
): SubscriptionNotificationRound[] {
  return produce(rounds, (draft) => {
    for (let index = draft.length - 1; index >= 0; index -= 1) {
      const round = draft[index]
      if (!round) {
        continue
      }

      const nextHits = Array.isArray(round.hits)
        ? round.hits.filter((hit) => hit.subscriptionId !== subscriptionId)
        : undefined
      const nextHitIds = Array.isArray(round.hits)
        ? (nextHits ?? []).map((hit) => hit.id)
        : round.hitIds.filter((hitId) => !isSubscriptionHitIdForSubscription(hitId, subscriptionId))

      if (
        nextHitIds.length === round.hitIds.length &&
        (!Array.isArray(round.hits) || nextHits?.length === round.hits.length)
      ) {
        continue
      }

      if (nextHitIds.length === 0) {
        draft.splice(index, 1)
        continue
      }

      round.hitIds = nextHitIds
      if (Array.isArray(round.hits)) {
        round.hits = (nextHits ?? []).map((hit) => ({ ...hit }))
      }
    }
  })
}

function isSubscriptionHitIdForSubscription(hitId: string, subscriptionId: string): boolean {
  return hitId.startsWith(`subscription-hit:${subscriptionId}:`)
}
