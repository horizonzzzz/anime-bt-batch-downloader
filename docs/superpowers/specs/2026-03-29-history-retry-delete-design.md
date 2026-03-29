# 历史记录重试与删除功能设计

## 目标

为已完成的任务历史页面添加两个功能：
1. **重试失败条目**：允许用户直接从 Options 页面重新提交失败的下载条目到 qBittorrent
2. **删除历史记录**：支持删除单条记录和清空全部历史

## 设计决策摘要

| 决策项 | 选择 |
|--------|------|
| 重试触发方式 | 直接在 Options 页面触发，无需返回源站 |
| 重试数据来源 | 直接使用已保存的 magnet/torrent URL |
| 删除范围 | 单条删除 + 清空全部 |
| 删除确认机制 | 两者都需要二次确认 |
| 重试条目限制 | 所有失败条目都可重试 |
| 实现方案 | 复用现有 BatchManager 逻辑 |

## 架构概览

### 新增模块

| 模块 | 位置 | 职责 |
|------|------|------|
| `retry.ts` | `lib/background/retry.ts` | 重试失败条目的编排逻辑 |
| `delete.ts` | `lib/history/delete.ts` | 删除历史记录的存储操作 |
| `RetryAllButton` | `components/options/pages/history/` | 详情页"重试全部失败项"按钮 |
| `RetryItemButton` | `components/options/pages/history/` | 详情页单条目重试按钮 |
| `DeleteConfirmDialog` | `components/options/ui/` | 删除确认对话框组件 |
| `ClearHistoryButton` | `components/options/pages/history/` | 列表页"清空全部"按钮 |
| `DeleteRecordButton` | `components/options/pages/history/` | 列表页/详情页删除按钮 |

### Runtime 消息扩展

新增消息类型到 `lib/shared/messages.ts`：

```typescript
type RuntimeRequest =
  | { type: "RETRY_FAILED_ITEMS"; recordId: string; itemIds?: string[] }
  | { type: "DELETE_HISTORY_RECORD"; recordId: string }
  // ...existing types
```

响应类型：

```typescript
type RetryFailedItemsSuccessResponse = {
  ok: true
  successCount: number
  failedCount: number
}

type DeleteHistoryRecordSuccessResponse = {
  ok: true
}
```

### 数据流

**重试流程：**
1. Options 页面发送 `RETRY_FAILED_ITEMS`
2. Background 调用 `retry.ts`，从历史记录获取失败条目
3. 复用 `loginQb` + `addUrlsToQb` 提交到 qBittorrent
4. 更新历史记录状态和重试计数
5. 返回重试结果，Options 页面刷新视图

**删除流程：**
1. Options 页面弹出确认对话框
2. 用户确认后发送 `DELETE_HISTORY_RECORD` 或 `CLEAR_HISTORY`
3. Background 调用 `delete.ts` 更新 storage
4. 返回成功，Options 页面刷新列表

## 重试功能详细设计

### `lib/background/retry.ts`

```typescript
type RetryRequest = {
  recordId: string
  itemIds?: string[]  // 可选，默认重试所有失败条目
}

type RetryResult = {
  successCount: number      // 成功条目数（成功提交到 qBittorrent）
  failedCount: number       // 失败条目数（无有效链接 + 提交失败）
  updatedRecord: TaskHistoryRecord  // 更新后的完整历史记录
}

export async function retryFailedItems(
  request: RetryRequest,
  deps: RetryDependencies
): Promise<RetryResult>

type RetryDependencies = {
  getSettings: () => Promise<Settings>
  getHistoryRecord: (recordId: string) => Promise<TaskHistoryRecord | null>
  updateHistoryRecord: (record: TaskHistoryRecord) => Promise<void>
  loginQb: (settings: Settings) => Promise<void>
  addUrlsToQb: (settings: Settings, urls: string[], savePath?: string) => Promise<void>
}
```

### 重试逻辑步骤

1. **获取历史记录**：从 storage 读取指定 `recordId`
2. **筛选失败条目**：
   - 如果 `itemIds` 指定，只重试这些条目
   - 否则重试所有 `status === "failed"` 的条目
3. **提取可用链接**：
   - 每个条目优先使用 `magnetUrl`，其次 `torrentUrl`
   - 无有效链接的条目标记为失败（不参与提交），`failure.message = "无可用的 magnet 或 torrent 链接"`
4. **提交到 qBittorrent**：
   - 登录 qBittorrent（使用当前保存的设置）
   - 仅提交有有效链接的条目，调用 `addUrlsToQb` 批量提交（单次请求提交所有 URL），使用 `record.savePath`（如果存在）
   - 注意：`addUrlsToQb` 为单次批量请求，若 HTTP 失败则本次重试的所有条目均标记为失败
5. **更新历史记录**：
   - 成功条目：`status` 改为 `success`，清除 `failure`
   - 失败条目（无链接）：保持失败，更新 `failure.retryCount++`、`failure.lastRetryAt`、`failure.message`
   - 失败条目（提交失败）：保持失败，更新 `failure.retryCount++`、`failure.lastRetryAt`、`failure.message`
   - 重新计算 `record.stats`（success、failed 数量）
   - 如果 `stats.failed === 0`，`record.status` 改为 `completed`
6. **保存并返回**：写入 storage，返回结果

### UI 组件

**`RetryAllButton`**（详情页）：
- 位置：在"失败原因汇总"卡片底部，替代现有的禁用按钮
- 点击后弹出确认对话框：标题"重试失败条目"，描述"确定重试 X 个失败条目吗？"
- 确认后发送 `RETRY_FAILED_ITEMS`（不传 `itemIds`）
- 重试过程中按钮显示 loading 状态
- 完成后刷新详情视图，显示成功/失败数量 toast

**`RetryItemButton`**（详情页条目行）：
- 位置：仅显示在 `status === "failed"` 的条目行末尾
- 点击直接重试（无需确认对话框）
- 发送 `RETRY_FAILED_ITEMS`，`itemIds` 为该条目 ID
- 重试过程中按钮显示 loading 状态
- 完成后更新该条目的状态显示

## 删除功能详细设计

### `lib/history/storage.ts` 新增函数

```typescript
// 获取单条历史记录
export async function getHistoryRecord(recordId: string): Promise<TaskHistoryRecord | null> {
  const records = await getHistoryRecords()
  return records.find(r => r.id === recordId) ?? null
}

// 更新单条历史记录（替换同 ID 的记录）
export async function updateHistoryRecord(record: TaskHistoryRecord): Promise<void> {
  const storage = await getHistoryStorage()
  const updatedRecords = storage.records.map(r => r.id === record.id ? record : r)
  await chrome.storage.local.set({
    [HISTORY_STORAGE_KEY]: { ...storage, records: updatedRecords }
  })
}
```

### `lib/history/delete.ts`

```typescript
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

// clearHistory 已存在于 storage.ts，无需新增
```

### UI 组件

**`DeleteConfirmDialog`**：
- 基于 `AlertDialog` 组件（shadcn/ui 风格）
- Props: `open`, `title`, `description`, `confirmLabel`, `onConfirm`, `onCancel`
- 确认按钮使用红色强调样式（`variant="destructive"`）

**删除入口位置**：

| 位置 | 操作 | 入口组件 |
|------|------|----------|
| 列表页每行末尾 | 删除单条 | `DeleteRecordButton`（垃圾桶图标，hover 显示红色） |
| 列表页顶部 | 清空全部 | `ClearHistoryButton`（"清空历史"按钮，红色 outline） |
| 详情页标题栏 | 删除当前记录 | `DeleteRecordButton`（在返回按钮右侧） |

### 删除交互流程

**单条删除**：
1. 用户点击删除按钮（垃圾桶图标）
2. 弹出确认对话框：
   - 标题："删除历史记录"
   - 描述："确定删除该批次记录吗？此操作不可恢复。"
   - 确认按钮："删除"
3. 用户点击确认 → 发送 `DELETE_HISTORY_RECORD`
4. Background 执行删除，返回成功
5. 关闭对话框，刷新列表或返回列表页

**清空全部**：
1. 用户点击"清空历史"按钮
2. 弹出确认对话框：
   - 标题："清空全部历史"
   - 描述："确定清空所有历史记录吗？此操作不可恢复。"
   - 确认按钮："清空全部"
3. 用户点击确认 → 发送 `CLEAR_HISTORY`
4. Background 执行清空，返回成功
5. 关闭对话框，列表显示空状态

## 错误处理

### 重试错误处理

| 场景 | 处理方式 |
|------|----------|
| qBittorrent 登录失败 | 返回错误 `{ ok: false, error: "qBittorrent 登录失败: <message>" }`，不更新历史记录 |
| qBittorrent 提交失败 | 所有待重试条目保持失败状态，更新 `failure.retryCount` 和 `failure.lastRetryAt`，返回部分结果 |
| 条目无有效链接 | 该条目在结果中标记为失败，`failure.message = "无可用的 magnet 或 torrent 链接"`，不尝试提交 |
| 历史记录不存在 | 返回错误 `{ ok: false, error: "历史记录不存在" }` |
| 无失败条目 | 返回 `{ ok: true, successCount: 0, failedCount: 0 }` |

### 删除错误处理

| 场景 | 处理方式 |
|------|----------|
| 删除不存在的记录 | 返回错误 `{ ok: false, error: "记录不存在" }` |
| Storage 写入失败 | 返回错误 `{ ok: false, error: "存储写入失败" }` |

## 测试覆盖

### 单元测试

**`tests/unit/background/retry.test.ts`**：
- 重试成功场景：所有条目提交成功，状态更新正确，stats 重新计算
- 重试失败场景（qBittorrent 提交失败）：所有条目保持失败，retryCount 增加
- 无有效链接场景：条目标记为失败
- qBittorrent 登录失败场景：返回错误，历史记录不变
- 历史记录不存在场景：返回错误
- 重试计数更新场景：`retryCount` 和 `lastRetryAt` 正确更新

**`tests/unit/history/delete.test.ts`**：
- 删除单条记录场景：记录被移除
- 删除不存在记录场景：存储不变
- 清空全部场景：所有记录被移除

### 组件测试

**`tests/components/options/pages/history/RetryAllButton.test.tsx`**：
- 按钮渲染：显示正确的失败条目数量
- 确认对话框：点击后弹出，确认后发送消息
- Loading 状态：重试过程中按钮禁用且显示 spinner
- 结果显示：完成后显示成功/失败数量

**`tests/components/options/pages/history/RetryItemButton.test.tsx`**：
- 仅失败条目显示按钮
- 点击后直接发送消息（无确认对话框）
- Loading 状态
- 完成后状态更新

**`tests/components/options/ui/DeleteConfirmDialog.test.tsx`**：
- 对话框渲染：标题、描述、按钮
- 确认按钮点击：调用 `onConfirm`
- 取消按钮点击：调用 `onCancel`

### E2E 测试

**`tests/e2e/options-history.test.ts`**：
- 重试全部失败条目流程
- 重试单条失败条目流程
- 删除单条记录流程
- 清空全部历史流程