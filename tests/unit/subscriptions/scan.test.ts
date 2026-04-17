import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  getSubscriptionCapableSourceAdapterById,
  getSubscriptionScanSourceAdapterById
} from "../../../src/lib/sources"
import {
  scanSubscriptionCandidatesFromSource,
  type RunWithListPageTab
} from "../../../src/lib/subscriptions/source-scan"

function installExecuteScriptHarness() {
  const executeScript = vi.fn(async ({ func, args = [] }: { func: (...values: unknown[]) => unknown; args?: unknown[] }) => [
    { result: await func(...args) }
  ])

  globalThis.chrome = {
    scripting: {
      executeScript
    }
  } as unknown as typeof chrome

  return executeScript
}

function createRunWithListPageTabHarness(tabId: number): {
  runWithListPageTab: RunWithListPageTab
  spy: ReturnType<typeof vi.fn<(listPageUrl: string, run: (tabId: number) => Promise<unknown>) => void>>
} {
  const spy = vi.fn<(listPageUrl: string, run: (tabId: number) => Promise<unknown>) => void>()
  const runWithListPageTab: RunWithListPageTab = async <T>(
    listPageUrl: string,
    run: (tabId: number) => Promise<T>
  ): Promise<T> => {
    spy(listPageUrl, run as (tabId: number) => Promise<unknown>)
    return run(tabId)
  }

  return {
    runWithListPageTab,
    spy
  }
}

describe("subscription source scan", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
  })

  it("exposes only adapters that support background subscription list scanning", () => {
    expect(getSubscriptionCapableSourceAdapterById("acgrip")?.id).toBe("acgrip")
    expect(getSubscriptionCapableSourceAdapterById("bangumimoe")?.id).toBe("bangumimoe")
    expect(getSubscriptionCapableSourceAdapterById("kisssub")).toBeNull()
    expect(getSubscriptionCapableSourceAdapterById("dongmanhuayuan")).toBeNull()

    expect(getSubscriptionScanSourceAdapterById("acgrip")?.id).toBe("acgrip")
    expect(getSubscriptionScanSourceAdapterById("bangumimoe")?.id).toBe("bangumimoe")
    expect(getSubscriptionScanSourceAdapterById("kisssub")).toBeNull()
    expect(getSubscriptionScanSourceAdapterById("dongmanhuayuan")).toBeNull()

    expect(getSubscriptionScanSourceAdapterById("acgrip")).toBe(
      getSubscriptionCapableSourceAdapterById("acgrip")
    )
  })

  it("scans acg.rip candidates through an injected list-page runner", async () => {
    document.body.innerHTML = `
      <div>
        <a href="https://acg.rip/t/999">Noise anchor outside list table</a>
      </div>
      <table>
        <tr>
          <td><a href="https://acg.rip/t/100">[LoliHouse] Medalist - 01</a></td>
          <td><a href="https://acg.rip/t/100.torrent">下载</a></td>
        </tr>
        <tr>
          <td><a href="https://acg.rip/t/100">[LoliHouse] Medalist - 01 (duplicate)</a></td>
          <td><a href="https://acg.rip/t/100.torrent">下载</a></td>
        </tr>
      </table>
    `
    installExecuteScriptHarness()

    const { runWithListPageTab, spy } = createRunWithListPageTabHarness(17)

    const candidates = await scanSubscriptionCandidatesFromSource("acgrip", {
      runWithListPageTab
    })

    expect(spy).toHaveBeenCalledWith("https://acg.rip/", expect.any(Function))
    expect(candidates).toEqual([
      {
        sourceId: "acgrip",
        title: "[LoliHouse] Medalist - 01",
        normalizedTitle: "[lolihouse] medalist - 01",
        detailUrl: "https://acg.rip/t/100",
        magnetUrl: "",
        torrentUrl: "https://acg.rip/t/100.torrent",
        subgroup: ""
      }
    ])
  })

  it("drops scanned candidates whose detail URL is outside the requested source scope", async () => {
    document.body.innerHTML = `
      <table>
        <tr>
          <td><a href="https://acg.rip/t/200">[LoliHouse] Medalist - 02</a></td>
          <td><a href="https://acg.rip/t/200.torrent">下载</a></td>
        </tr>
        <tr>
          <td><a href="https://bangumi.moe/t/201">[ANi] Wrong Host Candidate</a></td>
          <td><a href="https://bangumi.moe/t/201.torrent">下载</a></td>
        </tr>
      </table>
    `
    installExecuteScriptHarness()

    const { runWithListPageTab } = createRunWithListPageTabHarness(23)

    const candidates = await scanSubscriptionCandidatesFromSource("acgrip", {
      runWithListPageTab
    })

    expect(candidates).toEqual([
      {
        sourceId: "acgrip",
        title: "[LoliHouse] Medalist - 02",
        normalizedTitle: "[lolihouse] medalist - 02",
        detailUrl: "https://acg.rip/t/200",
        magnetUrl: "",
        torrentUrl: "https://acg.rip/t/200.torrent",
        subgroup: ""
      }
    ])
  })

  it("scans bangumi.moe candidates through an injected list-page runner", async () => {
    document.body.innerHTML = `
      <div>
        <a href="https://bangumi.moe/torrent/aaaaaaaaaaaaaaaaaaaaaaaa" target="_blank">
          Noise anchor outside list
        </a>
      </div>
      <md-list class="torrent-list">
        <md-list-item>
          <div class="md-tile-content">
            <div class="torrent-title">
              <h3 class="md-item-raised-title">
                <span>[ANi] Episode 01</span>
                <small><a href="https://bangumi.moe/torrent/69c28b1384f11a93b5ff76a6" target="_blank"><i class="fa fa-external-link"></i></a></small>
              </h3>
            </div>
          </div>
        </md-list-item>
      </md-list>
    `
    installExecuteScriptHarness()

    const { runWithListPageTab, spy } = createRunWithListPageTabHarness(19)

    const candidates = await scanSubscriptionCandidatesFromSource("bangumimoe", {
      runWithListPageTab
    })

    expect(spy).toHaveBeenCalledWith("https://bangumi.moe/", expect.any(Function))
    expect(candidates).toEqual([
      {
        sourceId: "bangumimoe",
        title: "[ANi] Episode 01",
        normalizedTitle: "[ani] episode 01",
        detailUrl: "https://bangumi.moe/torrent/69c28b1384f11a93b5ff76a6",
        magnetUrl: "",
        torrentUrl: "",
        subgroup: ""
      }
    ])
  })

  it("waits briefly for bangumi.moe async-rendered list items before returning scan results", async () => {
    vi.useFakeTimers()
    try {
      document.body.innerHTML = `<md-list class="torrent-list"></md-list>`
      installExecuteScriptHarness()

      const { runWithListPageTab } = createRunWithListPageTabHarness(29)

      setTimeout(() => {
        document.body.innerHTML = `
          <md-list class="torrent-list">
            <md-list-item>
              <div class="md-tile-content">
                <div class="torrent-title">
                  <h3 class="md-item-raised-title">
                    <span>[ANi] Episode 02</span>
                    <small>
                      <a href="https://bangumi.moe/torrent/79c28b1384f11a93b5ff76a7" target="_blank">
                        <i class="fa fa-external-link"></i>
                      </a>
                    </small>
                  </h3>
                </div>
              </div>
            </md-list-item>
          </md-list>
        `
      }, 200)

      const pendingCandidates = scanSubscriptionCandidatesFromSource("bangumimoe", {
        runWithListPageTab
      })
      await vi.advanceTimersByTimeAsync(500)

      await expect(pendingCandidates).resolves.toEqual([
        {
          sourceId: "bangumimoe",
          title: "[ANi] Episode 02",
          normalizedTitle: "[ani] episode 02",
          detailUrl: "https://bangumi.moe/torrent/79c28b1384f11a93b5ff76a7",
          magnetUrl: "",
          torrentUrl: "",
          subgroup: ""
        }
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it("waits for a briefly stable bangumi.moe candidate set before returning", async () => {
    vi.useFakeTimers()
    try {
      document.body.innerHTML = `<md-list class="torrent-list"></md-list>`
      installExecuteScriptHarness()

      const { runWithListPageTab } = createRunWithListPageTabHarness(31)

      setTimeout(() => {
        document.body.innerHTML = `
          <md-list class="torrent-list">
            <md-list-item>
              <div class="md-tile-content">
                <div class="torrent-title">
                  <h3 class="md-item-raised-title">
                    <span>[ANi] Episode 03</span>
                    <small>
                      <a href="https://bangumi.moe/torrent/89c28b1384f11a93b5ff76a8" target="_blank">
                        <i class="fa fa-external-link"></i>
                      </a>
                    </small>
                  </h3>
                </div>
              </div>
            </md-list-item>
          </md-list>
        `
      }, 100)

      setTimeout(() => {
        document.body.innerHTML = `
          <md-list class="torrent-list">
            <md-list-item>
              <div class="md-tile-content">
                <div class="torrent-title">
                  <h3 class="md-item-raised-title">
                    <span>[ANi] Episode 03</span>
                    <small>
                      <a href="https://bangumi.moe/torrent/89c28b1384f11a93b5ff76a8" target="_blank">
                        <i class="fa fa-external-link"></i>
                      </a>
                    </small>
                  </h3>
                </div>
              </div>
            </md-list-item>
            <md-list-item>
              <div class="md-tile-content">
                <div class="torrent-title">
                  <h3 class="md-item-raised-title">
                    <span>[ANi] Episode 04</span>
                    <small>
                      <a href="https://bangumi.moe/torrent/99c28b1384f11a93b5ff76a9" target="_blank">
                        <i class="fa fa-external-link"></i>
                      </a>
                    </small>
                  </h3>
                </div>
              </div>
            </md-list-item>
          </md-list>
        `
      }, 300)

      const pendingCandidates = scanSubscriptionCandidatesFromSource("bangumimoe", {
        runWithListPageTab
      })
      await vi.advanceTimersByTimeAsync(900)

      await expect(pendingCandidates).resolves.toEqual([
        {
          sourceId: "bangumimoe",
          title: "[ANi] Episode 03",
          normalizedTitle: "[ani] episode 03",
          detailUrl: "https://bangumi.moe/torrent/89c28b1384f11a93b5ff76a8",
          magnetUrl: "",
          torrentUrl: "",
          subgroup: ""
        },
        {
          sourceId: "bangumimoe",
          title: "[ANi] Episode 04",
          normalizedTitle: "[ani] episode 04",
          detailUrl: "https://bangumi.moe/torrent/99c28b1384f11a93b5ff76a9",
          magnetUrl: "",
          torrentUrl: "",
          subgroup: ""
        }
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it("returns an empty list when the source adapter has no subscription scan support", async () => {
    const { runWithListPageTab, spy } = createRunWithListPageTabHarness(0)

    await expect(
      scanSubscriptionCandidatesFromSource("kisssub", {
        runWithListPageTab
      })
    ).resolves.toEqual([])

    expect(spy).not.toHaveBeenCalled()
  })
})
