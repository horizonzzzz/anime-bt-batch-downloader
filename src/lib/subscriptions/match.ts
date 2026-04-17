import { extractSubgroup, matchesCondition } from "../filter-rules"
import type { FilterCondition } from "../shared/types"
import type {
  SubscriptionCandidate,
  SubscriptionMatchResult,
  SubscriptionQuery
} from "./types"

type MatchInput = {
  query: SubscriptionQuery
  candidate: SubscriptionCandidate
}

export function deriveSubscriptionCandidateSubgroup(
  candidate: Pick<SubscriptionCandidate, "sourceId" | "title" | "subgroup">
): string {
  const subgroup = normalizeText(candidate.subgroup)
  if (subgroup) {
    return subgroup
  }

  return extractSubgroup(candidate.sourceId, candidate.title)
}

export function matchesSubscriptionCandidate(input: MatchInput): SubscriptionMatchResult {
  const subgroup = deriveSubscriptionCandidateSubgroup(input.candidate)
  const context = {
    sourceId: input.candidate.sourceId,
    title: input.candidate.title,
    subgroup
  }

  const titleQuery = normalizeText(input.query.titleQuery)
  if (titleQuery) {
    const matched = matchesCondition(createContainsCondition("title", titleQuery), context).matched
    if (!matched) {
      return { matched: false, subgroup }
    }
  }

  const subgroupQuery = normalizeText(input.query.subgroupQuery)
  if (subgroupQuery) {
    const matched = matchesCondition(
      createContainsCondition("subgroup", subgroupQuery),
      context
    ).matched
    if (!matched) {
      return { matched: false, subgroup }
    }
  }

  const mustMatched = input.query.advanced.must.every(
    (condition) => matchesCondition(condition, context).matched
  )
  if (!mustMatched) {
    return { matched: false, subgroup }
  }

  if (input.query.advanced.any.length > 0) {
    const anyMatched = input.query.advanced.any.some(
      (condition) => matchesCondition(condition, context).matched
    )
    if (!anyMatched) {
      return { matched: false, subgroup }
    }
  }

  return { matched: true, subgroup }
}

function createContainsCondition(
  field: FilterCondition["field"],
  value: string
): FilterCondition {
  return {
    id: `subscription-${field}-query`,
    field,
    operator: "contains",
    value
  }
}

function normalizeText(value: string | undefined): string {
  return String(value ?? "").trim()
}
