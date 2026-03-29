# 历史记录重试与删除功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为任务历史页面添加重试失败条目和删除历史记录功能

**Architecture:** 复用现有 qBittorrent 提交逻辑，新增 `lib/background/retry.ts` 处理重试编排，扩展 `lib/history/storage.ts` 支持单条记录读写和删除，扩展 Runtime 消息类型，新增 UI 组件处理确认对话框和按钮交互。

**Tech Stack:** TypeScript, React 19, Tailwind CSS, Vitest, Playwright

---

## 文件结构

**新建文件：**
- `lib/background/retry.ts` - 重试失败条目的编排逻辑
- `lib/history/delete.ts` - 删除历史记录的存储操作
- `components/options/ui/alert-dialog.tsx` - AlertDialog 组件（shadcn/ui 风格）
- `components/options/ui/confirmation-dialog.tsx` - 确认对话框封装组件
- `components/options/pages/history/RetryAllButton.tsx` - 重试全部失败项按钮
- `components/options/pages/history/DeleteRecordButton.tsx` - 删除单条记录按钮
- `components/options/pages/history/ClearHistoryButton.tsx` - 清空全部历史按钮
- `tests/unit/background/retry.test.ts` - 重试逻辑单元测试
- `tests/unit/history/delete.test.ts` - 删除逻辑单元测试

**修改文件：**
- `lib/shared/messages.ts` - 新增消息类型
- `lib/history/storage.ts` - 新增 `getHistoryRecord`、`updateHistoryRecord` 函数
- `lib/history/index.ts` - 导出新增函数
- `background.ts` - 处理新消息类型
- `components/options/pages/history/HistoryListView.tsx` - 添加删除和清空按钮
- `components/options/pages/history/HistoryDetailView.tsx` - 添加重试和删除按钮
- `AGENTS.md` - 文档更新

---

## Task 1: 扩展 Runtime 消息类型

**Files:**
- Modify: `lib/shared/messages.ts`

- [ ] **Step 1: 添加新消息类型定义**

在 `RuntimeRequest` 类型中添加 `RETRY_FAILED_ITEMS` 和 `DELETE_HISTORY_RECORD`：

```typescript
export type RuntimeRequest =
  | { type: "GET_HISTORY" }
  | { type: "CLEAR_HISTORY" }
  | { type: "DELETE_HISTORY_RECORD"; recordId: string }
  | { type: "RETRY_FAILED_ITEMS"; recordId: string; itemIds?: string[] }
  | { type: "GET_SETTINGS" }
  | { type: "SAVE_SETTINGS"; settings?: Partial<Settings> }
  | { type: "TEST_QB_CONNECTION"; settings?: Partial<Settings> | null }
  | { type: "OPEN_OPTIONS_PAGE" }
  | { type: "START_BATCH_DOWNLOAD"; items?: BatchItem[]; savePath?: string }
```

- [ ] **Step 2: 添加成功响应类型**

添加 `RetryFailedItemsSuccessResponse` 和 `DeleteHistoryRecordSuccessResponse`：

```typescript
export type RetryFailedItemsSuccessResponse = {
  ok: true
  successCount: number
  failedCount: number
}

export type DeleteHistoryRecordSuccessResponse = {
  ok: true
}
```

- [ ] **Step 3: 更新 RuntimeSuccessResponseMap**

在映射表中添加新类型：

```typescript
export type RuntimeSuccessResponseMap = {
  GET_HISTORY: GetHistorySuccessResponse
  CLEAR_HISTORY: ClearHistorySuccessResponse
  DELETE_HISTORY_RECORD: DeleteHistoryRecordSuccessResponse
  RETRY_FAILED_ITEMS: RetryFailedItemsSuccessResponse
  GET_SETTINGS: GetSettingsSuccessResponse
  SAVE_SETTINGS: SaveSettingsSuccessResponse
  TEST_QB_CONNECTION: TestQbConnectionSuccessResponse
  OPEN_OPTIONS_PAGE: OpenOptionsPageSuccessResponse
  START_BATCH_DOWNLOAD: StartBatchDownloadSuccessResponse
}
```

- [ ] **Step 4: 添加响应类型别名**

```typescript
export type RetryFailedItemsResponse = RuntimeResponseFor<"RETRY_FAILED_ITEMS">
export type DeleteHistoryRecordResponse = RuntimeResponseFor<"DELETE_HISTORY_RECORD">
```

- [ ] **Step 5: 运行 typecheck 验证**

Run: `pnpm typecheck`
Expected: PASS（类型定义正确）

- [ ] **Step 6: Commit**

```bash
git add lib/shared/messages.ts
git commit -m "feat(messages): add RETRY_FAILED_ITEMS and DELETE_HISTORY_RECORD types"
```

---

## Task 2: 扩展 history storage 函数

**Files:**
- Modify: `lib/history/storage.ts`
- Modify: `lib/history/index.ts`
- Create: `lib/history/delete.ts`

- [ ] **Step 1: 添加 getHistoryRecord 函数**

在 `lib/history/storage.ts` 中添加：

```typescript
export async function getHistoryRecord(recordId: string): Promise<TaskHistoryRecord | null> {
  const records = await getHistoryRecords()
  return records.find(r => r.id === recordId) ?? null
}
```

- [ ] **Step 2: 添加 updateHistoryRecord 函数**

在 `lib/history/storage.ts` 中添加：

```typescript
export async function updateHistoryRecord(record: TaskHistoryRecord): Promise<void> {
  const storage = await getHistoryStorage()
  const updatedRecords = storage.records.map(r => r.id === record.id ? record : r)
  await chrome.storage.local.set({
    [HISTORY_STORAGE_KEY]: { ...storage, records: updatedRecords }
  })
}
```

- [ ] **Step 3: 创建 delete.ts 文件**

创建 `lib/history/delete.ts`：

```typescript
import { HISTORY_STORAGE_KEY, type HistoryStorage } from "./types"
import { getHistoryStorage } from "./storage"

export async function deleteHistoryRecord(recordId: string): Promise<void> {
  const storage = await getHistoryStorage()
  const updatedRecords = storage.records.filter(r => r.id !== recordId)
  await chrome.storage.local.set({
    [HISTORY_STORAGE_KEY]: {
      ...storage,
      records: updatedRecords
    }
  })
}
```

- [ ] **Step 4: 更新 index.ts 导出**

在 `lib/history/index.ts` 中添加导出：

```typescript
export { getHistoryRecord, updateHistoryRecord } from "./storage"
export { deleteHistoryRecord } from "./delete"
```

- [ ] **Step 5: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/history/storage.ts lib/history/delete.ts lib/history/index.ts
git commit -m "feat(history): add getHistoryRecord, updateHistoryRecord, and deleteHistoryRecord"
```

---

## Task 3: 添加 history storage 函数单元测试

**Files:**
- Modify: `tests/unit/history/storage.test.ts`

- [ ] **Step 1: 添加 getHistoryRecord 测试**

在 `tests/unit/history/storage.test.ts` 中添加测试：

```typescript
import { getHistoryRecord, updateHistoryRecord } from "../../../lib/history/storage"

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
        status: "completed",
        createdAt: "2026-01-01T00:00:00Z",
        stats: { total: 1, success: 1, duplicated: 0, failed: 0 },
        items: [],
        version: 1
      }
    ]
    state[HISTORY_STORAGE_KEY] = {
      records: existingRecords,
      maxRecords: DEFAULT_MAX_RECORDS
    }

    const result = await getHistoryRecord("batch-1")
    expect(result).not.toBeNull()
    expect(result?.id).toBe("batch-1")
  })
})
```

- [ ] **Step 2: 添加 updateHistoryRecord 测试**

```typescript
describe("updateHistoryRecord", () => {
  it("updates existing record in storage", async () => {
    const existingRecords: TaskHistoryRecord[] = [
      {
        id: "batch-1",
        name: "Test",
        sourceId: "kisssub",
        status: "completed",
        createdAt: "2026-01-01T00:00:00Z",
        stats: { total: 1, success: 1, duplicated: 0, failed: 0 },
        items: [],
        version: 1
      }
    ]
    state[HISTORY_STORAGE_KEY] = {
      records: existingRecords,
      maxRecords: DEFAULT_MAX_RECORDS
    }

    const updatedRecord: TaskHistoryRecord = {
      ...existingRecords[0],
      name: "Updated Test",
      status: "partial_failure",
      stats: { total: 1, success: 0, duplicated: 0, failed: 1 }
    }

    await updateHistoryRecord(updatedRecord)

    expect(storage.set).toHaveBeenCalled()
    const savedData = storage.set.mock.calls[0]?.[0] as StoredState
    const savedStorage = savedData[HISTORY_STORAGE_KEY] as { records: TaskHistoryRecord[] }
    expect(savedStorage.records[0].name).toBe("Updated Test")
    expect(savedStorage.records[0].status).toBe("partial_failure")
  })

  it("does not add new record if id not found", async () => {
    state[HISTORY_STORAGE_KEY] = {
      records: [],
      maxRecords: DEFAULT_MAX_RECORDS
    }

    const newRecord: TaskHistoryRecord = {
      id: "batch-new",
      name: "New",
      sourceId: "kisssub",
      status: "completed",
      createdAt: "2026-01-01T00:00:00Z",
      stats: { total: 1, success: 1, duplicated: 0, failed: 0 },
      items: [],
      version: 1
    }

    await updateHistoryRecord(newRecord)

    const savedData = storage.set.mock.calls[0]?.[0] as StoredState
    const savedStorage = savedData[HISTORY_STORAGE_KEY] as { records: TaskHistoryRecord[] }
    expect(savedStorage.records).toHaveLength(0)
  })
})
```

- [ ] **Step 3: 运行测试**

Run: `pnpm test tests/unit/history/storage.test.ts`
Expected: PASS（所有测试通过）

- [ ] **Step 4: Commit**

```bash
git add tests/unit/history/storage.test.ts
git commit -m "test(history): add tests for getHistoryRecord and updateHistoryRecord"
```

---

## Task 4: 创建 delete.ts 单元测试

**Files:**
- Create: `tests/unit/history/delete.test.ts`

- [ ] **Step 1: 创建测试文件**

创建 `tests/unit/history/delete.test.ts`：

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest"
import { deleteHistoryRecord } from "../../../lib/history/delete"
import { DEFAULT_MAX_RECORDS, HISTORY_STORAGE_KEY, type TaskHistoryRecord } from "../../../lib/history/types"

type StoredState = {
  [HISTORY_STORAGE_KEY]?: unknown
}

function installChromeStorageMock(state: StoredState) {
  const get = vi.fn(async () => ({
    [HISTORY_STORAGE_KEY]: state[HISTORY_STORAGE_KEY]
  }))
  const set = vi.fn(async (value: StoredState) => {
    state[HISTORY_STORAGE_KEY] = value[HISTORY_STORAGE_KEY]
  })

  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      storage: {
        local: {
          get,
          set
        }
      }
    }
  })

  return { get, set }
}

describe("deleteHistoryRecord", () => {
  let state: StoredState
  let storage: ReturnType<typeof installChromeStorageMock>

  beforeEach(() => {
    vi.clearAllMocks()
    state = {}
    storage = installChromeStorageMock(state)
  })

  it("removes matching record from storage", async () => {
    const existingRecords: TaskHistoryRecord[] = [
      {
        id: "batch-1",
        name: "Test 1",
        sourceId: "kisssub",
        status: "completed",
        createdAt: "2026-01-01T00:00:00Z",
        stats: { total: 1, success: 1, duplicated: 0, failed: 0 },
        items: [],
        version: 1
      },
      {
        id: "batch-2",
        name: "Test 2",
        sourceId: "kisssub",
        status: "completed",
        createdAt: "2026-01-02T00:00:00Z",
        stats: { total: 1, success: 1, duplicated: 0, failed: 0 },
        items: [],
        version: 1
      }
    ]
    state[HISTORY_STORAGE_KEY] = {
      records: existingRecords,
      maxRecords: DEFAULT_MAX_RECORDS
    }

    await deleteHistoryRecord("batch-1")

    expect(storage.set).toHaveBeenCalled()
    const savedData = storage.set.mock.calls[0]?.[0] as StoredState
    const savedStorage = savedData[HISTORY_STORAGE_KEY] as { records: TaskHistoryRecord[] }
    expect(savedStorage.records).toHaveLength(1)
    expect(savedStorage.records[0].id).toBe("batch-2")
  })

  it("does nothing when record not found", async () => {
    state[HISTORY_STORAGE_KEY] = {
      records: [
        {
          id: "batch-1",
          name: "Test",
          sourceId: "kisssub",
          status: "completed",
          createdAt: "2026-01-01T00:00:00Z",
          stats: { total: 1, success: 1, duplicated: 0, failed: 0 },
          items: [],
          version: 1
        }
      ],
      maxRecords: DEFAULT_MAX_RECORDS
    }

    await deleteHistoryRecord("nonexistent")

    const savedData = storage.set.mock.calls[0]?.[0] as StoredState
    const savedStorage = savedData[HISTORY_STORAGE_KEY] as { records: TaskHistoryRecord[] }
    expect(savedStorage.records).toHaveLength(1)
  })

  it("handles empty storage", async () => {
    state[HISTORY_STORAGE_KEY] = {
      records: [],
      maxRecords: DEFAULT_MAX_RECORDS
    }

    await deleteHistoryRecord("nonexistent")

    const savedData = storage.set.mock.calls[0]?.[0] as StoredState
    const savedStorage = savedData[HISTORY_STORAGE_KEY] as { records: TaskHistoryRecord[] }
    expect(savedStorage.records).toHaveLength(0)
  })
})
```

- [ ] **Step 2: 运行测试**

Run: `pnpm test tests/unit/history/delete.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/unit/history/delete.test.ts
git commit -m "test(history): add tests for deleteHistoryRecord"
```

---

## Task 5: 创建 retry.ts 重试逻辑

**Files:**
- Create: `lib/background/retry.ts`

- [ ] **Step 1: 创建 retry.ts 文件**

创建 `lib/background/retry.ts`：

```typescript
import type { Settings } from "../shared/types"
import type { TaskHistoryItem, TaskHistoryRecord } from "../history/types"

export type RetryRequest = {
  recordId: string
  itemIds?: string[]
}

export type RetryResult = {
  successCount: number
  failedCount: number
  updatedRecord: TaskHistoryRecord
}

export type RetryDependencies = {
  getSettings: () => Promise<Settings>
  getHistoryRecord: (recordId: string) => Promise<TaskHistoryRecord | null>
  updateHistoryRecord: (record: TaskHistoryRecord) => Promise<void>
  loginQb: (settings: Settings) => Promise<void>
  addUrlsToQb: (settings: Settings, urls: string[], options?: { savePath?: string }) => Promise<void>
}

function getSubmitUrl(item: TaskHistoryItem): string | null {
  if (item.magnetUrl) return item.magnetUrl
  if (item.torrentUrl) return item.torrentUrl
  return null
}

function updateItemAfterSuccess(item: TaskHistoryItem): TaskHistoryItem {
  return {
    ...item,
    status: "success",
    failure: undefined
  }
}

function updateItemAfterFailure(item: TaskHistoryItem, message: string): TaskHistoryItem {
  const now = new Date().toISOString()
  return {
    ...item,
    status: "failed",
    failure: {
      reason: item.failure?.reason ?? "unknown",
      message,
      retryable: true,
      retryCount: (item.failure?.retryCount ?? 0) + 1,
      lastRetryAt: now
    }
  }
}

function recalculateStats(items: TaskHistoryItem[]): TaskHistoryRecord["stats"] {
  const total = items.length
  const success = items.filter(i => i.status === "success").length
  const duplicated = items.filter(i => i.status === "duplicate").length
  const failed = items.filter(i => i.status === "failed").length
  return { total, success, duplicated, failed }
}

export async function retryFailedItems(
  request: RetryRequest,
  deps: RetryDependencies
): Promise<RetryResult> {
  const record = await deps.getHistoryRecord(request.recordId)
  if (!record) {
    throw new Error("历史记录不存在")
  }

  const targetItems = request.itemIds
    ? record.items.filter(i => request.itemIds!.includes(i.id))
    : record.items.filter(i => i.status === "failed")

  if (targetItems.length === 0) {
    return {
      successCount: 0,
      failedCount: 0,
      updatedRecord: record
    }
  }

  const itemsWithUrls: { item: TaskHistoryItem; url: string }[] = []
  const itemsWithoutUrls: TaskHistoryItem[] = []

  for (const item of targetItems) {
    const url = getSubmitUrl(item)
    if (url) {
      itemsWithUrls.push({ item, url })
    } else {
      itemsWithoutUrls.push(updateItemAfterFailure(item, "无可用的 magnet 或 torrent 链接"))
    }
  }

  const settings = await deps.getSettings()

  try {
    await deps.loginQb(settings)
  } catch (error) {
    throw new Error(`qBittorrent 登录失败: ${error instanceof Error ? error.message : String(error)}`)
  }

  let successCount = 0
  let failedCount = itemsWithoutUrls.length
  const updatedItems: TaskHistoryItem[] = record.items.map(item => {
    const wasTarget = targetItems.some(t => t.id === item.id)
    if (!wasTarget) return item

    const withoutUrl = itemsWithoutUrls.find(w => w.id === item.id)
    if (withoutUrl) return withoutUrl

    return item
  })

  if (itemsWithUrls.length > 0) {
    const urls = itemsWithUrls.map(i => i.url)
    const savePathOption = record.savePath ? { savePath: record.savePath } : undefined

    try {
      await deps.addUrlsToQb(settings, urls, savePathOption)

      for (const { item } of itemsWithUrls) {
        const index = updatedItems.findIndex(i => i.id === item.id)
        if (index !== -1) {
          updatedItems[index] = updateItemAfterSuccess(item)
        }
        successCount++
      }
    } catch (error) {
      const message = `qBittorrent 提交失败: ${error instanceof Error ? error.message : String(error)}`
      for (const { item } of itemsWithUrls) {
        const index = updatedItems.findIndex(i => i.id === item.id)
        if (index !== -1) {
          updatedItems[index] = updateItemAfterFailure(item, message)
        }
        failedCount++
      }
    }
  }

  const stats = recalculateStats(updatedItems)
  const status = stats.failed > 0 ? "partial_failure" : "completed"
  const updatedRecord: TaskHistoryRecord = {
    ...record,
    items: updatedItems,
    stats,
    status
  }

  await deps.updateHistoryRecord(updatedRecord)

  return {
    successCount,
    failedCount,
    updatedRecord
  }
}
```

- [ ] **Step 2: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/background/retry.ts
git commit -m "feat(background): add retryFailedItems function"
```

---

## Task 6: 创建 retry.ts 单元测试

**Files:**
- Create: `tests/unit/background/retry.test.ts`

- [ ] **Step 1: 创建测试文件**

创建 `tests/unit/background/retry.test.ts`：

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest"
import { retryFailedItems, type RetryDependencies, type RetryRequest } from "../../../lib/background/retry"
import type { Settings } from "../../../lib/shared/types"
import type { TaskHistoryItem, TaskHistoryRecord } from "../../../lib/history/types"

function createMockRecord(id: string, items: TaskHistoryItem[]): TaskHistoryRecord {
  return {
    id,
    name: "Test Batch",
    sourceId: "kisssub",
    status: "partial_failure",
    createdAt: "2026-01-01T00:00:00Z",
    stats: {
      total: items.length,
      success: items.filter(i => i.status === "success").length,
      duplicated: items.filter(i => i.status === "duplicate").length,
      failed: items.filter(i => i.status === "failed").length
    },
    items,
    version: 1
  }
}

function createFailedItem(id: string, title: string, magnetUrl?: string): TaskHistoryItem {
  return {
    id,
    title,
    detailUrl: `https://example.com/${id}`,
    sourceId: "kisssub",
    magnetUrl,
    status: "failed",
    failure: {
      reason: "qb_error",
      message: "qBittorrent rejected",
      retryable: true,
      retryCount: 0
    },
    deliveryMode: "magnet"
  }
}

function createSuccessItem(id: string, title: string): TaskHistoryItem {
  return {
    id,
    title,
    detailUrl: `https://example.com/${id}`,
    sourceId: "kisssub",
    magnetUrl: `magnet:?xt=urn:btih:${id}`,
    status: "success",
    deliveryMode: "magnet"
  }
}

function createMockDeps(
  overrides?: Partial<RetryDependencies>
): RetryDependencies {
  return {
    getSettings: vi.fn(async () => ({
      qbBaseUrl: "http://localhost:8080",
      qbUsername: "admin",
      qbPassword: "password",
      concurrency: 3,
      enabledSources: ["kisssub"],
      lastSavePath: ""
    } as Settings)),
    getHistoryRecord: vi.fn(async () => null),
    updateHistoryRecord: vi.fn(async () => {}),
    loginQb: vi.fn(async () => {}),
    addUrlsToQb: vi.fn(async () => {}),
    ...overrides
  }
}

describe("retryFailedItems", () => {
  let deps: RetryDependencies

  beforeEach(() => {
    vi.clearAllMocks()
    deps = createMockDeps()
  })

  describe("error cases", () => {
    it("throws when record not found", async () => {
      deps.getHistoryRecord = vi.fn(async () => null)

      const request: RetryRequest = { recordId: "nonexistent" }

      await expect(retryFailedItems(request, deps)).rejects.toThrow("历史记录不存在")
    })

    it("throws when qBittorrent login fails", async () => {
      const record = createMockRecord("batch-1", [createFailedItem("item-1", "Test", "magnet:?xt=test")])
      deps.getHistoryRecord = vi.fn(async () => record)
      deps.loginQb = vi.fn(async () => { throw new Error("Connection refused") })

      const request: RetryRequest = { recordId: "batch-1" }

      await expect(retryFailedItems(request, deps)).rejects.toThrow("qBittorrent 登录失败")
      expect(deps.updateHistoryRecord).not.toHaveBeenCalled()
    })
  })

  describe("success cases", () => {
    it("returns zero counts when no failed items", async () => {
      const record = createMockRecord("batch-1", [createSuccessItem("item-1", "Test")])
      deps.getHistoryRecord = vi.fn(async () => record)

      const request: RetryRequest = { recordId: "batch-1" }
      const result = await retryFailedItems(request, deps)

      expect(result.successCount).toBe(0)
      expect(result.failedCount).toBe(0)
      expect(deps.addUrlsToQb).not.toHaveBeenCalled()
    })

    it("successfully retries failed items with magnet URLs", async () => {
      const failedItem = createFailedItem("item-1", "Failed", "magnet:?xt=test")
      const record = createMockRecord("batch-1", [failedItem])
      deps.getHistoryRecord = vi.fn(async () => record)

      const request: RetryRequest = { recordId: "batch-1" }
      const result = await retryFailedItems(request, deps)

      expect(result.successCount).toBe(1)
      expect(result.failedCount).toBe(0)
      expect(deps.addUrlsToQb).toHaveBeenCalledWith(
        expect.anything(),
        ["magnet:?xt=test"],
        undefined
      )
      expect(deps.updateHistoryRecord).toHaveBeenCalled()
      const updatedRecord = (deps.updateHistoryRecord as vi.Mock).mock.calls[0][0]
      expect(updatedRecord.items[0].status).toBe("success")
      expect(updatedRecord.status).toBe("completed")
    })

    it("uses savePath from record when available", async () => {
      const failedItem = createFailedItem("item-1", "Failed", "magnet:?xt=test")
      const record = {
        ...createMockRecord("batch-1", [failedItem]),
        savePath: "/downloads/anime"
      }
      deps.getHistoryRecord = vi.fn(async () => record)

      const request: RetryRequest = { recordId: "batch-1" }
      await retryFailedItems(request, deps)

      expect(deps.addUrlsToQb).toHaveBeenCalledWith(
        expect.anything(),
        ["magnet:?xt=test"],
        { savePath: "/downloads/anime" }
      )
    })
  })

  describe("partial failure cases", () => {
    it("marks items without URLs as failed", async () => {
      const failedItemNoUrl = createFailedItem("item-1", "No URL")
      const record = createMockRecord("batch-1", [failedItemNoUrl])
      deps.getHistoryRecord = vi.fn(async () => record)

      const request: RetryRequest = { recordId: "batch-1" }
      const result = await retryFailedItems(request, deps)

      expect(result.successCount).toBe(0)
      expect(result.failedCount).toBe(1)
      expect(deps.addUrlsToQb).not.toHaveBeenCalled()
      const updatedRecord = (deps.updateHistoryRecord as vi.Mock).mock.calls[0][0]
      expect(updatedRecord.items[0].status).toBe("failed")
      expect(updatedRecord.items[0].failure?.message).toBe("无可用的 magnet 或 torrent 链接")
      expect(updatedRecord.items[0].failure?.retryCount).toBe(1)
    })

    it("marks all items failed when submission fails", async () => {
      const failedItem = createFailedItem("item-1", "Failed", "magnet:?xt=test")
      const record = createMockRecord("batch-1", [failedItem])
      deps.getHistoryRecord = vi.fn(async () => record)
      deps.addUrlsToQb = vi.fn(async () => { throw new Error("HTTP 500") })

      const request: RetryRequest = { recordId: "batch-1" }
      const result = await retryFailedItems(request, deps)

      expect(result.successCount).toBe(0)
      expect(result.failedCount).toBe(1)
      const updatedRecord = (deps.updateHistoryRecord as vi.Mock).mock.calls[0][0]
      expect(updatedRecord.items[0].status).toBe("failed")
      expect(updatedRecord.items[0].failure?.retryCount).toBe(1)
      expect(updatedRecord.items[0].failure?.lastRetryAt).toBeDefined()
    })
  })

  describe("item filtering", () => {
    it("retries only specified itemIds when provided", async () => {
      const failed1 = createFailedItem("item-1", "Failed 1", "magnet:?xt=1")
      const failed2 = createFailedItem("item-2", "Failed 2", "magnet:?xt=2")
      const record = createMockRecord("batch-1", [failed1, failed2])
      deps.getHistoryRecord = vi.fn(async () => record)

      const request: RetryRequest = { recordId: "batch-1", itemIds: ["item-1"] }
      const result = await retryFailedItems(request, deps)

      expect(result.successCount).toBe(1)
      expect(deps.addUrlsToQb).toHaveBeenCalledWith(
        expect.anything(),
        ["magnet:?xt=1"],
        undefined
      )
      const updatedRecord = (deps.updateHistoryRecord as vi.Mock).mock.calls[0][0]
      expect(updatedRecord.items[0].status).toBe("success")
      expect(updatedRecord.items[1].status).toBe("failed")
    })
  })

  describe("stats recalculation", () => {
    it("recalculates stats correctly after retry", async () => {
      const failed = createFailedItem("item-1", "Failed", "magnet:?xt=test")
      const success = createSuccessItem("item-2", "Success")
      const record = createMockRecord("batch-1", [failed, success])
      deps.getHistoryRecord = vi.fn(async () => record)

      const request: RetryRequest = { recordId: "batch-1" }
      const result = await retryFailedItems(request, deps)

      expect(result.updatedRecord.stats.total).toBe(2)
      expect(result.updatedRecord.stats.success).toBe(2)
      expect(result.updatedRecord.stats.failed).toBe(0)
      expect(result.updatedRecord.status).toBe("completed")
    })
  })
})
```

- [ ] **Step 2: 运行测试**

Run: `pnpm test tests/unit/background/retry.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/unit/background/retry.test.ts
git commit -m "test(background): add tests for retryFailedItems"
```

---

## Task 7: 扩展 background.ts 处理新消息

**Files:**
- Modify: `background.ts`
- Modify: `lib/background/index.ts`

- [ ] **Step 1: 导入新函数**

在 `background.ts` 中添加导入：

```typescript
import { createBatchDownloadManager, testQbConnection } from "./lib/background"
import { retryFailedItems } from "./lib/background/retry"
import { addTorrentFilesToQb, addUrlsToQb, loginQb } from "./lib/downloader/qb"
import { deleteHistoryRecord, getHistoryRecord, getHistoryRecords, clearHistory, updateHistoryRecord } from "./lib/history"
import { ensureSettings, getSettings, saveSettings } from "./lib/settings"
```

- [ ] **Step 2: 添加 DELETE_HISTORY_RECORD 处理**

在 `background.ts` 的 switch 语句中添加：

```typescript
case "DELETE_HISTORY_RECORD": {
  await deleteHistoryRecord(message.recordId)
  sendResponse(createRuntimeSuccessResponse("DELETE_HISTORY_RECORD", {}))
  return
}
```

- [ ] **Step 3: 添加 RETRY_FAILED_ITEMS 处理**

在 switch 语句中添加：

```typescript
case "RETRY_FAILED_ITEMS": {
  try {
    const result = await retryFailedItems(
      { recordId: message.recordId, itemIds: message.itemIds },
      {
        getSettings,
        getHistoryRecord,
        updateHistoryRecord,
        loginQb,
        addUrlsToQb
      }
    )
    sendResponse(
      createRuntimeSuccessResponse("RETRY_FAILED_ITEMS", {
        successCount: result.successCount,
        failedCount: result.failedCount
      })
    )
  } catch (error) {
    sendResponse(createRuntimeErrorResponse(error instanceof Error ? error.message : String(error)))
  }
  return
}
```

- [ ] **Step 4: 更新 lib/background/index.ts 导出**

添加 `retryFailedItems` 导出：

```typescript
export { createBatchDownloadManager, testQbConnection } from "./manager"
export { retryFailedItems } from "./retry"
```

- [ ] **Step 5: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add background.ts lib/background/index.ts
git commit -m "feat(background): handle DELETE_HISTORY_RECORD and RETRY_FAILED_ITEMS messages"
```

---

## Task 8: 创建 AlertDialog 组件

**Files:**
- Create: `components/options/ui/alert-dialog.tsx`

- [ ] **Step 1: 安装 Radix UI AlertDialog**

Run: `pnpm add @radix-ui/react-alert-dialog`

- [ ] **Step 2: 创建 AlertDialog 组件**

创建 `components/options/ui/alert-dialog.tsx`：

```typescript
import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import { cn } from "../../../lib/shared/cn"

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-zinc-200 bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg",
        className
      )}
      {...props}
    />
  </AlertDialogPortal>
))
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-zinc-900", className)}
    {...props}
  />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-zinc-600", className)}
    {...props}
  />
))
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50",
      "border-red-600 bg-red-600 text-white hover:bg-red-700",
      className
    )}
    {...props}
  />
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-transparent px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel
}
```

- [ ] **Step 3: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/options/ui/alert-dialog.tsx package.json pnpm-lock.yaml
git commit -m "feat(ui): add AlertDialog component"
```

---

## Task 9: 创建 ConfirmationDialog 组件

**Files:**
- Create: `components/options/ui/confirmation-dialog.tsx`

- [ ] **Step 1: 创建 ConfirmationDialog 组件**

创建 `components/options/ui/confirmation-dialog.tsx`：

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle
} from "./alert-dialog"

type ConfirmationDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  onConfirm,
  onCancel,
  loading = false
}: ConfirmationDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        <div className="flex justify-end gap-2 mt-4">
          <AlertDialogCancel onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={loading}>
            {loading ? "处理中..." : confirmLabel}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 2: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/options/ui/confirmation-dialog.tsx
git commit -m "feat(ui): add ConfirmationDialog component"
```

---

## Task 10: 创建 DeleteRecordButton 组件

**Files:**
- Create: `components/options/pages/history/DeleteRecordButton.tsx`

- [ ] **Step 1: 创建 DeleteRecordButton 组件**

创建 `components/options/pages/history/DeleteRecordButton.tsx`：

```typescript
import { useState } from "react"
import { Button } from "../../../ui/button"
import { ConfirmationDialog } from "../../../ui/confirmation-dialog"
import { HiOutlineTrash } from "react-icons/hi2"
import { sendRuntimeRequest } from "../../../../lib/shared/messages"

type DeleteRecordButtonProps = {
  recordId: string
  recordName: string
  onDeleted: () => void
  variant?: "icon" | "button"
}

export function DeleteRecordButton({
  recordId,
  recordName,
  onDeleted,
  variant = "icon"
}: DeleteRecordButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      const response = await sendRuntimeRequest({
        type: "DELETE_HISTORY_RECORD",
        recordId
      })
      if (response.ok) {
        onDeleted()
      } else {
        console.error("Failed to delete record:", response.error)
      }
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      {variant === "icon" ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConfirm(true)}
          className="text-zinc-400 hover:text-red-600"
          title="删除记录"
        >
          <HiOutlineTrash className="w-4 h-4" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirm(true)}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          <HiOutlineTrash className="w-4 h-4 mr-1" />
          删除记录
        </Button>
      )}

      <ConfirmationDialog
        open={showConfirm}
        title="删除历史记录"
        description={`确定删除"${recordName}"吗？此操作不可恢复。`}
        confirmLabel="删除"
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
        loading={loading}
      />
    </>
  )
}
```

- [ ] **Step 2: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/options/pages/history/DeleteRecordButton.tsx
git commit -m "feat(history): add DeleteRecordButton component"
```

---

## Task 11: 创建 ClearHistoryButton 组件

**Files:**
- Create: `components/options/pages/history/ClearHistoryButton.tsx`

- [ ] **Step 1: 创建 ClearHistoryButton 组件**

创建 `components/options/pages/history/ClearHistoryButton.tsx`：

```typescript
import { useState } from "react"
import { Button } from "../../../ui/button"
import { ConfirmationDialog } from "../../../ui/confirmation-dialog"
import { HiOutlineTrash } from "react-icons/hi2"
import { sendRuntimeRequest } from "../../../../lib/shared/messages"

type ClearHistoryButtonProps = {
  onCleared: () => void
  disabled?: boolean
}

export function ClearHistoryButton({ onCleared, disabled = false }: ClearHistoryButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleClear = async () => {
    setLoading(true)
    try {
      const response = await sendRuntimeRequest({
        type: "CLEAR_HISTORY"
      })
      if (response.ok) {
        onCleared()
      } else {
        console.error("Failed to clear history:", response.error)
      }
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirm(true)}
        disabled={disabled}
        className="text-red-600 border-red-300 hover:bg-red-50"
      >
        <HiOutlineTrash className="w-4 h-4 mr-1" />
        清空历史
      </Button>

      <ConfirmationDialog
        open={showConfirm}
        title="清空全部历史"
        description="确定清空所有历史记录吗？此操作不可恢复。"
        confirmLabel="清空全部"
        onConfirm={handleClear}
        onCancel={() => setShowConfirm(false)}
        loading={loading}
      />
    </>
  )
}
```

- [ ] **Step 2: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/options/pages/history/ClearHistoryButton.tsx
git commit -m "feat(history): add ClearHistoryButton component"
```

---

## Task 12: 创建 RetryAllButton 组件

**Files:**
- Create: `components/options/pages/history/RetryAllButton.tsx`

- [ ] **Step 1: 创建 RetryAllButton 组件**

创建 `components/options/pages/history/RetryAllButton.tsx`：

```typescript
import { useState } from "react"
import { Button } from "../../../ui/button"
import { ConfirmationDialog } from "../../../ui/confirmation-dialog"
import { HiOutlineRefresh } from "react-icons/hi2"
import { sendRuntimeRequest } from "../../../../lib/shared/messages"
import type { TaskHistoryRecord } from "../../../../lib/history/types"

type RetryAllButtonProps = {
  record: TaskHistoryRecord
  onRetryComplete: (successCount: number, failedCount: number) => void
}

export function RetryAllButton({ record, onRetryComplete }: RetryAllButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const failedCount = record.items.filter(i => i.status === "failed").length

  if (failedCount === 0) {
    return null
  }

  const handleRetry = async () => {
    setLoading(true)
    try {
      const response = await sendRuntimeRequest({
        type: "RETRY_FAILED_ITEMS",
        recordId: record.id
      })
      if (response.ok) {
        onRetryComplete(response.successCount, response.failedCount)
      } else {
        console.error("Retry failed:", response.error)
        onRetryComplete(0, failedCount)
      }
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
      >
        <HiOutlineRefresh className="w-4 h-4 mr-1" />
        重试全部失败项
      </Button>

      <ConfirmationDialog
        open={showConfirm}
        title="重试失败条目"
        description={`确定重试 ${failedCount} 个失败条目吗？`}
        confirmLabel="重试"
        onConfirm={handleRetry}
        onCancel={() => setShowConfirm(false)}
        loading={loading}
      />
    </>
  )
}
```

- [ ] **Step 2: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/options/pages/history/RetryAllButton.tsx
git commit -m "feat(history): add RetryAllButton component"
```

---

## Task 13: 创建 RetryItemButton 组件

**Files:**
- Create: `components/options/pages/history/RetryItemButton.tsx`

- [ ] **Step 1: 创建 RetryItemButton 组件**

创建 `components/options/pages/history/RetryItemButton.tsx`：

```typescript
import { useState } from "react"
import { Button } from "../../../ui/button"
import { HiOutlineRefresh } from "react-icons/hi2"
import { sendRuntimeRequest } from "../../../../lib/shared/messages"
import type { TaskHistoryItem, TaskHistoryRecord } from "../../../../lib/history/types"

type RetryItemButtonProps = {
  record: TaskHistoryRecord
  item: TaskHistoryItem
  onRetryComplete: (success: boolean) => void
}

export function RetryItemButton({ record, item, onRetryComplete }: RetryItemButtonProps) {
  const [loading, setLoading] = useState(false)

  if (item.status !== "failed") {
    return null
  }

  const handleRetry = async () => {
    setLoading(true)
    try {
      const response = await sendRuntimeRequest({
        type: "RETRY_FAILED_ITEMS",
        recordId: record.id,
        itemIds: [item.id]
      })
      if (response.ok) {
        onRetryComplete(response.successCount > 0)
      } else {
        console.error("Retry failed:", response.error)
        onRetryComplete(false)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRetry}
      disabled={loading}
      title="重试此条目"
    >
      {loading ? (
        <span className="text-xs">重试中...</span>
      ) : (
        <>
          <HiOutlineRefresh className="w-4 h-4 mr-1" />
          重试
        </>
      )}
    </Button>
  )
}
```

- [ ] **Step 2: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/options/pages/history/RetryItemButton.tsx
git commit -m "feat(history): add RetryItemButton component"
```

---

## Task 14: 集成到 HistoryListView

**Files:**
- Modify: `components/options/pages/history/HistoryListView.tsx`

- [ ] **Step 1: 导入新组件**

在文件顶部添加导入：

```typescript
import { DeleteRecordButton } from "./DeleteRecordButton"
import { ClearHistoryButton } from "./ClearHistoryButton"
```

- [ ] **Step 2: 添加清空历史按钮**

修改组件 props 类型：

```typescript
type HistoryListViewProps = {
  records: TaskHistoryRecord[]
  onViewDetail: (recordId: string) => void
  onRefresh: () => void
}
```

在列表顶部添加清空按钮：

```typescript
export function HistoryListView({ records, onViewDetail, onRefresh }: HistoryListViewProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
        <HiOutlineClock className="w-10 h-10 mb-3 opacity-50" />
        <p className="text-sm">暂无下载历史记录</p>
        <p className="text-xs mt-1 text-zinc-400">开始批量下载后，历史记录将在此显示</p>
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      <div className="flex justify-end mb-2">
        <ClearHistoryButton onCleared={onRefresh} disabled={records.length === 0} />
      </div>
      {records.map((record, index) => {
        // ...existing record rendering
      })}
    </div>
  )
}
```

- [ ] **Step 3: 在每行添加删除按钮**

在每行的末尾操作区域添加删除按钮：

```typescript
<div className="col-span-1 flex justify-end gap-1">
  <Button
    variant="ghost"
    size="sm"
    onClick={() => onViewDetail(record.id)}
    className="text-xs"
  >
    详情
  </Button>
  <DeleteRecordButton
    recordId={record.id}
    recordName={record.name}
    onDeleted={onRefresh}
    variant="icon"
  />
</div>
```

- [ ] **Step 4: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/options/pages/history/HistoryListView.tsx
git commit -m "feat(history): integrate delete and clear buttons into HistoryListView"
```

---

## Task 15: 集成到 HistoryDetailView

**Files:**
- Modify: `components/options/pages/history/HistoryDetailView.tsx`

- [ ] **Step 1: 导入新组件**

添加导入：

```typescript
import { useState } from "react"
import { DeleteRecordButton } from "./DeleteRecordButton"
import { RetryAllButton } from "./RetryAllButton"
import { RetryItemButton } from "./RetryItemButton"
```

- [ ] **Step 2: 更新 props 类型**

```typescript
type HistoryDetailViewProps = {
  record: TaskHistoryRecord
  onBack: () => void
  onRecordChanged: () => void
}
```

- [ ] **Step 3: 添加状态管理**

在组件顶部添加：

```typescript
export function HistoryDetailView({ record, onBack, onRecordChanged }: HistoryDetailViewProps) {
  const [currentRecord, setCurrentRecord] = useState(record)
  const siteMeta = SITE_CONFIG_META[currentRecord.sourceId]
  const failures = aggregateFailures(currentRecord.items)
  const hasFailures = currentRecord.stats.failed > 0

  const handleRetryComplete = (successCount: number, failedCount: number) => {
    onRecordChanged()
  }
```

- [ ] **Step 4: 在标题栏添加删除按钮**

修改标题区域：

```typescript
<div className="flex items-center gap-3">
  <Button variant="ghost" size="sm" onClick={onBack}>
    <HiOutlineArrowLeft className="w-4 h-4" />
    返回
  </Button>
  <span className="text-lg font-medium text-zinc-900 truncate min-w-0">{currentRecord.name}</span>
  <StatusBadge status={currentRecord.status} />
  <div className="flex items-center gap-1.5 text-sm text-zinc-500 ml-auto">
    <HiOutlineGlobeAlt className="w-4 h-4" />
    <span>{siteMeta?.displayName ?? currentRecord.sourceId}</span>
  </div>
  <DeleteRecordButton
    recordId={currentRecord.id}
    recordName={currentRecord.name}
    onDeleted={onBack}
    variant="button"
  />
</div>
```

- [ ] **Step 5: 替换失败原因卡片中的重试按钮**

将现有的禁用按钮替换为 `RetryAllButton`：

```typescript
{hasFailures && (
  <Card>
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2">
        <HiOutlineExclamationTriangle className="w-4 h-4 text-red-500" />
        失败原因汇总
      </CardTitle>
    </CardHeader>
    <CardContent className="grid gap-3">
      {Array.from(failures.values()).map(({ count, reason }) => {
        const explanation = getFailureExplanation(reason)
        return (
          <div key={reason} className="grid gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-900">{explanation.label}</span>
              <span className="text-xs text-zinc-500">{count} 条</span>
            </div>
            <div className="text-xs text-zinc-600">{explanation.desc}</div>
            <div className="text-xs text-zinc-500">{explanation.suggestion}</div>
          </div>
        )
      })}
      <RetryAllButton record={currentRecord} onRetryComplete={handleRetryComplete} />
    </CardContent>
  </Card>
)}
```

- [ ] **Step 6: 替换条目行中的重试按钮**

在条目详情区域，将禁用的重试按钮替换为 `RetryItemButton`：

```typescript
<div className="col-span-3 flex justify-end">
  {currentItem.status === "failed" && (
    <RetryItemButton
      record={currentRecord}
      item={currentItem}
      onRetryComplete={(success) => {
        onRecordChanged()
      }}
    />
  )}
</div>
```

- [ ] **Step 7: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add components/options/pages/history/HistoryDetailView.tsx
git commit -m "feat(history): integrate retry and delete buttons into HistoryDetailView"
```

---

## Task 16: 更新 HistoryPage 传递回调

**Files:**
- Modify: `components/options/pages/history/HistoryPage.tsx`

- [ ] **Step 1: 查看当前 HistoryPage 实现**

读取 `components/options/pages/history/HistoryPage.tsx` 了解当前结构。

- [ ] **Step 2: 更新 HistoryListView 调用**

确保 `HistoryListView` 接收 `onRefresh` 回调：

```typescript
<HistoryListView
  records={records}
  onViewDetail={handleViewDetail}
  onRefresh={loadRecords}
/>
```

- [ ] **Step 3: 更新 HistoryDetailView 调用**

确保 `HistoryDetailView` 接收 `onRecordChanged` 回调：

```typescript
<HistoryDetailView
  record={selectedRecord}
  onBack={handleBack}
  onRecordChanged={loadRecords}
/>
```

- [ ] **Step 4: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/options/pages/history/HistoryPage.tsx
git commit -m "feat(history): pass callbacks for retry and delete refresh"
```

---

## Task 17: 运行完整测试套件

**Files:**
- All modified files

- [ ] **Step 1: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 2: 运行单元测试**

Run: `pnpm test`
Expected: PASS（所有测试通过）

- [ ] **Step 3: 运行 E2E 测试**

Run: `pnpm test:e2e`
Expected: PASS

- [ ] **Step 4: 运行完整测试**

Run: `pnpm test:all`
Expected: PASS

---

## Task 18: 更新 AGENTS.md

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: 更新模块说明**

在 `## Source Of Truth Files` 部分添加新模块：

```markdown
- `lib/background/retry.ts`
  重试失败条目的编排逻辑，从历史记录提取失败条目并重新提交到 qBittorrent。
- `lib/history/delete.ts`
  删除历史记录的存储操作，支持单条删除。
- `components/options/pages/history/RetryAllButton.tsx`
  详情页"重试全部失败项"按钮组件，弹出确认对话框后执行批量重试。
- `components/options/pages/history/RetryItemButton.tsx`
  详情页单条目重试按钮组件，直接执行单条重试。
- `components/options/pages/history/DeleteRecordButton.tsx`
  删除单条历史记录按钮组件，支持图标和按钮两种变体。
- `components/options/pages/history/ClearHistoryButton.tsx`
  清空全部历史按钮组件，弹出确认对话框后执行清空。
```

- [ ] **Step 2: 更新 Runtime 消息说明**

在消息类型部分添加：

```markdown
- `RETRY_FAILED_ITEMS`: 重试指定历史记录的失败条目
- `DELETE_HISTORY_RECORD`: 删除单条历史记录
```

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: update AGENTS.md for retry and delete features"
```

---

## Task 19: 最终集成提交

- [ ] **Step 1: 查看所有变更**

Run: `git status`

- [ ] **Step 2: 查看提交历史**

Run: `git log --oneline -20`

- [ ] **Step 3: 确认所有测试通过**

Run: `pnpm test:all`
Expected: PASS

---

## Self-Review Checklist

- [x] Spec coverage: 每个设计需求都有对应任务
- [x] Placeholder scan: 无 TBD、TODO 或模糊描述
- [x] Type consistency: 所有类型定义在 Task 1-2 中建立，后续任务使用一致