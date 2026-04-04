import { useState } from "react"
import { Button } from "../../../ui/button"
import { HiOutlineArrowPath } from "react-icons/hi2"
import { sendRuntimeRequest } from "../../../../lib/shared/messages"
import type { TaskHistoryItem, TaskHistoryRecord } from "../../../../lib/history/types"

type RetryItemButtonProps = {
  record: TaskHistoryRecord
  item: TaskHistoryItem
  onRetryComplete: () => void
}

export function RetryItemButton({ record, item, onRetryComplete }: RetryItemButtonProps) {
  const [loading, setLoading] = useState(false)

  if (item.status !== "failed" || item.failure?.retryable === false) {
    return null
  }

  const handleRetry = async () => {
    setLoading(true)
    try {
      const response = await sendRuntimeRequest({
        type: "RETRY_FAILED_ITEMS",
        recordId: record.id,
        itemIds: [item.id]
      })
      if (response.ok) {
        onRetryComplete()
      } else {
        console.error("Retry failed:", response.error)
        onRetryComplete()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRetry}
      disabled={loading}
      title="重试此条目"
    >
      {loading ? (
        <span className="text-xs">重试中...</span>
      ) : (
        <>
          <HiOutlineArrowPath className="w-4 h-4 mr-1" />
          重试
        </>
      )}
    </Button>
  )
}
