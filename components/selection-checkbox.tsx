type SelectionCheckboxProps = {
  checked: boolean
  onChange: (checked: boolean) => void
}

export function SelectionCheckbox({ checked, onChange }: SelectionCheckboxProps) {
  return (
    <label className="kisssub-batch-checkbox" title="选择这条帖子进行批量下载">
      <input
        type="checkbox"
        data-kisssub-batch-checkbox="1"
        aria-label="选择这条帖子进行批量下载"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span className="kisssub-batch-checkbox__dot" aria-hidden="true" />
      <span>批量</span>
    </label>
  )
}
