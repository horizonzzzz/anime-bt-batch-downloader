import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { BatchPanel } from "../../components/batch-panel"

describe("BatchPanel", () => {
  it("shows the selected count and disables download with no items", () => {
    render(
      <BatchPanel
        selectedCount={0}
        running={false}
        progressText="等待操作"
        statusText="就绪。先在当前列表页勾选帖子。"
        logs={[]}
        onSelectAll={vi.fn()}
        onClear={vi.fn()}
        onDownload={vi.fn()}
        onOpenSettings={vi.fn()}
      />
    )

    expect(screen.getByText("已选 0 项")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "批量下载" })).toBeDisabled()
  })

  it("wires button callbacks when items are selected", async () => {
    const user = userEvent.setup()
    const onDownload = vi.fn()

    render(
      <BatchPanel
        selectedCount={3}
        running={false}
        progressText="总数 3 | 已处理 0 | 已提取 0 | 已提交 0 | 重复 0 | 失败 0"
        statusText="准备中"
        logs={[]}
        onSelectAll={vi.fn()}
        onClear={vi.fn()}
        onDownload={onDownload}
        onOpenSettings={vi.fn()}
      />
    )

    await user.click(screen.getByRole("button", { name: "批量下载" }))

    expect(onDownload).toHaveBeenCalledTimes(1)
  })
})
