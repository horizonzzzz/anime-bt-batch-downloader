import { describe, expect, it, vi, beforeEach } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

import { DEFAULT_BATCH_UI_PREFERENCES } from "../../../src/lib/batch-preferences/defaults"
import {
  getBatchUiPreferences,
  saveBatchUiPreferences
} from "../../../src/lib/batch-preferences/storage"

vi.mock("../../../src/lib/shared/browser", () => ({
  getBrowser: () => fakeBrowser
}))

describe("batch ui preferences storage", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    fakeBrowser.storage.local.clear()
  })

  it("hydrates default ui preferences", async () => {
    await expect(getBatchUiPreferences()).resolves.toEqual(DEFAULT_BATCH_UI_PREFERENCES)
  })

  it("trims the last save path", async () => {
    await expect(
      saveBatchUiPreferences({
        lastSavePath: "  D:\\Anime\\Batch  "
      })
    ).resolves.toEqual({
      lastSavePath: "D:\\Anime\\Batch"
    })
  })

  it("persists ui preferences changes to dedicated storage key", async () => {
    const saved = await saveBatchUiPreferences({
      lastSavePath: "E:\\Downloads\\Anime"
    })

    expect(saved.lastSavePath).toBe("E:\\Downloads\\Anime")

    const stored = await fakeBrowser.storage.local.get("batch_ui_preferences")
    expect(stored.batch_ui_preferences).toEqual(saved)

    // Re-read to verify persistence
    const reRead = await getBatchUiPreferences()
    expect(reRead).toEqual(saved)
  })

})
