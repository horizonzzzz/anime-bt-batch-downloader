import { z } from "zod"
import { batchExecutionConfigSchema } from "./schema"

export type BatchExecutionConfig = z.infer<typeof batchExecutionConfigSchema>