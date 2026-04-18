import { beforeEach, describe, expect, it } from "vitest"

import { getPageSubscriptionScanner } from "../../../src/lib/content/subscription-scan"
import type { SourceSubscriptionScanCandidate } from "../../../src/lib/sources/types"
import type { SourceId } from "../../../src/lib/shared/types"

describe("page subscription scanner registry and handlers", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
  })

  describe("ACG.RIP scanner (declarative schema)", () => {
    it("scans ACG.RIP rows through the generic engine", async () => {
      // Setup: ACG.RIP list page with one torrent row
      // Use absolute URLs to avoid jsdom URL resolution issues
      document.body.innerHTML = `
        <table>
          <tbody>
            <tr>
              <td><a href="/user/1917">LoliHouse</a></td>
              <td>
                <a href="/team/12">LoliHouse</a>
                <a href="https://acg.rip/t/100">[LoliHouse] Test Anime - 01</a>
              </td>
              <td><a href="https://acg.rip/t/100.torrent">下载</a></td>
              <td>100 MB</td>
            </tr>
          </tbody>
        </table>
      `

      const scanner = getPageSubscriptionScanner("acgrip")
      expect(scanner).not.toBeNull()

      const candidates = await scanner!.scan()

      expect(candidates).toEqual([
        expect.objectContaining({
          sourceId: "acgrip",
          title: "[LoliHouse] Test Anime - 01",
          detailUrl: "https://acg.rip/t/100",
          torrentUrl: "https://acg.rip/t/100.torrent"
        })
      ])
    })

    it("returns empty array when no valid rows found", async () => {
      document.body.innerHTML = `
        <table>
          <tbody>
            <tr>
              <td>No valid torrent link here</td>
            </tr>
          </tbody>
        </table>
      `

      const scanner = getPageSubscriptionScanner("acgrip")
      const candidates = await scanner!.scan()

      expect(candidates).toEqual([])
    })
  })

  describe("Bangumi scanner (async stabilization)", () => {
    it("waits for Bangumi list stabilization before returning candidates", async () => {
      // Setup: Initial empty state (Angular not yet hydrated)
      document.body.innerHTML = `
        <md-list class="torrent-list">
          <md-list-item>Loading...</md-list-item>
        </md-list>
      `

      // Simulate Angular hydration after 50ms using real timers
      // Use absolute URLs to avoid jsdom URL resolution issues
      const hydrationPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          document.body.innerHTML = `
            <md-list class="torrent-list">
              <md-list-item>
                <div class="md-tile-content">
                  <div class="torrent-title">
                    <h3><span>[Subgroup] Test Anime - 01</span></h3>
                  </div>
                  <a href="https://bangumi.moe/torrent/abc123def456" target="_blank">View</a>
                </div>
              </md-list-item>
            </md-list>
          `
          resolve()
        }, 50)
      })

      // Start the scan
      const scanner = getPageSubscriptionScanner("bangumimoe")
      expect(scanner).not.toBeNull()

      const scanPromise = scanner!.scan()

      // Wait for hydration to complete
      await hydrationPromise

      // Wait a bit more for stabilization window (300ms)
      await new Promise((resolve) => setTimeout(resolve, 400))

      const candidates = await scanPromise

      expect(candidates).toEqual([
        expect.objectContaining({
          sourceId: "bangumimoe",
          title: "[Subgroup] Test Anime - 01",
          detailUrl: "https://bangumi.moe/torrent/abc123def456"
        })
      ])
    })

    it("returns empty array when no valid items found after stabilization", async () => {
      document.body.innerHTML = `
        <md-list class="torrent-list">
          <md-list-item>
            <div class="md-tile-content">No valid link</div>
          </md-list-item>
        </md-list>
      `

      const scanner = getPageSubscriptionScanner("bangumimoe")
      const scanPromise = scanner!.scan()

      // Wait for stabilization timeout
      await new Promise((resolve) => setTimeout(resolve, 500))

      const candidates = await scanPromise

      expect(candidates).toEqual([])
    })
  })

  describe("registry lookup", () => {
    it("returns null for unsupported source", () => {
      const scanner = getPageSubscriptionScanner("unknown-source" as SourceId)
      expect(scanner).toBeNull()
    })

    it("returns scanner for supported sources", () => {
      const acgripScanner = getPageSubscriptionScanner("acgrip")
      expect(acgripScanner?.sourceId).toBe("acgrip")

      const bangumiScanner = getPageSubscriptionScanner("bangumimoe")
      expect(bangumiScanner?.sourceId).toBe("bangumimoe")
    })
  })
})