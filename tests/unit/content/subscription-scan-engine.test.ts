import { describe, expect, it, vi } from "vitest"

import type { PageSubscriptionScanner } from "../../../src/lib/content/subscription-scan/types"

describe("page subscription scanner contract", () => {
  it("defines the scanner interface with sourceId and scan method", () => {
    // This test will fail until we create types.ts
    const scanner: PageSubscriptionScanner = {
      sourceId: "acgrip",
      scan: vi.fn()
    }

    expect(scanner.sourceId).toBe("acgrip")
    expect(scanner.scan).toBeDefined()
  })
})