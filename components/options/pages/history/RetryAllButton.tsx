import { useState } from "react"
import { Button } from "../../../ui/button"
import { ConfirmationDialog } from "../../ui/confirmation-dialog"
import { HiOutlineArrowPath } from "react-icons/hi2"
import { sendRuntimeRequest } from "../../../../lib/shared/messages"
import type { TaskHistoryRecord } from "../../../../lib/history/types"

type RetryAllButtonProps = {
  record: TaskHistoryRecord
  onRetryComplete: () => void
}

export function RetryAllButton({ record, onRetryComplete }: RetryAllButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const failedCount = record.items.filter(i => i.status === "failed").length

  if (failedCount === 0) {
    return null
  }

  const handleRetry = async () => {
    setLoading(true)
    try {
      const response = await sendRuntimeRequest({
        type: "RETRY_FAILED_ITEMS",
        recordId: record.id
      })
      if (response.ok) {
        onRetryComplete()
      } else {
        console.error("Retry failed:", response.error)
        onRetryComplete()
      }
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
      >
        <HiOutlineArrowPath className="w-4 h-4 mr-1" />
        重试全部失败项
      </Button>

      <ConfirmationDialog
        open={showConfirm}
        title="重试失败条目"
        description={`确定重试 ${failedCount} 个失败条目吗？`}
        confirmLabel="重试"
        onConfirm={handleRetry}
        onCancel={() => setShowConfirm(false)}
        loading={loading}
      />
    </>
  )
}