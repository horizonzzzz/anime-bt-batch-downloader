import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { fakeBrowser } from "wxt/testing/fake-browser"
import { afterEach, beforeEach, vi } from "vitest"

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver

beforeEach(() => {
  fakeBrowser.reset()
  let extensionApi = fakeBrowser as typeof fakeBrowser

  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    get() {
      return extensionApi
    },
    set(value) {
      extensionApi = value as typeof fakeBrowser
    }
  })

  Object.defineProperty(globalThis, "browser", {
    configurable: true,
    get() {
      return extensionApi
    },
    set(value) {
      extensionApi = value as typeof fakeBrowser
    }
  })
})

afterEach(() => {
  cleanup()
})
