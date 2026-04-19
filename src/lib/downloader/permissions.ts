import { getDownloaderMeta } from "./registry"
import { i18n } from "../i18n"
import { getBrowser } from "../shared/browser"
import type { DownloaderConfig } from "./config/types"

type PermissionsApi = {
  contains: (permissions: { origins: string[] }) => Promise<boolean>
  request: (permissions: { origins: string[] }) => Promise<boolean>
}

function getCurrentDownloaderBaseUrl(config: DownloaderConfig): string {
  return config.activeId === "transmission"
    ? config.profiles.transmission.baseUrl
    : config.profiles.qbittorrent.baseUrl
}

function getPermissionErrorMessage(
  config: DownloaderConfig,
  translationKey: "required" | "denied"
): string {
  const downloaderName = getDownloaderMeta(config.activeId).displayName
  const baseUrl = getCurrentDownloaderBaseUrl(config)

  return i18n.t(`downloader.permissions.${translationKey}`, [downloaderName, baseUrl])
}

export function getDownloaderPermissionOrigins(config: DownloaderConfig): string[] {
  const baseUrl = getCurrentDownloaderBaseUrl(config)

  let parsedUrl: URL
  try {
    parsedUrl = new URL(baseUrl)
  } catch {
    throw new Error(i18n.t("downloader.permissions.invalidUrl", [baseUrl]))
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(i18n.t("downloader.permissions.invalidUrl", [baseUrl]))
  }

  return [`${parsedUrl.protocol}//${parsedUrl.hostname}/*`]
}

export async function ensureDownloaderPermission(
  config: DownloaderConfig,
  options?: {
    interactive?: boolean
    permissionsApi?: PermissionsApi
  }
): Promise<void> {
  const permissionsApi = options?.permissionsApi ?? (getBrowser().permissions as PermissionsApi)
  const origins = getDownloaderPermissionOrigins(config)

  if (await permissionsApi.contains({ origins })) {
    return
  }

  if (options?.interactive) {
    if (await permissionsApi.request({ origins })) {
      return
    }

    throw new Error(getPermissionErrorMessage(config, "denied"))
  }

  throw new Error(getPermissionErrorMessage(config, "required"))
}

export async function requestDownloaderPermission(
  config: DownloaderConfig,
  permissionsApi?: PermissionsApi
): Promise<void> {
  await ensureDownloaderPermission(config, {
    interactive: true,
    permissionsApi
  })
}
