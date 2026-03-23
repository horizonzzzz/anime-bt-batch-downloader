import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../lib/content-page", () => ({
  getAnchorMountTarget: vi.fn(),
  getBatchItemFromAnchor: vi.fn(),
  getDetailAnchors: vi.fn(() => []),
  getSourceAdapterForLocation: vi.fn(() => null)
}))

describe("content script entry", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("provides a default export for the Plasmo content-script wrapper", async () => {
    const module = (await import("../../contents/kisssub")) as Record<string, unknown>

    expect(module.default).toBeTypeOf("function")
  })
})
