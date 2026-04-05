import { getDefaultDownloaderAdapter } from "../downloader"
import { getSettings, sanitizeSettings } from "../settings"
import type { Settings, TestQbConnectionResult } from "../shared/types"

export async function testQbConnection(
  overrideSettings: Partial<Settings> | null
): Promise<TestQbConnectionResult> {
  const settings = sanitizeSettings({
    ...(await getSettings()),
    ...(overrideSettings ?? {})
  })

  const result = await getDefaultDownloaderAdapter().testConnection(settings)

  return {
    baseUrl: result.baseUrl,
    version: result.version
  }
}
