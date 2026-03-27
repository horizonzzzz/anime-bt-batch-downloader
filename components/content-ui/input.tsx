import * as React from "react"

import { cn } from "../../lib/utils"

export type ContentInputProps = React.InputHTMLAttributes<HTMLInputElement>

const ContentInput = React.forwardRef<HTMLInputElement, ContentInputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "min-h-[var(--anime-bt-control-height)] min-w-0 w-full rounded-[var(--anime-bt-radius-control)] border px-[12px] text-[13px] leading-[1.45] outline-none transition-[border-color,box-shadow,background-color,color,opacity] duration-150 ease-out focus-visible:ring-[3px] focus-visible:ring-blue-500/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-70",
          className
        )}
        {...props}
      />
    )
  }
)

ContentInput.displayName = "ContentInput"

export { ContentInput }
