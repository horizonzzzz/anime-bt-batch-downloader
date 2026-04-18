import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

import {
  clearHistory,
  createHistoryItemId,
  createHistoryRecordId,
  deleteHistoryRecord,
  getHistoryRecord,
  getHistoryRecords,
  getHistoryStorage,
  saveTaskHistory,
  updateHistoryRecord
} from "../../../src/lib/history/storage"
import {
  DEFAULT_MAX_RECORDS,
  HISTORY_STORAGE_KEY,
  type TaskHistoryRecord
} from "../../../src/lib/history/types"

describe("history storage", () => {
  let setSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    setSpy = vi.spyOn(fakeBrowser.storage.local, "set")
  })

  describe("getHistoryStorage", () => {
    it("returns empty storage when no data exists", async () => {
      const result = await getHistoryStorage()
      expect(result.records).toEqual([])
      expect(result.maxRecords).toBe(DEFAULT_MAX_RECORDS)
    })

    it("returns existing storage when data exists", async () => {
      const existingRecords: TaskHistoryRecord[] = [
        {
          id: "batch-1",
          name: "Test",
          sourceId: "kisssub",
          originalDownloaderId: "qbittorrent",
          status: "completed",
          createdAt: "2026-01-01T00:00:00Z",
          stats: { total: 1, success: 1, duplicated: 0, failed: 0 },
          items: []
        }
      ]
      await fakeBrowser.storage.local.set({
        [HISTORY_STORAGE_KEY]: {
          records: existingRecords,
          maxRecords: DEFAULT_MAX_RECORDS
        }
      })

      const result = await getHistoryStorage()
      expect(result.records).toHaveLength(1)
    })
  })

  describe("getHistoryRecords", () => {
    it("returns records from storage", async () => {
      const existingRecords: TaskHistoryRecord[] = [
        {
          id: "batch-1",
          name: "Test",
          sourceId: "kisssub",
          originalDownloaderId: "qbittorrent",
          status: "completed",
          createdAt: "2026-01-01T00:00:00Z",
          stats: { total: 1, success: 1, duplicated: 0, failed: 0 },
          items: []
        }
      ]
      await fakeBrowser.storage.local.set({
        [HISTORY_STORAGE_KEY]: {
          records: existingRecords,
          maxRecords: DEFAULT_MAX_RECORDS
        }
      })

      const records = await getHistoryRecords()
      expect(records).toHaveLength(1)
      expect(records[0].id).toBe("batch-1")
    })
  })

  describe("saveTaskHistory", () => {
    it("prepends new record to storage", async () => {
      const newRecord: TaskHistoryRecord = {
        id: "batch-2",
        name: "New Test",
        sourceId: "kisssub",
        originalDownloaderId: "qbittorrent",
        status: "completed",
        createdAt: "2026-01-02T00:00:00Z",
        stats: { total: 1, success: 1, duplicated: 0, failed: 0 },
        items: []
      }

      await saveTaskHistory(newRecord)

      expect(setSpy).toHaveBeenCalled()
      await expect(fakeBrowser.storage.local.get(HISTORY_STORAGE_KEY)).resolves.toEqual({
        [HISTORY_STORAGE_KEY]: {
          records: [newRecord],
          maxRecords: DEFAULT_MAX_RECORDS,
          lastCleanupAt: undefined
        }
      })
    })

    it("trims records when exceeding maxRecords", async () => {
      const existingRecords: TaskHistoryRecord[] = Array.from(
        { length: DEFAULT_MAX_RECORDS },
        (_, i) => ({
          id: `batch-${i}`,
          name: `Test ${i}`,
          sourceId: "kisssub",
          originalDownloaderId: "qbittorrent" as const,
          status: "completed",
          createdAt: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
          stats: { total: 1, success: 1, duplicated: 0, failed: 0 },
          items: []
        })
      )
      await fakeBrowser.storage.local.set({
        [HISTORY_STORAGE_KEY]: {
          records: existingRecords,
          maxRecords: DEFAULT_MAX_RECORDS
        }
      })

      const newRecord: TaskHistoryRecord = {
        id: "batch-new",
        name: "New Test",
        sourceId: "kisssub",
        originalDownloaderId: "qbittorrent",
        status: "completed",
        createdAt: "2026-02-01T00:00:00Z",
        stats: { total: 1, success: 1, duplicated: 0, failed: 0 },
        items: []
      }

      await saveTaskHistory(newRecord)

      expect(setSpy).toHaveBeenCalled()
      const savedStorage = (await fakeBrowser.storage.local.get(HISTORY_STORAGE_KEY))[HISTORY_STORAGE_KEY] as {
        records: TaskHistoryRecord[]
        maxRecords: number
        lastCleanupAt?: string
      }
      expect(savedStorage.records).toHaveLength(DEFAULT_MAX_RECORDS)
      expect(savedStorage.records[0]).toEqual(newRecord)
      expect(savedStorage.lastCleanupAt).toBeDefined()
    })
  })

  describe("clearHistory", () => {
    it("resets storage to empty", async () => {
      await fakeBrowser.storage.local.set({
        [HISTORY_STORAGE_KEY]: {
          records: [
            {
              id: "batch-1",
              name: "Test",
              sourceId: "kisssub",
              originalDownloaderId: "qbittorrent",
              status: "completed",
              createdAt: "2026-01-01T00:00:00Z",
              stats: { total: 1, success: 1, duplicated: 0, failed: 0 },
              items: []
            }
          ],
          maxRecords: DEFAULT_MAX_RECORDS
        }
      })

      await clearHistory()

      expect(setSpy).toHaveBeenLastCalledWith({
        [HISTORY_STORAGE_KEY]: {
          records: [],
          maxRecords: DEFAULT_MAX_RECORDS,
          lastCleanupAt: undefined
        }
      })
    })
  })

  describe("getHistoryRecord", () => {
    it("returns null when record not found", async () => {
      const result = await getHistoryRecord("nonexistent")
      expect(result).toBeNull()
    })

    it("returns matching record when found", async () => {
      const existingRecords: TaskHistoryRecord[] = [
        {
          id: "batch-1",
          name: "Test",
          sourceId: "kisssub",
          originalDownloaderId: "qbittorrent",
          status: "completed",
          createdAt: "2026-01-01T00:00:00Z",
          stats: { total: 1, success: 1, duplicated: 0, failed: 0 },
          items: []
        }
      ]
      await fakeBrowser.storage.local.set({
        [HISTORY_STORAGE_KEY]: {
          records: existingRecords,
          maxRecords: DEFAULT_MAX_RECORDS
        }
      })

      const result = await getHistoryRecord("batch-1")
      expect(result).not.toBeNull()
      expect(result?.id).toBe("batch-1")
    })
  })

  describe("updateHistoryRecord", () => {
    it("updates existing record in storage", async () => {
      const existingRecords: TaskHistoryRecord[] = [
        {
          id: "batch-1",
          name: "Test",
          sourceId: "kisssub",
          originalDownloaderId: "qbittorrent",
          status: "completed",
          createdAt: "2026-01-01T00:00:00Z",
          stats: { total: 1, success: 1, duplicated: 0, failed: 0 },
          items: []
        }
      ]
      await fakeBrowser.storage.local.set({
        [HISTORY_STORAGE_KEY]: {
          records: existingRecords,
          maxRecords: DEFAULT_MAX_RECORDS
        }
      })

      const updatedRecord: TaskHistoryRecord = {
        ...existingRecords[0],
        name: "Updated Test",
        status: "partial_failure",
        stats: { total: 1, success: 0, duplicated: 0, failed: 1 }
      }

      await updateHistoryRecord(updatedRecord)

      expect(setSpy).toHaveBeenCalled()
      const savedStorage = (await fakeBrowser.storage.local.get(HISTORY_STORAGE_KEY))[HISTORY_STORAGE_KEY] as {
        records: TaskHistoryRecord[]
      }
      expect(savedStorage.records[0].name).toBe("Updated Test")
      expect(savedStorage.records[0].status).toBe("partial_failure")
    })

    it("does not add new record if id not found", async () => {
      await fakeBrowser.storage.local.set({
        [HISTORY_STORAGE_KEY]: {
          records: [],
          maxRecords: DEFAULT_MAX_RECORDS
        }
      })

      const newRecord: TaskHistoryRecord = {
        id: "batch-new",
        name: "New",
        sourceId: "kisssub",
        originalDownloaderId: "qbittorrent",
        status: "completed",
        createdAt: "2026-01-01T00:00:00Z",
        stats: { total: 1, success: 1, duplicated: 0, failed: 0 },
        items: []
      }

      await updateHistoryRecord(newRecord)

      const savedStorage = (await fakeBrowser.storage.local.get(HISTORY_STORAGE_KEY))[HISTORY_STORAGE_KEY] as {
        records: TaskHistoryRecord[]
      }
      expect(savedStorage.records).toHaveLength(0)
    })
  })

  describe("id helpers", () => {
    it("creates unique record id with timestamp and suffix", () => {
      const id = createHistoryRecordId()
      expect(id).toMatch(/^batch-\d+-[a-z0-9]{4}$/)
    })

    it("creates item id from record id and index", () => {
      const itemId = createHistoryItemId("batch-123-abc", 0)
      expect(itemId).toBe("batch-123-abc-0")
    })

    it("creates different item ids for different indices", () => {
      const recordId = "batch-123-abc"
      expect(createHistoryItemId(recordId, 0)).toBe("batch-123-abc-0")
      expect(createHistoryItemId(recordId, 5)).toBe("batch-123-abc-5")
    })
  })

  describe("deleteHistoryRecord", () => {
    it("removes matching record from storage", async () => {
      const existingRecords: TaskHistoryRecord[] = [
        {
          id: "batch-1",
          name: "Test 1",
          sourceId: "kisssub",
          originalDownloaderId: "qbittorrent",
          status: "completed",
          createdAt: "2026-01-01T00:00:00Z",
          stats: { total: 1, success: 1, duplicated: 0, failed: 0 },
          items: []
        },
        {
          id: "batch-2",
          name: "Test 2",
          sourceId: "kisssub",
          originalDownloaderId: "qbittorrent",
          status: "completed",
          createdAt: "2026-01-02T00:00:00Z",
          stats: { total: 1, success: 1, duplicated: 0, failed: 0 },
          items: []
        }
      ]
      await fakeBrowser.storage.local.set({
        [HISTORY_STORAGE_KEY]: {
          records: existingRecords,
          maxRecords: DEFAULT_MAX_RECORDS
        }
      })

      await deleteHistoryRecord("batch-1")

      expect(setSpy).toHaveBeenCalled()
      const savedStorage = (await fakeBrowser.storage.local.get(HISTORY_STORAGE_KEY))[HISTORY_STORAGE_KEY] as {
        records: TaskHistoryRecord[]
      }
      expect(savedStorage.records).toHaveLength(1)
      expect(savedStorage.records[0].id).toBe("batch-2")
    })

    it("does nothing when record not found", async () => {
      await fakeBrowser.storage.local.set({
        [HISTORY_STORAGE_KEY]: {
          records: [
            {
              id: "batch-1",
              name: "Test",
              sourceId: "kisssub",
              originalDownloaderId: "qbittorrent",
              status: "completed",
              createdAt: "2026-01-01T00:00:00Z",
              stats: { total: 1, success: 1, duplicated: 0, failed: 0 },
              items: []
            }
          ],
          maxRecords: DEFAULT_MAX_RECORDS
        }
      })

      await deleteHistoryRecord("nonexistent")

      const savedStorage = (await fakeBrowser.storage.local.get(HISTORY_STORAGE_KEY))[HISTORY_STORAGE_KEY] as {
        records: TaskHistoryRecord[]
      }
      expect(savedStorage.records).toHaveLength(1)
    })

    it("handles empty storage", async () => {
      await fakeBrowser.storage.local.set({
        [HISTORY_STORAGE_KEY]: {
          records: [],
          maxRecords: DEFAULT_MAX_RECORDS
        }
      })

      await deleteHistoryRecord("nonexistent")

      const savedStorage = (await fakeBrowser.storage.local.get(HISTORY_STORAGE_KEY))[HISTORY_STORAGE_KEY] as {
        records: TaskHistoryRecord[]
      }
      expect(savedStorage.records).toHaveLength(0)
    })
  })
})
