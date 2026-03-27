import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ContentButton } from "../../components/content-ui/button"
import { ContentCheckbox } from "../../components/content-ui/checkbox"
import { ContentInput } from "../../components/content-ui/input"

describe("contents UI primitives", () => {
  it("renders a shadcn-style content button contract through utilities", () => {
    render(
      <ContentButton variant="primary" data-anime-bt-role="footer-primary">
        批量下载
      </ContentButton>
    )

    const button = screen.getByRole("button", { name: "批量下载" })

    expect(button).toHaveAttribute("data-anime-bt-role", "footer-primary")
    expect(button).toHaveClass("inline-flex")
    expect(button).toHaveClass("items-center")
    expect(button).toHaveClass("min-h-[var(--anime-bt-control-height)]")
    expect(button).toHaveClass("rounded-[var(--anime-bt-radius-control)]")
  })

  it("renders a content input contract that keeps sizing and focus styling local to contents", () => {
    render(
      <ContentInput
        aria-label="临时下载路径"
        data-anime-bt-role="path-input"
        placeholder="留空使用默认目录"
      />
    )

    const input = screen.getByLabelText("临时下载路径")

    expect(input).toHaveAttribute("data-anime-bt-role", "path-input")
    expect(input).toHaveClass("min-h-[var(--anime-bt-control-height)]")
    expect(input).toHaveClass("rounded-[var(--anime-bt-radius-control)]")
    expect(input).toHaveClass("focus-visible:ring-[3px]")
  })

  it("renders a content checkbox pill with native checkbox appearance and data anchors", () => {
    render(
      <ContentCheckbox
        checked={true}
        label="批量"
        title="选择这条帖子进行批量下载"
        aria-label="选择这条帖子进行批量下载"
        onCheckedChange={() => {}}
      />
    )

    const checkbox = screen.getByRole("checkbox", { name: "选择这条帖子进行批量下载" })
    const pill = screen.getByTitle("选择这条帖子进行批量下载")
    const dot = pill.querySelector('[data-anime-bt-role="selection-dot"]')

    expect(pill).toHaveAttribute("data-anime-bt-role", "selection-pill")
    expect(pill).toHaveAttribute("data-state", "checked")
    expect(pill).toHaveClass("inline-flex")
    expect(pill).toHaveClass("min-h-[var(--anime-bt-checkbox-pill-height)]")
    expect(checkbox).toHaveAttribute("data-anime-bt-role", "selection-input")
    expect(checkbox).not.toHaveClass("appearance-none")
    expect(dot).toHaveAttribute("data-anime-bt-role", "selection-dot")
    expect(dot).toHaveClass("h-[6px]")
    expect(dot).toHaveClass("w-[6px]")
  })
})
