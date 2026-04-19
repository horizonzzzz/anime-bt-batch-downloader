import type { DownloaderId } from "../../shared/types"
import { z } from "zod"

import {
  downloaderConfigSchema,
  downloaderProfileSchema
} from "./schema"

export type DownloaderProfile = z.infer<typeof downloaderProfileSchema>
export type DownloaderConfig = z.infer<typeof downloaderConfigSchema>

// Re-export DownloaderId for convenience
export type { DownloaderId }