import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

type PackageJson = {
  displayName?: string
  manifest?: {
    name?: string
  }
}

function readPackageJson(): PackageJson {
  const packageJsonPath = resolve(process.cwd(), "package.json")
  return JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJson
}

describe("package metadata", () => {
  it("defines a displayName for generated extension pages", () => {
    const packageJson = readPackageJson()

    expect(packageJson.displayName).toBeTruthy()
    expect(packageJson.displayName).toBe(packageJson.manifest?.name)
  })
})
