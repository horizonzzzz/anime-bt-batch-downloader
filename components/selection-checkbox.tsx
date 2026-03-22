type SelectionCheckboxProps = {
  checked: boolean
  onChange: (checked: boolean) => void
}

export function SelectionCheckbox({ checked, onChange }: SelectionCheckboxProps) {
  return (
    <label className="kisssub-batch-checkbox" title="Select this post for batch download">
      <input
        type="checkbox"
        data-kisssub-batch-checkbox="1"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span>批量</span>
    </label>
  )
}
