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
})
