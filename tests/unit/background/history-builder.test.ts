import { describe, expect, it } from "vitest"

import { buildHistoryRecord } from "../../../lib/background/history-builder"
import { DEFAULT_SETTINGS } from "../../../lib/settings"
import type { BatchJob } from "../../../lib/background/types"

describe("buildHistoryRecord", () => {
  it("maps batch results into success, duplicate, and failed history items only", () => {
    const job: BatchJob = {
      sourceTabId: 1,
      savePath: "",
      settings: DEFAULT_SETTINGS,
      stats: {
        total: 1,
        processed: 1,
        prepared: 0,
        submitted: 0,
        duplicated: 0,
        failed: 1
      },
      results: [
        {
          ok: false,
          title: "[喵萌奶茶屋] Episode 01 [RAW]",
          detailUrl: "https://www.kisssub.org/show-deadbeef.html",
          hash: "",
          magnetUrl: "",
          torrentUrl: "",
          failureReason: "",
          status: "failed",
          deliveryMode: "",
          submitUrl: "",
          message: "Blocked by filters: no filter matched"
        }
      ]
    }

    const record = buildHistoryRecord(job, "kisssub")

    expect(record.status).toBe("partial_failure")
    expect(record.stats).toMatchObject({
      total: 1,
      success: 0,
      duplicated: 0,
      failed: 1
    })
    expect(record.items[0]).toMatchObject({
      status: "failed"
    })
    expect(record.items[0].failure).toBeDefined()
  })
})
