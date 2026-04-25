import { describe, expect, it } from "vitest"

import type { SubscriptionCandidate } from "../../../src/lib/subscriptions/types"
import { createSubscriptionFingerprint } from "../../../src/lib/subscriptions/fingerprint"
import {
  RECENT_HIT_RETENTION_CAP,
  SEEN_FINGERPRINT_RETENTION_CAP,
  pushRecentHit,
  pushSeenFingerprint,
  retainSeenFingerprints
} from "../../../src/lib/subscriptions/retention"

function createCandidate(
  overrides: Partial<SubscriptionCandidate> = {}
): SubscriptionCandidate {
  return {
    sourceId: "acgrip",
    title: "[LoliHouse] Medalist - 01 [1080p]",
    normalizedTitle: "medalist 01",
    detailUrl: "https://acg.rip/t/100",
    magnetUrl: "",
    torrentUrl: "",
    subgroup: "",
    ...overrides
  }
}

describe("createSubscriptionFingerprint", () => {
  it("uses the magnet infohash first when available", () => {
    const fingerprint = createSubscriptionFingerprint(
      createCandidate({
        magnetUrl: " magnet:?xt=urn:btih:111&dn=Episode+01&tr=https%3A%2F%2Ftracker-1 ",
        torrentUrl: "https://example.com/a.torrent",
        detailUrl: "https://example.com/detail"
      })
    )

    expect(fingerprint).toBe("magnet-btih:111")
  })

  it("treats equivalent magnet urls with different params as the same fingerprint", () => {
    const left = createSubscriptionFingerprint(
      createCandidate({
        magnetUrl: "magnet:?tr=https%3A%2F%2Ftracker-1&dn=Episode+01&xt=urn:btih:ABCDEF123456"
      })
    )
    const right = createSubscriptionFingerprint(
      createCandidate({
        magnetUrl: "magnet:?xt=urn:btih:abcdef123456&dn=Episode+02&tr=https%3A%2F%2Ftracker-2"
      })
    )

    expect(left).toBe("magnet-btih:abcdef123456")
    expect(right).toBe("magnet-btih:abcdef123456")
  })

  it("does not throw when magnet params contain malformed escapes", () => {
    expect(
      createSubscriptionFingerprint(
        createCandidate({
          magnetUrl: "magnet:?xt=urn:btih:ABCDEF123456&dn=bad%zzvalue"
        })
      )
    ).toBe("magnet-btih:abcdef123456")
  })

  it("falls through to torrent url when magnet exists but has no parseable btih", () => {
    expect(
      createSubscriptionFingerprint(
        createCandidate({
          magnetUrl: "magnet:?dn=Episode+01&tr=https%3A%2F%2Ftracker-1",
          torrentUrl: " https://example.com/a.torrent "
        })
      )
    ).toBe("https://example.com/a.torrent")
  })

  it("ignores fake xt fragments hidden inside other decoded magnet params", () => {
    expect(
      createSubscriptionFingerprint(
        createCandidate({
          magnetUrl: "magnet:?dn=foo%26xt=urn:btih:FAKE123",
          torrentUrl: "https://example.com/real.torrent"
        })
      )
    ).toBe("https://example.com/real.torrent")
  })

  it("falls back to torrent url when magnet is empty", () => {
    const fingerprint = createSubscriptionFingerprint(
      createCandidate({
        magnetUrl: "",
        torrentUrl: " https://example.com/a.torrent ",
        detailUrl: "https://example.com/detail"
      })
    )

    expect(fingerprint).toBe("https://example.com/a.torrent")
  })

  it("falls back to detail url when direct resources are empty", () => {
    const fingerprint = createSubscriptionFingerprint(
      createCandidate({
        magnetUrl: "",
        torrentUrl: "",
        detailUrl: " https://example.com/detail "
      })
    )

    expect(fingerprint).toBe("https://example.com/detail")
  })

  it("falls back to source id plus normalized title when no links are available", () => {
    const fingerprint = createSubscriptionFingerprint(
      createCandidate({
        magnetUrl: "",
        torrentUrl: "",
        detailUrl: "",
        sourceId: "acgrip",
        normalizedTitle: "medalist 01"
      })
    )

    expect(fingerprint).toBe("acgrip:medalist 01")
  })

  it("requires normalized title when no links are available", () => {
    expect(() =>
      createSubscriptionFingerprint(
        createCandidate({
          magnetUrl: "",
          torrentUrl: "",
          detailUrl: "",
          sourceId: "acgrip",
          title: "[爱恋字幕社] Medalist - 01 [1080p]",
          normalizedTitle: ""
        })
      )
    ).toThrow("Normalized title is required when no direct resource link is available.")
  })
})

describe("subscription retention helpers", () => {
  it("keeps seen fingerprints bounded at 200 newest values", () => {
    const seenFingerprints = Array.from(
      { length: SEEN_FINGERPRINT_RETENTION_CAP },
      (_, index) => `fp-${index}`
    )

    const next = pushSeenFingerprint(seenFingerprints, "fp-new")

    expect(next).toHaveLength(SEEN_FINGERPRINT_RETENTION_CAP)
    expect(next[0]).toBe("fp-1")
    expect(next.at(-1)).toBe("fp-new")
  })

  it("keeps the newest occurrence when duplicate fingerprints are retained", () => {
    expect(retainSeenFingerprints(["fp-1", "fp-2", "fp-1"])).toEqual(["fp-2", "fp-1"])
  })

  it("keeps recent hits bounded at 20 newest values", () => {
    const recentHits = Array.from({ length: RECENT_HIT_RETENTION_CAP }, (_, index) =>
      createCandidate({
        normalizedTitle: `hit-${index}`
      })
    )

    const next = pushRecentHit(
      recentHits,
      createCandidate({
        normalizedTitle: "hit-new"
      })
    )

    expect(next).toHaveLength(RECENT_HIT_RETENTION_CAP)
    expect(next[0]?.normalizedTitle).toBe("hit-1")
    expect(next.at(-1)?.normalizedTitle).toBe("hit-new")
  })
})
