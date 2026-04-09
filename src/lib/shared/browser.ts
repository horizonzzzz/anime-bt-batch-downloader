import { browser as wxtBrowser } from "wxt/browser"
import type { Browser } from "wxt/browser"

export type ExtensionBrowser = typeof wxtBrowser
export type { Browser }

export function getBrowser(): ExtensionBrowser {
  const runtimeBrowser = (globalThis as typeof globalThis & { browser?: ExtensionBrowser }).browser
  if (runtimeBrowser) {
    return runtimeBrowser
  }

  const runtimeChrome = (globalThis as typeof globalThis & { chrome?: ExtensionBrowser }).chrome
  return runtimeChrome ?? wxtBrowser
}

export function getExtensionUrl(path: string): string {
  const runtime = getBrowser().runtime as unknown as { getURL: (value: string) => string }
  return runtime.getURL(path)
}

export function getUiLanguage(): string | undefined {
  const i18nApi = getBrowser().i18n as { getUILanguage?: () => string } | undefined
  return i18nApi?.getUILanguage?.()?.replaceAll("_", "-")
}
