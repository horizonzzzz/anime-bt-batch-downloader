import { browser as importedBrowser } from "wxt/browser"
import { describe, expect, it } from "vitest"

import { getBrowser } from "../../../src/lib/shared/browser"

type RuntimeGlobals = typeof globalThis & {
  browser?: typeof importedBrowser
  chrome?: typeof importedBrowser
}

describe("WXT Vitest plugin wiring", () => {
  const runtimeGlobals = globalThis as RuntimeGlobals

  it("provides browser and chrome globals backed by the same fake browser instance", () => {
    expect(runtimeGlobals.browser).toBeDefined()
    expect(runtimeGlobals.chrome).toBeDefined()
    expect(runtimeGlobals.browser).toBe(runtimeGlobals.chrome)
    expect(importedBrowser).toBe(runtimeGlobals.browser)
    expect(getBrowser()).toBe(runtimeGlobals.browser)
  })

  it("stores values in fake browser storage", async () => {
    await runtimeGlobals.browser!.storage.local.set({
      wxtVitestPlugin: "value"
    })

    await expect(runtimeGlobals.browser!.storage.local.get("wxtVitestPlugin")).resolves.toEqual({
      wxtVitestPlugin: "value"
    })
  })

  it("starts each test with a clean fake browser storage state", async () => {
    await expect(runtimeGlobals.browser!.storage.local.get("wxtVitestPlugin")).resolves.toEqual({})
  })
})
