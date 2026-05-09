import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { chromium } from "@playwright/test"

const rootDir = process.cwd()
const extensionPath = path.join(rootDir, "build", "chrome-mv3-prod")
const outputDir = path.join(rootDir, "docs", "screenshots")

const screenshots = {
  popup: path.join(outputDir, "popup.png"),
  optionsGeneral: path.join(outputDir, "options-general.png"),
  sourcePageInjected: path.join(outputDir, "source-page-injected.png"),
  injectedPanel: path.join(outputDir, "injected-panel.png")
}

function ensureBuildExists() {
  if (!fs.existsSync(path.join(extensionPath, "manifest.json"))) {
    throw new Error(
      `Missing extension build at ${extensionPath}. Run \`pnpm build\` before capturing screenshots.`
    )
  }
}

function getBundledBrowserExecutable() {
  const executablePath = chromium.executablePath()
  return executablePath && fs.existsSync(executablePath) ? executablePath : null
}

async function launchExtensionContext() {
  const executablePath = getBundledBrowserExecutable()
  if (!executablePath) {
    throw new Error("Playwright Chromium is missing. Run `pnpm exec playwright install chromium`.")
  }

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "anime-bt-readme-shots-"))
  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath,
    headless: true,
    viewport: {
      width: 1440,
      height: 960
    },
    args: [
      "--lang=zh-CN",
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  })

  let serviceWorker = context.serviceWorkers()[0]
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker")
  }

  return {
    context,
    extensionId: new URL(serviceWorker.url()).host,
    serviceWorker,
    async close() {
      await context.close()
      fs.rmSync(userDataDir, { recursive: true, force: true })
    }
  }
}

async function prepareRuntimeForProductScreenshots(extension) {
  await extension.serviceWorker.evaluate(() => {
    const runtimeBrowser = globalThis.browser ?? globalThis.chrome
    if (!runtimeBrowser) {
      return
    }

    const originalTabsQuery = runtimeBrowser.tabs.query.bind(runtimeBrowser.tabs)
    const originalFetch = globalThis.fetch.bind(globalThis)

    globalThis.fetch = async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url

      if (url === "http://127.0.0.1:7474/api/v2/auth/login") {
        return new Response("Ok.", {
          status: 200,
          headers: {
            "Content-Type": "text/plain"
          }
        })
      }

      if (url === "http://127.0.0.1:7474/api/v2/app/version") {
        return new Response("5.0.0", {
          status: 200,
          headers: {
            "Content-Type": "text/plain"
          }
        })
      }

      return originalFetch(input, init)
    }

    globalThis.browser = {
      ...runtimeBrowser,
      permissions: {
        ...runtimeBrowser.permissions,
        contains: async () => true,
        request: async () => true
      },
      tabs: {
        ...runtimeBrowser.tabs,
        query: async (queryInfo) => {
          if (queryInfo?.active && queryInfo?.lastFocusedWindow) {
            return [
              {
                id: 9001,
                active: true,
                windowId: 1,
                url: "https://acg.rip/"
              }
            ]
          }

          return originalTabsQuery(queryInfo)
        }
      }
    }
  })
}

function buildFallbackSourcePageHtml() {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>ACG.RIP</title>
    <style>
      :root {
        color-scheme: light;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif;
        background: #eef2f7;
        color: #243042;
      }

      body {
        margin: 0;
        background: #eef2f7;
      }

      a {
        color: #2563eb;
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }

      .site-header {
        background: #172033;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
        color: #f8fafc;
      }

      .topbar,
      .page {
        width: min(1120px, calc(100vw - 64px));
        margin: 0 auto;
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 68px;
      }

      .brand {
        display: flex;
        align-items: baseline;
        gap: 10px;
        font-size: 25px;
        font-weight: 800;
        letter-spacing: 0;
      }

      .brand span {
        color: #38bdf8;
      }

      .nav {
        display: flex;
        gap: 22px;
        font-size: 14px;
      }

      .nav a {
        color: #cbd5e1;
      }

      .hero {
        border-top: 1px solid rgba(148, 163, 184, 0.2);
        padding: 24px 0 30px;
      }

      .hero-inner {
        width: min(1120px, calc(100vw - 64px));
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 28px;
      }

      .hero h1 {
        margin: 0 0 8px;
        font-size: 26px;
        letter-spacing: 0;
      }

      .hero p {
        margin: 0;
        color: #a8b3c7;
        font-size: 14px;
      }

      .search {
        display: flex;
        overflow: hidden;
        width: 360px;
        border: 1px solid rgba(148, 163, 184, 0.3);
        border-radius: 8px;
        background: #0f172a;
      }

      .search input {
        min-width: 0;
        flex: 1;
        border: 0;
        background: transparent;
        color: #e2e8f0;
        font: inherit;
        padding: 12px 14px;
      }

      .search button {
        border: 0;
        background: #2563eb;
        color: white;
        font-weight: 700;
        padding: 0 18px;
      }

      .notice {
        width: min(1120px, calc(100vw - 64px));
        margin: 18px auto 0;
        border: 1px solid rgba(56, 189, 248, 0.35);
        border-radius: 8px;
        background: rgba(14, 165, 233, 0.12);
        color: #dff6ff;
        font-size: 13px;
        line-height: 1.5;
        padding: 10px 14px;
      }

      .notice strong {
        color: #fff;
      }

      .page {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 280px;
        gap: 24px;
        padding: 28px 0 72px;
      }

      .panel {
        border: 1px solid #dbe3ef;
        border-radius: 10px;
        background: #fff;
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);
      }

      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #e5eaf2;
        padding: 18px 22px;
      }

      .panel-header h2 {
        margin: 0;
        font-size: 18px;
      }

      .tabs {
        display: flex;
        gap: 8px;
      }

      .tab {
        border-radius: 999px;
        background: #eef4ff;
        color: #1d4ed8;
        font-size: 12px;
        font-weight: 700;
        padding: 6px 10px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        border-bottom: 1px solid #edf1f7;
        padding: 14px 18px;
        text-align: left;
        vertical-align: top;
      }

      th {
        color: #64748b;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .group {
        width: 118px;
        font-size: 13px;
        font-weight: 700;
      }

      .title {
        font-size: 14px;
        font-weight: 700;
        line-height: 1.5;
      }

      .meta {
        margin-top: 6px;
        color: #64748b;
        font-size: 12px;
      }

      .download {
        width: 96px;
        white-space: nowrap;
      }

      .download a {
        display: inline-flex;
        border: 1px solid #bfdbfe;
        border-radius: 7px;
        background: #eff6ff;
        color: #1d4ed8;
        font-size: 12px;
        font-weight: 700;
        padding: 7px 10px;
      }

      .side {
        display: grid;
        gap: 16px;
        align-content: start;
      }

      .side-card {
        border: 1px solid #dbe3ef;
        border-radius: 10px;
        background: #fff;
        padding: 18px;
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.05);
      }

      .side-card h3 {
        margin: 0 0 12px;
        font-size: 15px;
      }

      .tag-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .tag-list span {
        border-radius: 999px;
        background: #f1f5f9;
        color: #475569;
        font-size: 12px;
        padding: 6px 9px;
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        color: #64748b;
        font-size: 12px;
      }

      .stats strong {
        display: block;
        color: #111827;
        font-size: 20px;
      }
    </style>
  </head>
  <body>
    <header class="site-header">
      <div class="topbar">
        <div class="brand">ACG<span>.RIP</span></div>
        <nav class="nav" aria-label="主导航">
          <a href="/">首页</a>
          <a href="/page/2">动画</a>
          <a href="/series/100">合集</a>
          <a href="/user/1917">发布组</a>
        </nav>
      </div>
      <section class="hero">
        <div class="hero-inner">
          <div>
            <h1>动画 BT 资源发布页</h1>
            <p>浏览近期更新，按发布组、清晰度和字幕信息筛选条目。</p>
          </div>
          <form class="search">
            <input value="Medalist 1080p" aria-label="搜索关键词" />
            <button type="button">搜索</button>
          </form>
        </div>
        <div class="notice">
          <strong>模拟页面，仅用于展示扩展注入效果。</strong>
          截图脚本会优先打开真实 ACG.RIP；当当前网络无法访问时才使用此本地演示页面。
        </div>
      </section>
    </header>

    <main class="page">
      <section class="panel">
        <div class="panel-header">
          <h2>最新资源</h2>
          <div class="tabs">
            <span class="tab">全部</span>
            <span class="tab">1080p</span>
            <span class="tab">简中</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>发布组</th>
              <th>标题</th>
              <th>种子</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="group"><a href="/team/12">LoliHouse</a></td>
              <td>
                <a class="title" href="/t/350361">[LoliHouse] Hell Mode - 11 [WebRip 1080p HEVC-10bit AAC]</a>
                <div class="meta">动画 · 1.42 GB · 2026-05-09 18:10 · 18 个做种</div>
              </td>
              <td class="download"><a href="/t/350361.torrent">下载种子</a></td>
            </tr>
            <tr>
              <td class="group"><a href="/team/37">丸子家族</a></td>
              <td>
                <a class="title" href="/t/350360">[丸子家族] 海螺小姐 / Sazae-san [MP4][GB][1080p]</a>
                <div class="meta">番剧 · 552 MB · 2026-05-09 17:42 · 9 个做种</div>
              </td>
              <td class="download"><a href="/t/350360.torrent">下载种子</a></td>
            </tr>
            <tr>
              <td class="group"><a href="/team/88">SweetSub</a></td>
              <td>
                <a class="title" href="/t/350359">[SweetSub] Momentary Lily - 14 [简日内封][1080p]</a>
                <div class="meta">字幕组 · 806 MB · 2026-05-09 16:55 · 24 个做种</div>
              </td>
              <td class="download"><a href="/t/350359.torrent">下载种子</a></td>
            </tr>
            <tr>
              <td class="group"><a href="/team/16">NC-Raws</a></td>
              <td>
                <a class="title" href="/t/350358">[NC-Raws] Medalist - 08 (B-Global 1920x1080 HEVC AAC MKV)</a>
                <div class="meta">生肉 · 1.08 GB · 2026-05-09 15:38 · 31 个做种</div>
              </td>
              <td class="download"><a href="/t/350358.torrent">下载种子</a></td>
            </tr>
          </tbody>
        </table>
      </section>

      <aside class="side">
        <section class="side-card">
          <h3>热门标签</h3>
          <div class="tag-list">
            <span>新番</span>
            <span>1080p</span>
            <span>HEVC</span>
            <span>简中</span>
            <span>合集</span>
            <span>WebRip</span>
          </div>
        </section>
        <section class="side-card">
          <h3>站点统计</h3>
          <div class="stats">
            <span><strong>128</strong>今日发布</span>
            <span><strong>5</strong>活跃源站</span>
          </div>
        </section>
      </aside>
    </main>
  </body>
</html>`
}

async function tryOpenRealSourcePage(extension) {
  const page = await extension.context.newPage()
  await page.setViewportSize({ width: 1440, height: 960 })

  try {
    await page.goto("https://acg.rip/", {
      waitUntil: "domcontentloaded",
      timeout: 15000
    })
    await waitForInjectedSourceUi(page)
    return page
  } catch (error) {
    console.warn(`Falling back to local ACG.RIP screenshot page: ${error.message}`)
    await page.close()
    return null
  }
}

async function routeFallbackSourcePage(extension) {
  await extension.context.route("https://acg.rip/", async (route) => {
    await route.fulfill({
      body: buildFallbackSourcePageHtml(),
      contentType: "text/html"
    })
  })
}

async function openInjectedSourcePage(extension) {
  const realPage = await tryOpenRealSourcePage(extension)
  if (realPage) {
    return realPage
  }

  await routeFallbackSourcePage(extension)

  const page = await extension.context.newPage()
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto("https://acg.rip/")
  await waitForInjectedSourceUi(page)
  return page
}

async function waitForInjectedSourceUi(page) {
  await page.waitForSelector("[data-anime-bt-batch-panel-root]", { state: "attached" })
  await page.waitForSelector("[data-anime-bt-batch-checkbox-root]", { state: "attached" })
  await page.waitForFunction(() => {
    const host = document.querySelector("[data-anime-bt-batch-panel-root]")
    return Boolean(host?.shadowRoot?.querySelector('[data-anime-bt-role="panel-shell"]'))
  })
}

async function clickInjectedCheckbox(page, index) {
  await page.locator("[data-anime-bt-batch-checkbox-root]").nth(index).evaluate((host) => {
    const label = host.shadowRoot?.querySelector('[data-anime-bt-role="selection-pill"]')
    if (!label) {
      throw new Error("Injected checkbox label was not found inside the shadow root.")
    }

    label.click()
  })
}

async function screenshotPanel(page, screenshotPath) {
  const box = await page.locator("[data-anime-bt-batch-panel-root]").evaluate((host) => {
    const panel = host.shadowRoot?.querySelector('[data-anime-bt-role="panel-shell"]')
    if (!panel) {
      throw new Error("Injected panel shell was not found inside the shadow root.")
    }

    const rect = panel.getBoundingClientRect()
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    }
  })

  const margin = 24
  const viewport = page.viewportSize() ?? { width: 1440, height: 960 }
  await page.screenshot({
    path: screenshotPath,
    clip: {
      x: Math.max(0, box.x - margin),
      y: Math.max(0, box.y - margin),
      width: Math.min(viewport.width - Math.max(0, box.x - margin), box.width + margin * 2),
      height: Math.min(viewport.height - Math.max(0, box.y - margin), box.height + margin * 2)
    }
  })
}

async function capturePopup(extension) {
  const popup = await extension.context.newPage()
  await popup.setViewportSize({ width: 390, height: 590 })
  await popup.goto(`chrome-extension://${extension.extensionId}/popup.html`)
  await popup.getByRole("heading", { name: "Anime BT Batch" }).waitFor()
  await popup.waitForTimeout(800)
  await popup.screenshot({ path: screenshots.popup, fullPage: true })
  await popup.close()
}

async function captureOptions(extension) {
  const page = await extension.context.newPage()
  await page.setViewportSize({ width: 1440, height: 1180 })
  await page.goto(`chrome-extension://${extension.extensionId}/options.html#/general`)
  await page.waitForSelector('[data-testid="general-status-panel"]')
  await page.screenshot({ path: screenshots.optionsGeneral })
  await page.close()
}

async function captureInjectedUi(extension) {
  const sourcePage = await openInjectedSourcePage(extension)
  await sourcePage.screenshot({ path: screenshots.sourcePageInjected, fullPage: false })

  await clickInjectedCheckbox(sourcePage, 0)
  await sourcePage
    .locator("[data-anime-bt-batch-panel-root]")
    .evaluate((host) => {
      const advancedToggle = host.shadowRoot?.querySelector('[data-anime-bt-role="advanced-toggle"]')
      if (advancedToggle instanceof HTMLElement) {
        advancedToggle.click()
      }
    })
  await sourcePage.waitForTimeout(300)
  await screenshotPanel(sourcePage, screenshots.injectedPanel)

  await sourcePage.close()
}

ensureBuildExists()
fs.mkdirSync(outputDir, { recursive: true })

const extension = await launchExtensionContext()

try {
  await prepareRuntimeForProductScreenshots(extension)
  await capturePopup(extension)
  await captureOptions(extension)
  await captureInjectedUi(extension)
  console.log(`Captured README screenshots in ${path.relative(rootDir, outputDir)}`)
} finally {
  await extension.close()
}
