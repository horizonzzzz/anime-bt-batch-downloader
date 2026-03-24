import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SelectionCheckbox } from "../../components/selection-checkbox"

describe("SelectionCheckbox", () => {
  it("exposes an explicit accessible name and reports checked state changes", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<SelectionCheckbox checked={false} onChange={onChange} />)

    const checkbox = screen.getByRole("checkbox", { name: "选择这条帖子进行批量下载" })
    await user.click(checkbox)

    expect(onChange).toHaveBeenCalledWith(true)
  })

  it("does not bubble pointer or click events to a clickable parent row", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onClick = vi.fn()
    const onMouseDown = vi.fn()

    render(
      <div onClick={onClick} onMouseDown={onMouseDown}>
        <SelectionCheckbox checked={false} onChange={onChange} />
      </div>
    )

    await user.click(screen.getByText("批量"))

    expect(onChange).toHaveBeenCalledWith(true)
    expect(onClick).not.toHaveBeenCalled()
    expect(onMouseDown).not.toHaveBeenCalled()
  })
})
