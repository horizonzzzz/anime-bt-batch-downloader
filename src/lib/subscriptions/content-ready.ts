import type { SourceId } from "../shared/types"

const readySignals = new Set<string>()
const waiters = new Map<string, Set<() => void>>()

function createReadyKey(tabId: number, sourceId: SourceId): string {
  return `${tabId}:${sourceId}`
}

export function markContentScriptReady(tabId: number, sourceId: SourceId): void {
  const key = createReadyKey(tabId, sourceId)
  readySignals.add(key)

  const callbacks = waiters.get(key)
  if (!callbacks) {
    return
  }

  waiters.delete(key)
  for (const callback of callbacks) {
    callback()
  }
}

export function clearContentScriptReadyForTab(tabId: number): void {
  for (const key of Array.from(readySignals)) {
    if (key.startsWith(`${tabId}:`)) {
      readySignals.delete(key)
    }
  }

  for (const key of Array.from(waiters.keys())) {
    if (key.startsWith(`${tabId}:`)) {
      waiters.delete(key)
    }
  }
}

export function resetContentScriptReadyRegistry(): void {
  readySignals.clear()
  waiters.clear()
}

export async function waitForContentScriptReadySignal(
  tabId: number,
  sourceId: SourceId,
  timeoutMs = 30000
): Promise<void> {
  const key = createReadyKey(tabId, sourceId)
  if (readySignals.has(key)) {
    readySignals.delete(key)
    return
  }

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const callbacks = waiters.get(key)
      if (callbacks) {
        callbacks.delete(onReady)
        if (callbacks.size === 0) {
          waiters.delete(key)
        }
      }
      reject(new Error("Timed out waiting for content script ready signal."))
    }, timeoutMs)

    const onReady = () => {
      clearTimeout(timeoutId)
      readySignals.delete(key)
      resolve()
    }

    const callbacks = waiters.get(key)
    if (callbacks) {
      callbacks.add(onReady)
      return
    }

    waiters.set(key, new Set([onReady]))
  })
}
