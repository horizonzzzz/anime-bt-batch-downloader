import { useState } from "react"
import { Button } from "../../../ui/button"
import { ConfirmationDialog } from "../../ui/confirmation-dialog"
import { HiOutlineTrash } from "react-icons/hi2"
import { sendRuntimeRequest } from "../../../../lib/shared/messages"

type DeleteRecordButtonProps = {
  recordId: string
  recordName: string
  onDeleted: () => void
  variant?: "icon" | "button"
}

export function DeleteRecordButton({
  recordId,
  recordName,
  onDeleted,
  variant = "icon"
}: DeleteRecordButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      const response = await sendRuntimeRequest({
        type: "DELETE_HISTORY_RECORD",
        recordId
      })
      if (response.ok) {
        onDeleted()
      } else {
        console.error("Failed to delete record:", response.error)
      }
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      {variant === "icon" ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConfirm(true)}
          className="text-zinc-400 hover:text-red-600"
          title="删除记录"
        >
          <HiOutlineTrash className="w-4 h-4" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirm(true)}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          <HiOutlineTrash className="w-4 h-4 mr-1" />
          删除记录
        </Button>
      )}

      <ConfirmationDialog
        open={showConfirm}
        title="删除历史记录"
        description={`确定删除"${recordName}"吗？此操作不可恢复。`}
        confirmLabel="删除"
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
        loading={loading}
      />
    </>
  )
}