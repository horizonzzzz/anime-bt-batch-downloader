import { describe, expect, it } from "vitest"

import type { FilterCondition, SourceId } from "../../../src/lib/shared/types"
import { deriveSubscriptionCandidateSubgroup, matchesSubscriptionCandidate } from "../../../src/lib/subscriptions/match"
import type {
  SubscriptionCandidate,
  SubscriptionQuery
} from "../../../src/lib/subscriptions/types"

function createCandidate(
  overrides: Partial<SubscriptionCandidate> = {}
): SubscriptionCandidate {
  return {
    sourceId: "acgrip",
    title: "[LoliHouse] Medalist - 01 [1080p]",
    normalizedTitle: "medalist 01",
    detailUrl: "https://acg.rip/t/100",
    magnetUrl: "magnet:?xt=urn:btih:111",
    torrentUrl: "",
    subgroup: "",
    ...overrides
  }
}

function createQuery(overrides: Partial<SubscriptionQuery> = {}): SubscriptionQuery {
  return {
    titleQuery: "",
    subgroupQuery: "",
    advanced: {
      must: [],
      any: []
    },
    ...overrides
  }
}

function condition(
  field: FilterCondition["field"],
  value: string
): FilterCondition {
  return {
    id: `${field}-${value}`,
    field,
    operator: "contains",
    value
  }
}

describe("deriveSubscriptionCandidateSubgroup", () => {
  it("reuses candidate subgroup when provided", () => {
    const subgroup = deriveSubscriptionCandidateSubgroup(
      createCandidate({
        subgroup: "手动字幕组",
        title: "[其他字幕组] Medalist - 01 [1080p]"
      })
    )

    expect(subgroup).toBe("手动字幕组")
  })

  it("derives subgroup from title when subgroup is empty", () => {
    const subgroup = deriveSubscriptionCandidateSubgroup(
      createCandidate({
        subgroup: "",
        title: "[LoliHouse] Medalist - 01 [1080p]"
      })
    )

    expect(subgroup).toBe("LoliHouse")
  })
})

describe("matchesSubscriptionCandidate", () => {
  it("matches title/subgroup query and advanced conditions", () => {
    const result = matchesSubscriptionCandidate({
      query: createQuery({
        titleQuery: "MEDALIST",
        subgroupQuery: "loli",
        advanced: {
          must: [condition("title", "01"), condition("subgroup", "House")],
          any: [condition("title", "RAW"), condition("subgroup", "Loli")]
        }
      }),
      candidate: createCandidate()
    })

    expect(result.matched).toBe(true)
    expect(result.subgroup).toBe("LoliHouse")
  })

  it("does not match when title query does not match candidate title", () => {
    const result = matchesSubscriptionCandidate({
      query: createQuery({
        titleQuery: "frieren"
      }),
      candidate: createCandidate()
    })

    expect(result.matched).toBe(false)
  })

  it("does not match when subgroup query cannot be satisfied", () => {
    const result = matchesSubscriptionCandidate({
      query: createQuery({
        subgroupQuery: "Loli"
      }),
      candidate: createCandidate({
        title: "Medalist - 01",
        subgroup: ""
      })
    })

    expect(result.matched).toBe(false)
    expect(result.subgroup).toBe("")
  })

  it("does not match when one advanced must condition fails", () => {
    const result = matchesSubscriptionCandidate({
      query: createQuery({
        advanced: {
          must: [condition("title", "MEDALIST"), condition("title", "BDRip")],
          any: []
        }
      }),
      candidate: createCandidate()
    })

    expect(result.matched).toBe(false)
  })

  it("does not match when advanced any conditions exist but none match", () => {
    const result = matchesSubscriptionCandidate({
      query: createQuery({
        advanced: {
          must: [condition("title", "MEDALIST")],
          any: [condition("title", "BDRip"), condition("subgroup", "幻樱")]
        }
      }),
      candidate: createCandidate()
    })

    expect(result.matched).toBe(false)
  })

  it("does not require advanced any when it is empty", () => {
    const result = matchesSubscriptionCandidate({
      query: createQuery({
        advanced: {
          must: [condition("title", "MEDALIST")],
          any: []
        }
      }),
      candidate: createCandidate()
    })

    expect(result.matched).toBe(true)
  })

  it.each<SourceId>(["dongmanhuayuan", "acgrip", "bangumimoe"])(
    "matches case-insensitively for source %s when advanced rules are reused",
    (sourceId) => {
      const result = matchesSubscriptionCandidate({
        query: createQuery({
          titleQuery: "medalist",
          advanced: {
            must: [condition("title", "MEDA"), condition("subgroup", "Loli")],
            any: [condition("title", "LIST")]
          }
        }),
        candidate: createCandidate({
          sourceId
        })
      })

      expect(result.matched).toBe(true)
    }
  )
})
