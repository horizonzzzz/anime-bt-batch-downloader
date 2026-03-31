import { HiOutlineQuestionMarkCircle } from "react-icons/hi2"

type PopupFooterProps = {
  version: string
  helpUrl: string
}

export function PopupFooter({ version, helpUrl }: PopupFooterProps) {
  return (
    <footer className="flex items-center justify-between border-t border-zinc-200 pt-3">
      <p className="text-xs text-zinc-500">v{version}</p>
      <a
        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
        href={helpUrl}
        rel="noreferrer"
        target="_blank">
        <HiOutlineQuestionMarkCircle aria-hidden="true" className="h-3.5 w-3.5" />
        <span>使用帮助</span>
      </a>
    </footer>
  )
}

