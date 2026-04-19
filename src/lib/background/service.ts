import { getDownloaderAdapter, getDownloaderMeta } from "../downloader"
import { ensureDownloaderPermission } from "../downloader/permissions"
import { getDownloaderConfig } from "../downloader/config/storage"
import { downloaderConfigSchema, type DownloaderConfig } from "../downloader/config/schema"
import type { TestDownloaderConnectionResult } from "../shared/types"

export async function testDownloaderConnection(
  overrideConfig: DownloaderConfig | null,
  options?: {
    interactivePermissionRequest?: boolean
  }
): Promise<TestDownloaderConnectionResult> {
  const config = overrideConfig
    ? downloaderConfigSchema.parse(overrideConfig)
    : downloaderConfigSchema.parse(await getDownloaderConfig())
  const interactivePermissionRequest =
    options?.interactivePermissionRequest ?? overrideConfig == null

  const adapter = getDownloaderAdapter(config.activeId)
  const meta = getDownloaderMeta(config.activeId)

  await ensureDownloaderPermission(config, {
    interactive: interactivePermissionRequest
  })

  const result = await adapter.testConnection(config)

  return {
    downloaderId: config.activeId,
    displayName: meta.displayName,
    baseUrl: result.baseUrl,
    version: result.version
  }
}