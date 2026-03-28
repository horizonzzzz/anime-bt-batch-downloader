export type BatchPanelProps = {
  sourceName?: string
  isExpanded: boolean
  selectedCount: number
  running: boolean
  statusText: string
  savePath: string
  savePathHint?: string
  onToggleExpanded: (expanded: boolean) => void
  onSelectAll: () => void
  onClear: () => void
  onSavePathChange: (value: string) => void
  onClearSavePath: () => void
  onDownload: () => void
  onOpenSettings: () => void
}
