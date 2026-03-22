import type { BatchLogItem } from "../lib/types"

type BatchPanelProps = {
  selectedCount: number
  running: boolean
  progressText: string
  statusText: string
  logs: BatchLogItem[]
  onSelectAll: () => void
  onClear: () => void
  onDownload: () => void
  onOpenSettings: () => void
}

export function BatchPanel({
  selectedCount,
  running,
  progressText,
  statusText,
  logs,
  onSelectAll,
  onClear,
  onDownload,
  onOpenSettings
}: BatchPanelProps) {
  const disableSelectionActions = running || selectedCount === 0

  return (
    <aside className="kisssub-batch-panel">
      <div className="kisssub-batch-panel__header">
        <strong>Kisssub 批量下载</strong>
        <span className="kisssub-batch-panel__badge">PLASMO</span>
      </div>
      <p className="kisssub-batch-panel__meta">已选 {selectedCount} 项</p>
      <p className="kisssub-batch-panel__meta">{progressText}</p>
      <div className="kisssub-batch-panel__actions">
        <button type="button" onClick={onSelectAll} disabled={running}>
          全选本页
        </button>
        <button type="button" onClick={onClear} disabled={disableSelectionActions}>
          清空
        </button>
        <button
          type="button"
          className="primary"
          onClick={onDownload}
          disabled={disableSelectionActions}>
          批量下载
        </button>
      </div>
      <div className="kisssub-batch-panel__actions">
        <button type="button" onClick={onOpenSettings}>
          设置
        </button>
      </div>
      <p className="kisssub-batch-panel__status">{statusText}</p>
      <ul className="kisssub-batch-panel__log">
        {logs.map((log) => (
          <li
            key={`${log.detailUrl ?? log.title}-${log.status}-${log.message}`}
            className={`kisssub-batch-panel__log-item is-${log.status}`}>
            <strong>{log.title}</strong>
            <span>{log.status}</span>
            <p>{log.message}</p>
          </li>
        ))}
      </ul>
    </aside>
  )
}
