import type { FilterRule, FilterRuleAction, FilterRuleConditions, SourceId } from "../../../../lib/shared/types"

export type FilterRuleDraft = {
  id: string
  name: string
  enabled: boolean
  action: FilterRuleAction
  sourceIds: SourceId[]
  titleIncludesText: string
  titleExcludesText: string
  subgroupIncludesText: string
}

const ALL_SOURCES: SourceId[] = ["kisssub", "dongmanhuayuan", "acgrip", "bangumimoe"]

export function createEmptyFilterRuleDraft(): FilterRuleDraft {
  return {
    id: createFilterRuleId(),
    name: "",
    enabled: true,
    action: "exclude",
    sourceIds: [...ALL_SOURCES],
    titleIncludesText: "",
    titleExcludesText: "",
    subgroupIncludesText: ""
  }
}

export function createFilterRuleDraft(rule: FilterRule): FilterRuleDraft {
  return {
    id: rule.id,
    name: rule.name,
    enabled: rule.enabled,
    action: rule.action,
    sourceIds: [...rule.sourceIds],
    titleIncludesText: rule.conditions.titleIncludes.join(", "),
    titleExcludesText: rule.conditions.titleExcludes.join(", "),
    subgroupIncludesText: rule.conditions.subgroupIncludes.join(", ")
  }
}

export function toFilterRule(draft: FilterRuleDraft, order: number): FilterRule {
  const conditions: FilterRuleConditions = {
    titleIncludes: splitKeywords(draft.titleIncludesText),
    titleExcludes: splitKeywords(draft.titleExcludesText),
    subgroupIncludes: splitKeywords(draft.subgroupIncludesText)
  }

  return {
    id: draft.id,
    name: draft.name.trim(),
    enabled: draft.enabled,
    action: draft.action,
    sourceIds: [...draft.sourceIds],
    order,
    conditions
  }
}

export function hasFilterRuleConditions(draft: FilterRuleDraft): boolean {
  return [draft.titleIncludesText, draft.titleExcludesText, draft.subgroupIncludesText].some(
    (value) => splitKeywords(value).length > 0
  )
}

function splitKeywords(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function createFilterRuleId(): string {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
