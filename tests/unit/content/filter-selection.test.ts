import { describe, expect, it } from "vitest"

import { buildSelectableBatchItem } from "../../../lib/content/filter-selection"
import type { FilterCondition, FilterEntry } from "../../../lib/shared/types"

function createCondition(overrides: Partial<FilterCondition> = {}): FilterCondition {
  if (overrides.field === "source") {
    return {
      id: "condition-source",
      field: "source",
      operator: "is",
      value: "kisssub",
      ...overrides
    } as FilterCondition
  }

  return {
    id: "condition-title",
    field: "title",
    operator: "contains",
    value: "1080",
    ...overrides
  } as FilterCondition
}

function createFilter(overrides: Partial<FilterEntry> = {}): FilterEntry {
  return {
    id: "filter-1",
    name: "保留 1080",
    enabled: true,
    must: [createCondition()],
    any: [],
    ...overrides
  }
}

describe("buildSelectableBatchItem", () => {
  it("marks items as selectable when no enabled filters exist", () => {
    expect(
      buildSelectableBatchItem(
        {
          sourceId: "kisssub",
          detailUrl: "https://www.kisssub.org/show-1.html",
          title: "[LoliHouse] Example 720p"
        },
        []
      )
    ).toMatchObject({
      selectable: true,
      blockedReason: ""
    })
  })

  it("marks items as blocked when enabled filters exist but nothing matches", () => {
    expect(
      buildSelectableBatchItem(
        {
          sourceId: "kisssub",
          detailUrl: "https://www.kisssub.org/show-2.html",
          title: "[LoliHouse] Example 720p"
        },
        [
          createFilter({
            must: [
              createCondition({
                field: "subgroup",
                value: "爱恋字幕社"
              })
            ]
          })
        ]
      )
    ).toMatchObject({
      selectable: false,
      blockedReason: "Blocked by filters: no filter matched"
    })
  })

  it("keeps the original item payload for selectable items", () => {
    const item = {
      sourceId: "kisssub" as const,
      detailUrl: "https://www.kisssub.org/show-3.html",
      title: "[爱恋字幕社] Example 1080p"
    }

    expect(
      buildSelectableBatchItem(item, [
        createFilter({
          must: [
            createCondition({
              field: "subgroup",
              value: "爱恋字幕社"
            })
          ]
        })
      ])
    ).toMatchObject({
      item,
      selectable: true,
      blockedReason: ""
    })
  })
})
