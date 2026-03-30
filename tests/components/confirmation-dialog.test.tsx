import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ConfirmationDialog } from "../../components/options/ui/confirmation-dialog"

describe("ConfirmationDialog", () => {
  const defaultProps = {
    open: true,
    title: "确认操作",
    description: "确定要执行此操作吗？",
    confirmLabel: "确认",
    cancelLabel: "取消",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    loading: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders title and description", () => {
    render(<ConfirmationDialog {...defaultProps} />)
    
    expect(screen.getByText("确认操作")).toBeInTheDocument()
    expect(screen.getByText("确定要执行此操作吗？")).toBeInTheDocument()
  })

  it("renders default button labels when not provided", () => {
    render(
      <ConfirmationDialog
        open={true}
        title="Test"
        description="Test description"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    
    expect(screen.getByRole("button", { name: "确认" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument()
  })

  it("renders custom button labels", () => {
    render(
      <ConfirmationDialog
        {...defaultProps}
        confirmLabel="删除"
        cancelLabel="放弃"
      />
    )
    
    expect(screen.getByRole("button", { name: "删除" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "放弃" })).toBeInTheDocument()
  })

  it("calls onConfirm when confirm button clicked", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    
    render(<ConfirmationDialog {...defaultProps} onConfirm={onConfirm} />)
    
    await user.click(screen.getByRole("button", { name: "确认" }))
    
    expect(onConfirm).toHaveBeenCalled()
  })

  it("calls onCancel when cancel button clicked", async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    
    render(<ConfirmationDialog {...defaultProps} onCancel={onCancel} />)
    
    await user.click(screen.getByRole("button", { name: "取消" }))
    
    expect(onCancel).toHaveBeenCalled()
  })

  it("shows loading state on confirm button", () => {
    render(<ConfirmationDialog {...defaultProps} loading={true} />)
    
    expect(screen.getByRole("button", { name: "处理中..." })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "取消" })).toBeDisabled()
  })

  it("disables buttons when loading", () => {
    render(<ConfirmationDialog {...defaultProps} loading={true} />)
    
    expect(screen.getByRole("button", { name: "处理中..." })).toBeDisabled()
    expect(screen.getByRole("button", { name: "取消" })).toBeDisabled()
  })

  it("does not render content when closed", () => {
    render(<ConfirmationDialog {...defaultProps} open={false} />)
    
    expect(screen.queryByText("确认操作")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "确认" })).not.toBeInTheDocument()
  })

  it("prevents multiple confirm clicks during loading", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    
    render(<ConfirmationDialog {...defaultProps} onConfirm={onConfirm} loading={true} />)
    
    const confirmButton = screen.getByRole("button", { name: "处理中..." })
    expect(confirmButton).toBeDisabled()
    
    await user.click(confirmButton)
    await user.click(confirmButton)
    
    expect(onConfirm).not.toHaveBeenCalled()
  })
})