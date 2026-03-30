import { describe, expect, it } from "vitest"

import { extractSubgroup } from "../../../lib/filter-rules/subgroup"
import type { SourceId } from "../../../lib/shared/types"

describe("extractSubgroup", () => {
  it.each<{
    sourceId: SourceId
    title: string
    expected: string
  }>([
    {
      sourceId: "kisssub",
      title: "[喵萌奶茶屋&LoliHouse] Summer Pockets [01][1080p]",
      expected: "喵萌奶茶屋&LoliHouse"
    },
    {
      sourceId: "dongmanhuayuan",
      title: "【豌豆字幕组】[4月新番] 末日后酒店 01 [1080P][简体]",
      expected: "豌豆字幕组"
    },
    {
      sourceId: "acgrip",
      title: "[LoliHouse] Mono 01 [WebRip 1080p HEVC-10bit AAC][简繁内封字幕]",
      expected: "LoliHouse"
    },
    {
      sourceId: "bangumimoe",
      title: "[ANi] Dr.STONE - 01 [1080P][Baha][WEB-DL][AAC AVC][CHT]",
      expected: "ANi"
    }
  ])("extracts subgroup for $sourceId titles", ({ sourceId, title, expected }) => {
    expect(extractSubgroup(sourceId, title)).toBe(expected)
  })

  it("returns an empty string when the title has no recognizable subgroup", () => {
    expect(extractSubgroup("kisssub", "Summer Pockets Episode 01")).toBe("")
  })
})
