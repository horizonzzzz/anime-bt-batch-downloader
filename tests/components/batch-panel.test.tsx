import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { BatchPanel } from "../../components/batch-panel"

function renderBatchPanel(overrides: Record<string, unknown> = {}) {
  const props = {
    selectedCount: 0,
    running: false,
    progressText: "等待操作",
    statusText: "就绪。先在当前列表页勾选帖子。",
    savePath: "",
    logs: [],
    onSelectAll: vi.fn(),
    onClear: vi.fn(),
    onSavePathChange: vi.fn(),
    onClearSavePath: vi.fn(),
    onDownload: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides
  } as any

  return render(<BatchPanel {...props} />)
}

describe("BatchPanel", () => {
  it("shows the selected count and disables download with no items", () => {
    renderBatchPanel()

    expect(screen.getByText("已选 0 项")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "批量下载" })).toBeDisabled()
    expect(screen.getByLabelText("下载路径")).toHaveValue("")
    expect(screen.queryByRole("button", { name: "选择目录" })).not.toBeInTheDocument()
  })

  it("wires button callbacks when items are selected", async () => {
    const user = userEvent.setup()
    const onDownload = vi.fn()

    renderBatchPanel({
      selectedCount: 3,
      progressText: "总数 3 | 已处理 0 | 已提取 0 | 已提交 0 | 重复 0 | 失败 0",
      statusText: "准备中",
      savePath: "D:\\Downloads\\Anime",
      onDownload
    })

    await user.click(screen.getByRole("button", { name: "批量下载" }))

    expect(onDownload).toHaveBeenCalledTimes(1)
  })

  it("renders a recent results section and opens settings from the secondary action", async () => {
    const user = userEvent.setup()
    const onOpenSettings = vi.fn()

    renderBatchPanel({
      selectedCount: 2,
      progressText: "总数 2 | 已处理 1 | 已提取 1 | 已提交 1 | 重复 0 | 失败 0",
      statusText: "最近一项已成功提交。",
      logs: [
        {
          title: "示例资源",
          detailUrl: "https://www.kisssub.org/show-1.html",
          status: "submitted",
          message: "已提交到 qBittorrent。"
        }
      ],
      onOpenSettings
    })

    expect(screen.getByText("最近结果")).toBeInTheDocument()
    expect(screen.getByText("示例资源")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "设置" }))

    expect(onOpenSettings).toHaveBeenCalledTimes(1)
  })

  it("allows editing and clearing the batch save path without a picker action", async () => {
    const user = userEvent.setup()
    const onClearSavePath = vi.fn()

    function Harness() {
      const [savePath, setSavePath] = useState("D:\\Downloads")

      return (
        <BatchPanel
          {...({
            selectedCount: 1,
            running: false,
            progressText: "等待操作",
            statusText: "就绪。",
            savePath,
            logs: [],
            onSelectAll: vi.fn(),
            onClear: vi.fn(),
            onSavePathChange: setSavePath,
            onClearSavePath: () => {
              setSavePath("")
              onClearSavePath()
            },
            onDownload: vi.fn(),
            onOpenSettings: vi.fn()
          } as any)}
        />
      )
    }

    render(<Harness />)

    const input = screen.getByLabelText("下载路径")

    await user.clear(input)
    await user.type(input, "E:\\BT")
    await user.click(screen.getByRole("button", { name: "清空路径" }))

    expect(input).toHaveValue("")
    expect(screen.queryByRole("button", { name: "选择目录" })).not.toBeInTheDocument()
    expect(onClearSavePath).toHaveBeenCalledTimes(1)
  })
})
