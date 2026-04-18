import { beforeEach, describe, expect, it } from "vitest"

import {
  clearContentScriptReadyForTab,
  markContentScriptReady,
  resetContentScriptReadyRegistry,
  waitForContentScriptReadySignal
} from "../../../src/lib/subscriptions/content-ready"

describe("content-ready registry", () => {
  beforeEach(() => {
    resetContentScriptReadyRegistry()
  })

  it("resolves immediately when the ready signal arrived before waiting", async () => {
    markContentScriptReady(12, "acgrip")

    await expect(waitForContentScriptReadySignal(12, "acgrip", 10)).resolves.toBeUndefined()
  })

  it("resolves an existing waiter when the ready signal arrives later", async () => {
    const pending = waitForContentScriptReadySignal(12, "acgrip", 100)

    markContentScriptReady(12, "acgrip")

    await expect(pending).resolves.toBeUndefined()
  })

  it("does not reuse cleared readiness state", async () => {
    markContentScriptReady(12, "acgrip")
    clearContentScriptReadyForTab(12)

    await expect(waitForContentScriptReadySignal(12, "acgrip", 10)).rejects.toThrow(
      "Timed out waiting for content script ready signal."
    )
  })
})
