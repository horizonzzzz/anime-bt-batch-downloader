import { useState } from "react"
import { Button } from "../../../ui/button"
import { ConfirmationDialog } from "../../ui/confirmation-dialog"
import { HiOutlineTrash } from "react-icons/hi2"
import { sendRuntimeRequest } from "../../../../lib/shared/messages"

type ClearHistoryButtonProps = {
  onCleared: () => void
  disabled?: boolean
}

export function ClearHistoryButton({ onCleared, disabled = false }: ClearHistoryButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleClear = async () => {
    setLoading(true)
    try {
      const response = await sendRuntimeRequest({
        type: "CLEAR_HISTORY"
      })
      if (response.ok) {
        onCleared()
      } else {
        console.error("Failed to clear history:", response.error)
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
        disabled={disabled}
        className="text-red-600 border-red-300 hover:bg-red-50"
      >
        <HiOutlineTrash className="w-4 h-4 mr-1" />
        清空历史
      </Button>

      <ConfirmationDialog
        open={showConfirm}
        title="清空全部历史"
        description="确定清空所有历史记录吗？此操作不可恢复。"
        confirmLabel="清空全部"
        onConfirm={handleClear}
        onCancel={() => setShowConfirm(false)}
        loading={loading}
      />
    </>
  )
}