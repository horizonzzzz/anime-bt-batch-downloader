import { existsSync, readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

type PackageJson = {
  name?: string
  displayName?: string
  license?: string
  scripts?: Record<string, string>
  devDependencies?: Record<string, string>
  manifest?: Record<string, unknown>
}

function readPackageJson(): PackageJson {
  const packageJsonPath = resolve(process.cwd(), "package.json")
  return JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJson
}

function readGlobalTypes() {
  return readFileSync(resolve(process.cwd(), "global.d.ts"), "utf8")
}

function readText(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = resolve(directory, entry.name)

    if (entry.isDirectory()) {
      return listSourceFiles(fullPath)
    }

    return fullPath.match(/\.(ts|tsx)$/) ? [fullPath] : []
  })
}

describe("package metadata", () => {
  it("defines the Anime BT Batch brand through WXT metadata instead of package.json manifest fields", () => {
    const packageJson = readPackageJson()
    const wxtConfig = readText("wxt.config.ts")

    expect(packageJson.name).toBe("anime-bt-batch-downloader")
    expect(packageJson.displayName).toBe("Anime BT Batch")
    expect(packageJson.license).toBe("MIT")
    expect(packageJson.manifest).toBeUndefined()
    expect(packageJson.scripts?.dev).toBe("wxt")
    expect(packageJson.scripts?.build).toBe("wxt build")
    expect(packageJson.scripts?.package).toBe("wxt clean && wxt zip")
    expect(packageJson.devDependencies?.plasmo).toBeUndefined()
    expect(packageJson.devDependencies?.wxt).toBeTruthy()
    expect(wxtConfig).toContain("defineConfig")
    expect(wxtConfig).toContain("Anime BT Batch")
    expect(wxtConfig).toContain("popup.html")
    expect(wxtConfig).toContain("options.html")
    expect(wxtConfig).toContain("chrome-mv3-prod")
  })

  it("uses the WXT root command for development instead of the invalid 'wxt dev' form", () => {
    const packageJson = readPackageJson()

    expect(packageJson.scripts?.dev).toBe("wxt")
    expect(packageJson.scripts?.dev).not.toContain("wxt dev")
  })

  it("uses WXT entrypoints instead of root-level extension entry files", () => {
    expect(existsSync(resolve(process.cwd(), "wxt.config.ts"))).toBe(true)
    expect(existsSync(resolve(process.cwd(), "entrypoints", "background", "index.ts"))).toBe(true)
    expect(existsSync(resolve(process.cwd(), "entrypoints", "popup", "index.html"))).toBe(true)
    expect(existsSync(resolve(process.cwd(), "entrypoints", "options", "index.html"))).toBe(true)
    expect(
      existsSync(resolve(process.cwd(), "entrypoints", "source-batch.content", "index.tsx"))
    ).toBe(true)

    expect(existsSync(resolve(process.cwd(), "background.ts"))).toBe(false)
    expect(existsSync(resolve(process.cwd(), "popup.tsx"))).toBe(false)
    expect(existsSync(resolve(process.cwd(), "options.tsx"))).toBe(false)
  })

  it("keeps lucide-react imports scoped to shadcn ui primitives", () => {
    const sourceRoots = [
      resolve(process.cwd(), "components"),
      resolve(process.cwd(), "contents"),
      resolve(process.cwd(), "entrypoints"),
      resolve(process.cwd(), "lib")
    ]
    const allowedUiDir = resolve(process.cwd(), "components", "ui")
    const filesToCheck = sourceRoots
      .filter((root) => existsSync(root))
      .flatMap((root) => listSourceFiles(root))
      .filter((filePath) => !filePath.startsWith(`${allowedUiDir}\\`))
    const filesUsingLucide = filesToCheck.filter((filePath) =>
      readFileSync(filePath, "utf8").includes("lucide-react")
    )

    expect(filesUsingLucide).toEqual([])
  })

  it("does not keep legacy sass dependencies or scss module declarations", () => {
    const packageJson = readPackageJson()
    const globalTypes = readGlobalTypes()

    expect(packageJson.devDependencies?.sass).toBeUndefined()
    expect(globalTypes).not.toContain('declare module "*.module.scss"')
    expect(globalTypes).not.toContain('declare module "*.scss"')
  })
})
