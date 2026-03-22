import { ENTRY_SELECTOR } from "./constants"
import type { BatchItem } from "./types"

export function isListPage(location: Location): boolean {
  const path = location.pathname

  if (/\/show-[a-f0-9]+\.html$/i.test(path)) {
    return false
  }

  if (/\/addon\.php/i.test(path) || /\/user\.php/i.test(path) || /\/public\/html\/start\//i.test(path)) {
    return false
  }

  return true
}

export function getDetailAnchors(root: ParentNode = document): HTMLAnchorElement[] {
  return Array.from(root.querySelectorAll<HTMLAnchorElement>(ENTRY_SELECTOR)).filter(isValidDetailAnchor)
}

export function isValidDetailAnchor(anchor: HTMLAnchorElement): boolean {
  try {
    const url = new URL(anchor.href, window.location.href)
    return /\/show-[a-f0-9]+\.html$/i.test(url.pathname)
  } catch {
    return false
  }
}

export function getBatchItemFromAnchor(anchor: HTMLAnchorElement): BatchItem | null {
  const title = normalizeText(anchor.textContent)
  if (!title) {
    return null
  }

  return {
    detailUrl: new URL(anchor.href, window.location.href).href,
    title
  }
}

export function getAnchorMountTarget(anchor: HTMLAnchorElement): Element | null {
  return anchor.closest("td, li, p, div") || anchor.parentElement
}

export function normalizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
}
