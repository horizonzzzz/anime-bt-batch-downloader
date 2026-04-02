import { describe, expect, it } from "vitest"

import {
  runWorkbenchTest,
  type FilterWorkbenchSourceId
} from "../../../components/options/pages/filters/filter-workbench"
import type {
  FilterCondition,
  FilterRule,
  FilterRuleGroup
} from "../../../lib/shared/types"

function createCondition(
  overrides: Partial<FilterCondition> = {}
): FilterCondition {
  return {
    id: "condition-1",
    field: "subgroup",
    operator: "contains",
    value: "LoliHouse",
    ...overrides
  }
}

function createRule(overrides: Partial<FilterRule> = {}): FilterRule {
  return {
    id: "rule-1",
    name: "排除 LoliHouse",
    enabled: true,
    action: "exclude",
    relation: "and",
    conditions: [createCondition()],
    ...overrides
  }
}

function createGroup(overrides: Partial<FilterRuleGroup> = {}): FilterRuleGroup {
  return {
    id: "group-1",
    name: "字幕组过滤",
    description: "",
    enabled: true,
    rules: [createRule()],
    ...overrides
  }
}

describe("runWorkbenchTest", () => {
  it("ignores manual subgroup overrides and relies on title extraction", () => {
    const input: {
      source: FilterWorkbenchSourceId
      title: string
      subgroup: string
    } = {
      source: "kisssub",
      title: "[LoliHouse] 葬送的芙莉莲 - 01 [1080p]",
      subgroup: "SubsPlease"
    }
    const result = runWorkbenchTest(input, [createGroup()])

    expect(result).toMatchObject({
      state: "result",
      accepted: false,
      label: "拦截"
    })
    expect(result.trace).toContain("参与匹配的字幕组：LoliHouse。")
  })

  it("extracts subgroup from the title instead of relying on manual overrides", () => {
    const result = runWorkbenchTest({
      source: "kisssub",
      title: "[LoliHouse] 葬送的芙莉莲 - 01 [1080p]"
    }, [createGroup()])

    expect(result).toMatchObject({
      state: "result",
      accepted: false,
      label: "拦截"
    })
    expect(result.trace).toContain("参与匹配的字幕组：LoliHouse。")
  })

  it("reports missing subgroup extraction when the title does not contain a leading subgroup", () => {
    const result = runWorkbenchTest({
      source: "kisssub",
      title: "Frieren - 01 [LoliHouse] [1080p]"
    }, [createGroup()])

    expect(result).toMatchObject({
      state: "result",
      accepted: true,
      label: "放行"
    })
    expect(result.trace).toContain("当前未识别出字幕组信息。")
  })
})
