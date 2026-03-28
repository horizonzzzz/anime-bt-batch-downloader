import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

function readContentStyles() {
  return readFileSync(resolve(process.cwd(), "styles/content.css"), "utf8")
}

describe("content styles", () => {
  it("opts into Tailwind components and utilities without importing Tailwind base", () => {
    const css = readContentStyles()

    expect(css).toContain("@tailwind components;")
    expect(css).toContain("@tailwind utilities;")
    expect(css).not.toContain("@tailwind base;")
  })

  it("uses low-specificity control resets so component styles can win", () => {
    const css = readContentStyles()

    expect(css).toContain(".anime-bt-content-root :where(button) {")
    expect(css).toContain('.anime-bt-content-root :where(input:not([type="checkbox"])) {')
  })

  it("defines contents-specific px tokens for panel and control sizing", () => {
    const css = readContentStyles()

    expect(css).toContain("--anime-bt-panel-width: 336px;")
    expect(css).toContain("--anime-bt-control-height: 42px;")
    expect(css).toContain("--anime-bt-checkbox-pill-height: 24px;")
  })

  it("initializes Tailwind transform variables inside the contents root", () => {
    const css = readContentStyles()

    expect(css).toContain("--tw-translate-x: 0;")
    expect(css).toContain("--tw-translate-y: 0;")
    expect(css).toContain("--tw-rotate: 0;")
    expect(css).toContain("--tw-skew-x: 0;")
    expect(css).toContain("--tw-skew-y: 0;")
    expect(css).toContain("--tw-scale-x: 1;")
    expect(css).toContain("--tw-scale-y: 1;")
  })

  it("keeps content.css limited to the root-scoped entry layer", () => {
    const css = readContentStyles()

    expect(css).toContain(".anime-bt-content-root {")
    expect(css).toContain("@media (max-width: 680px) {")
    expect(css).not.toContain(".anime-bt-batch-panel")
    expect(css).not.toContain(".anime-bt-batch-panel__")
    expect(css).not.toContain(".anime-bt-selection-checkbox")
    expect(css).not.toContain(".anime-bt-selection-checkbox__")
  })
})
