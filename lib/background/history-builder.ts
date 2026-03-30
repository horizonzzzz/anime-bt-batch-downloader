import {
  createHistoryItemId,
  createHistoryRecordId,
  saveTaskHistory
} from "../history/storage"
import { HISTORY_RECORD_VERSION, type TaskHistoryRecord } from "../history/types"
import type { SourceId } from "../shared/types"
import { SITE_CONFIG_META } from "../sources/site-meta"
import type { BatchJob } from "./types"

function classifyFailureReason(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes("timeout") || lower.includes("超时")) return "timeout"
  if (lower.includes("parse") || lower.includes("解析")) return "parse_error"
  if (lower.includes("qb") || lower.includes("qbittorrent") || lower.includes("403")) return "qb_error"
  if (lower.includes("network") || lower.includes("网络") || lower.includes("fetch")) return "network_error"
  return "unknown"
}

function mapItemStatus(
  status: string
): "success" | "duplicate" | "filtered" | "failed" {
  if (status === "submitted") return "success"
  if (status === "duplicate") return "duplicate"
  if (status === "filtered") return "filtered"
  return "failed"
}

function buildHistoryItems(
  results: BatchJob["results"],
  recordId: string,
  sourceId: SourceId
): TaskHistoryRecord["items"] {
  return results.map((result, index) => ({
    id: createHistoryItemId(recordId, index),
    title: result.title,
    detailUrl: result.detailUrl,
    sourceId,
    message: result.message,
    magnetUrl: result.magnetUrl,
    torrentUrl: result.torrentUrl,
    hash: result.hash,
      status: mapItemStatus(result.status),
      failure: result.status === "failed" ? {
        reason: classifyFailureReason(result.message) as "parse_error" | "timeout" | "qb_error" | "network_error" | "unknown",
      message: result.message,
      retryable: true,
      retryCount: 0
    } : undefined,
    deliveryMode: result.deliveryMode || "magnet"
  }))
}

export function buildHistoryRecord(
  job: BatchJob,
  sourceId: SourceId
): TaskHistoryRecord {
  const siteName = SITE_CONFIG_META[sourceId]?.displayName ?? sourceId
  const dateStr = new Date().toISOString().split("T")[0]
  const recordId = createHistoryRecordId()
  const items = buildHistoryItems(job.results, recordId, sourceId)

  return {
    id: recordId,
    name: `${siteName} 批量提取 (${dateStr})`,
    sourceId,
    status: job.stats.failed > 0 ? "partial_failure" : "completed",
    createdAt: new Date().toISOString(),
    stats: {
      total: job.stats.total,
      success: job.stats.submitted,
      duplicated: job.stats.duplicated,
      filtered: job.stats.filtered,
      failed: job.stats.failed
    },
    items,
    savePath: job.savePath || undefined,
    version: HISTORY_RECORD_VERSION
  }
}

export function persistBatchHistory(
  job: BatchJob,
  sourceId: SourceId
): void {
  const record = buildHistoryRecord(job, sourceId)
  saveTaskHistory(record).catch((err) =>
    console.warn("Failed to save task history:", err)
  )
}
