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
    <aside className="kisssub-batch-panel" aria-label="Kisssub 批量下载面板">
      <div className="kisssub-batch-panel__header">
        <div>
          <p className="kisssub-batch-panel__eyebrow">Kisssub Batch Downloader</p>
          <strong>Kisssub 批量下载</strong>
        </div>
        <span className="kisssub-batch-panel__badge">{running ? "RUNNING" : "READY"}</span>
      </div>

      <div className="kisssub-batch-panel__stats">
        <div className="kisssub-batch-panel__stat-card">
          <span>已选项目</span>
          <strong>已选 {selectedCount} 项</strong>
        </div>
        <div className="kisssub-batch-panel__stat-card">
          <span>处理进度</span>
          <strong>{progressText}</strong>
        </div>
      </div>

      <section className="kisssub-batch-panel__status-card">
        <div className="kisssub-batch-panel__section-head">
          <strong>任务状态</strong>
          <span>{running ? "处理中" : "待命"}</span>
        </div>
        <p className="kisssub-batch-panel__status">{statusText}</p>
      </section>

      <div className="kisssub-batch-panel__actions kisssub-batch-panel__actions--primary">
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

      <div className="kisssub-batch-panel__actions kisssub-batch-panel__actions--secondary">
        <button type="button" onClick={onOpenSettings}>
          设置
        </button>
      </div>

      <section className="kisssub-batch-panel__log-section">
        <div className="kisssub-batch-panel__section-head">
          <strong>最近结果</strong>
          <span>{logs.length ? `最新 ${logs.length} 条` : "等待任务输出"}</span>
        </div>
        {logs.length ? (
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
        ) : (
          <p className="kisssub-batch-panel__empty">结果会显示在这里。</p>
        )}
      </section>
    </aside>
  )
}
