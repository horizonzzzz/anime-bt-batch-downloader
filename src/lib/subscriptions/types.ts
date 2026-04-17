import type { FilterCondition, SourceId } from "../shared/types"

export type SubscriptionCandidate = {
  sourceId: SourceId
  title: string
  normalizedTitle: string
  detailUrl: string
  magnetUrl: string
  torrentUrl: string
  subgroup?: string
}

export type SubscriptionQuery = {
  titleQuery: string
  subgroupQuery: string
  advanced: {
    must: FilterCondition[]
    any: FilterCondition[]
  }
}

export type SubscriptionMatchContext = {
  sourceId: SourceId
  title: string
  subgroup: string
}

export type SubscriptionMatchResult = {
  matched: boolean
  subgroup: string
}

export type SubscriptionFingerprintCandidate = Pick<
  SubscriptionCandidate,
  "sourceId" | "title" | "normalizedTitle" | "detailUrl" | "magnetUrl" | "torrentUrl"
>
