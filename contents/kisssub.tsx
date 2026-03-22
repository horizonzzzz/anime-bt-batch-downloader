import type { Root } from "react-dom/client"
import { createRoot } from "react-dom/client"
import type { PlasmoCSConfig } from "plasmo"

import { BatchPanel } from "../components/batch-panel"
import { SelectionCheckbox } from "../components/selection-checkbox"
import { BATCH_EVENT } from "../lib/constants"
import {
  getAnchorMountTarget,
  getBatchItemFromAnchor,
  getDetailAnchors,
  isListPage
} from "../lib/content-page"
import type { BatchEventPayload, BatchItem, BatchLogItem } from "../lib/types"

export const config: PlasmoCSConfig = {
  matches: ["http://www.kisssub.org/*", "https://www.kisssub.org/*"],
  run_at: "document_idle",
  css: ["./kisssub.css"]
}

type CheckboxRoot = {
  container: HTMLSpanElement
  root: Root
  item: BatchItem
}

type PanelSnapshot = {
  running: boolean
  selected: Map<string, BatchItem>
  progressText: string
  statusText: string
  logs: BatchLogItem[]
}

const snapshot: PanelSnapshot = {
  running: false,
  selected: new Map(),
  progressText: "等待操作",
  statusText: "就绪。先在当前列表页勾选帖子。",
  logs: []
}

const checkboxRoots = new Map<string, CheckboxRoot>()
let panelRoot: Root | null = null
let panelContainer: HTMLDivElement | null = null
let observer: MutationObserver | null = null

if (isListPage(window.location)) {
  mountPanel()
  scanAndDecorate()
  if (checkboxRoots.size > 0) {
    observeMutations()
    chrome.runtime.onMessage.addListener((message: { type?: string } & BatchEventPayload) => {
      if (!message || message.type !== BATCH_EVENT) {
        return
      }

      handleBatchEvent(message)
    })
  } else {
    document.querySelector(".kisssub-batch-panel-root")?.remove()
    panelContainer = null
    panelRoot = null
  }
}

function mountPanel() {
  if (panelRoot) {
    return
  }

  panelContainer = document.createElement("div")
  panelContainer.className = "kisssub-batch-panel-root"
  document.body.appendChild(panelContainer)
  panelRoot = createRoot(panelContainer)
  renderAll()
}

function observeMutations() {
  let timer = 0
  observer = new MutationObserver(() => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      scanAndDecorate()
      renderAll()
    }, 150)
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}

function scanAndDecorate() {
  for (const anchor of getDetailAnchors()) {
    if (anchor.dataset.kisssubBatchDecorated === "1") {
      continue
    }

    const item = getBatchItemFromAnchor(anchor)
    if (!item) {
      continue
    }

    const targetCell = getAnchorMountTarget(anchor)
    if (!targetCell) {
      continue
    }

    const container = document.createElement("span")
    container.className = "kisssub-batch-checkbox-root"

    if (targetCell.firstChild) {
      targetCell.insertBefore(container, targetCell.firstChild)
    } else {
      targetCell.appendChild(container)
    }

    const root = createRoot(container)
    checkboxRoots.set(item.detailUrl, {
      container,
      root,
      item
    })

    anchor.dataset.kisssubBatchDecorated = "1"
  }
}

function renderAll() {
  renderPanel()
  renderCheckboxes()
}

function renderPanel() {
  if (!panelRoot) {
    return
  }

  panelRoot.render(
    <BatchPanel
      selectedCount={snapshot.selected.size}
      running={snapshot.running}
      progressText={snapshot.progressText}
      statusText={snapshot.statusText}
      logs={snapshot.logs}
      onSelectAll={selectAllVisible}
      onClear={clearSelection}
      onDownload={() => {
        void startBatchDownload()
      }}
      onOpenSettings={() => {
        void chrome.runtime.sendMessage({ type: "OPEN_OPTIONS_PAGE" })
      }}
    />
  )
}

function renderCheckboxes() {
  for (const { item, root } of checkboxRoots.values()) {
    root.render(
      <SelectionCheckbox
        checked={snapshot.selected.has(item.detailUrl)}
        onChange={(checked) => {
          toggleSelection(item, checked)
        }}
      />
    )
  }
}

function toggleSelection(item: BatchItem, checked: boolean) {
  if (checked) {
    snapshot.selected.set(item.detailUrl, item)
  } else {
    snapshot.selected.delete(item.detailUrl)
  }

  renderAll()
}

function selectAllVisible() {
  for (const { item } of checkboxRoots.values()) {
    snapshot.selected.set(item.detailUrl, item)
  }

  renderAll()
}

function clearSelection() {
  snapshot.selected.clear()
  snapshot.statusText = "已清空当前选择。"
  renderAll()
}

async function startBatchDownload() {
  if (snapshot.running) {
    return
  }

  const items = Array.from(snapshot.selected.values())
  if (!items.length) {
    snapshot.statusText = "还没有选中任何帖子。"
    renderAll()
    return
  }

  snapshot.running = true
  snapshot.progressText = "准备中"
  snapshot.statusText = `开始处理 ${items.length} 项，后台会逐个打开详情页并提取真实链接。`
  snapshot.logs = []
  renderAll()

  const response = await chrome.runtime.sendMessage({
    type: "START_BATCH_DOWNLOAD",
    items
  })

  if (!response?.ok) {
    snapshot.running = false
    snapshot.statusText = response?.error ?? "无法启动批量下载任务。"
    renderAll()
  }
}

function handleBatchEvent(event: BatchEventPayload) {
  if (typeof event.stats?.total === "number") {
    snapshot.progressText = `总数 ${event.stats.total} | 已处理 ${event.stats.processed || 0} | 已提取 ${
      event.stats.prepared || 0
    } | 已提交 ${event.stats.submitted || 0} | 重复 ${event.stats.duplicated || 0} | 失败 ${
      event.stats.failed || 0
    }`
  }

  if (event.stage === "started") {
    snapshot.running = true
    snapshot.statusText = event.message || "批量任务已启动。"
    renderAll()
    return
  }

  if (event.stage === "progress" && event.item) {
    snapshot.logs = [event.item, ...snapshot.logs].slice(0, 8)
    snapshot.statusText = event.item.message || "正在处理下一项。"
    renderAll()
    return
  }

  if (event.stage === "submitting") {
    snapshot.statusText = event.message || "正在提交到 qBittorrent。"
    renderAll()
    return
  }

  if (event.stage === "completed") {
    snapshot.running = false
    const summary = event.summary ?? { submitted: 0, duplicated: 0, failed: 0 }
    snapshot.statusText = `完成。成功提交 ${summary.submitted || 0} 项，重复 ${summary.duplicated || 0} 项，失败 ${
      summary.failed || 0
    } 项。`
    if (Array.isArray(event.results)) {
      snapshot.logs = event.results.slice(-8).reverse()
    }
    renderAll()
    return
  }

  if (event.stage === "error" || event.stage === "fatal") {
    snapshot.running = false
    snapshot.statusText = event.error || "批量任务失败。"
    renderAll()
  }
}
