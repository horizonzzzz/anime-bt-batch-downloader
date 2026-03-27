import type { SyntheticEvent } from "react"

import { ContentCheckbox } from "./content-ui/checkbox"

type SelectionCheckboxProps = {
  checked: boolean
  onChange: (checked: boolean) => void
}

export function SelectionCheckbox({ checked, onChange }: SelectionCheckboxProps) {
  const stopPropagation = (event: SyntheticEvent) => {
    event.stopPropagation()
  }

  return (
    <div className="anime-bt-content-root">
      <ContentCheckbox
        checked={checked}
        label="批量"
        title="选择这条帖子进行批量下载"
        aria-label="选择这条帖子进行批量下载"
        data-anime-bt-batch-checkbox="1"
        onCheckedChange={onChange}
        containerClassName="mr-[8px]"
        containerProps={{
          onClick: stopPropagation,
          onMouseDown: stopPropagation,
          onPointerDown: stopPropagation
        }}
      />
    </div>
  )
}
