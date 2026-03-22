import { extractDetailHash, normalizeTitle } from "./batch"
import type { BatchItem, ExtractionResult, Settings } from "./types"

export async function extractSingleItem(item: BatchItem, settings: Settings): Promise<ExtractionResult> {
  let lastFailure = "Unknown extraction error."

  for (let attempt = 0; attempt <= settings.retryCount; attempt += 1) {
    const tab = await chrome.tabs.create({
      url: item.detailUrl,
      active: false
    })

    try {
      await waitForTabReady(tab.id!, Math.max(settings.injectTimeoutMs, 10000))
      const extraction = await executeExtraction(tab.id!, settings)

      return {
        ok: extraction.ok,
        title: normalizeTitle(extraction.title || item.title),
        detailUrl: item.detailUrl,
        hash: extraction.hash || extractDetailHash(item.detailUrl),
        magnetUrl: extraction.magnetUrl || "",
        torrentUrl: extraction.torrentUrl || "",
        failureReason: extraction.failureReason || ""
      }
    } catch (error: unknown) {
      lastFailure = error instanceof Error ? error.message : String(error)
    } finally {
      await closeTabQuietly(tab.id!)
    }
  }

  return {
    ok: false,
    title: item.title,
    detailUrl: item.detailUrl,
    hash: extractDetailHash(item.detailUrl),
    magnetUrl: "",
    torrentUrl: "",
    failureReason: lastFailure
  }
}

async function executeExtraction(tabId: number, settings: Settings) {
  const execution = await chrome.scripting.executeScript({
    target: { tabId },
    func: detailExtractionScript,
    args: [
      {
        remoteScriptUrl: settings.remoteScriptUrl,
        remoteScriptRevision: settings.remoteScriptRevision,
        injectTimeoutMs: settings.injectTimeoutMs,
        domSettleMs: settings.domSettleMs
      }
    ]
  })

  return execution[0]?.result as Omit<ExtractionResult, "detailUrl">
}

function detailExtractionScript(config: {
  remoteScriptUrl: string
  remoteScriptRevision: string
  injectTimeoutMs: number
  domSettleMs: number
}) {
  const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

  const getTitle = () => {
    const breadcrumb = document.querySelector<HTMLAnchorElement>("div.navigation a:last-of-type")
    if (breadcrumb?.textContent) {
      return breadcrumb.textContent.trim()
    }

    return document.title.replace(/\s*-\s*爱恋动漫.*$/u, "").trim()
  }

  const getHash = () => {
    const fromUrl = window.location.pathname.match(/show-([a-f0-9]+)\.html/i)
    return fromUrl ? fromUrl[1].toLowerCase() : ""
  }

  const getAnchorInfo = (id: string) => {
    const node = document.getElementById(id) as HTMLAnchorElement | null
    if (!node) {
      return null
    }

    return {
      id,
      text: (node.textContent || "").trim(),
      href: node.getAttribute("href") || "",
      absoluteHref: node.href || ""
    }
  }

  const looksLikeWormhole = (anchor: ReturnType<typeof getAnchorInfo>) => {
    if (!anchor) {
      return true
    }

    return /mika-mode/i.test(anchor.absoluteHref) || anchor.text === "开启虫洞"
  }

  const summarize = () => {
    const magnet = getAnchorInfo("magnet")
    const download = getAnchorInfo("download")
    const magnetUrl = magnet && /^magnet:/i.test(magnet.absoluteHref) ? magnet.absoluteHref : ""
    const torrentUrl = download && download.absoluteHref && !looksLikeWormhole(download) ? download.absoluteHref : ""

    return {
      title: getTitle(),
      hash: getHash(),
      magnetUrl,
      torrentUrl,
      magnetLabel: magnet ? magnet.text : "",
      downloadLabel: download ? download.text : "",
      needsHelper: !magnetUrl && !torrentUrl
    }
  }

  const setCookies = () => {
    const ttl = 60 * 60 * 24 * 365 * 10
    document.cookie = `user_script_url=${encodeURIComponent(config.remoteScriptUrl)}; max-age=${ttl}; path=/`
    document.cookie = `user_script_rev=${encodeURIComponent(config.remoteScriptRevision)}; max-age=${ttl}; path=/`
  }

  const injectHelper = () => {
    const existing = Array.from(document.scripts).find((script) =>
      (script.src || "").includes("1.acgscript.com/script/miobt/4.js")
    )

    if (existing) {
      return
    }

    const script = document.createElement("script")
    script.src = config.remoteScriptUrl
    script.async = true
    script.dataset.kisssubBatch = "remote-helper"
    document.head.appendChild(script)
  }

  return (async () => {
    const initial = summarize()
    if (!initial.needsHelper) {
      return {
        ok: true,
        title: initial.title,
        hash: initial.hash,
        magnetUrl: initial.magnetUrl,
        torrentUrl: initial.torrentUrl,
        failureReason: ""
      }
    }

    setCookies()
    injectHelper()

    const deadline = Date.now() + config.injectTimeoutMs
    while (Date.now() < deadline) {
      const current = summarize()
      if (!current.needsHelper) {
        await sleep(config.domSettleMs)
        const settled = summarize()
        return {
          ok: true,
          title: settled.title,
          hash: settled.hash,
          magnetUrl: settled.magnetUrl,
          torrentUrl: settled.torrentUrl,
          failureReason: ""
        }
      }

      await sleep(250)
    }

    const current = summarize()
    const reason =
      current.magnetLabel === "开启虫洞" || current.downloadLabel === "开启虫洞"
        ? "The helper script timed out and the detail buttons still point to the wormhole page."
        : "The detail page finished loading, but no usable magnet or torrent URL was exposed."

    return {
      ok: false,
      title: current.title,
      hash: current.hash,
      magnetUrl: current.magnetUrl,
      torrentUrl: current.torrentUrl,
      failureReason: reason
    }
  })()
}

async function waitForTabReady(tabId: number, timeoutMs: number) {
  return new Promise<chrome.tabs.Tab>((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      chrome.tabs.onUpdated.removeListener(listener)
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
    }

    const listener = (
      updatedTabId: number,
      changeInfo: { status?: string },
      tab: chrome.tabs.Tab
    ) => {
      if (updatedTabId !== tabId) {
        return
      }

      if (changeInfo.status === "complete") {
        cleanup()
        resolve(tab)
      }
    }

    timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error("Timed out waiting for the detail tab to finish loading."))
    }, timeoutMs)

    chrome.tabs.onUpdated.addListener(listener)

    void chrome.tabs
      .get(tabId)
      .then((tab) => {
        if (tab.status === "complete") {
          cleanup()
          resolve(tab)
        }
      })
      .catch(() => {
        cleanup()
        reject(new Error("The background detail tab could not be opened."))
      })
  })
}

async function closeTabQuietly(tabId: number) {
  try {
    await chrome.tabs.remove(tabId)
  } catch {
    // Ignore already-closed tabs.
  }
}
