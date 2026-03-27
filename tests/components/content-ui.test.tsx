import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ContentButton } from "../../components/content-ui/button"
import { ContentInput } from "../../components/content-ui/input"

describe("contents UI primitives", () => {
  it("renders a shadcn-style content button contract while preserving semantic hooks", () => {
    render(
      <ContentButton variant="primary" className="anime-bt-batch-panel__download">
        批量下载
      </ContentButton>
    )

    const button = screen.getByRole("button", { name: "批量下载" })

    expect(button).toHaveClass("anime-bt-batch-panel__download")
    expect(button).toHaveClass("inline-flex")
    expect(button).toHaveClass("items-center")
    expect(button).toHaveClass("min-h-[var(--anime-bt-control-height)]")
    expect(button).toHaveClass("rounded-[var(--anime-bt-radius-control)]")
  })

  it("renders a content input contract that keeps sizing and focus styling local to contents", () => {
    render(
      <ContentInput
        aria-label="临时下载路径"
        className="anime-bt-batch-panel__path-input"
        placeholder="留空使用默认目录"
      />
    )

    const input = screen.getByLabelText("临时下载路径")

    expect(input).toHaveClass("anime-bt-batch-panel__path-input")
    expect(input).toHaveClass("min-h-[var(--anime-bt-control-height)]")
    expect(input).toHaveClass("rounded-[var(--anime-bt-radius-control)]")
    expect(input).toHaveClass("focus-visible:ring-[3px]")
  })
})
