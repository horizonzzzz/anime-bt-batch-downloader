import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const contentButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center border outline-none transition-[transform,background-color,border-color,box-shadow,color,opacity] duration-150 ease-out focus-visible:ring-[3px] focus-visible:ring-blue-500/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none",
  {
    variants: {
      variant: {
        control:
          "min-h-[var(--anime-bt-control-height)] gap-2 rounded-[var(--anime-bt-radius-control)] px-[var(--anime-bt-control-padding-x)] text-[12px] font-semibold leading-none",
        primary:
          "min-h-[var(--anime-bt-control-height)] gap-2 rounded-[var(--anime-bt-radius-control)] px-[16px] text-[12px] font-semibold leading-none",
        icon:
          "h-[var(--anime-bt-icon-button-size)] w-[var(--anime-bt-icon-button-size)] rounded-[var(--anime-bt-radius-icon)] p-0",
        toggle:
          "w-full justify-between gap-[8px] border-transparent px-[14px] py-[12px] text-[12px] font-semibold leading-none uppercase tracking-[0.08em]",
        launcher:
          "gap-[10px] rounded-[var(--anime-bt-radius-pill)] px-[16px] py-[12px] text-[13px] font-semibold leading-none"
      }
    },
    defaultVariants: {
      variant: "control"
    }
  }
)

export interface ContentButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof contentButtonVariants> {
  asChild?: boolean
}

const ContentButton = React.forwardRef<HTMLButtonElement, ContentButtonProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(contentButtonVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)

ContentButton.displayName = "ContentButton"

export { ContentButton, contentButtonVariants }
