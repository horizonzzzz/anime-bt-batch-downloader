import * as React from "react"

import { i18n } from "../../../lib/i18n"
import { cn } from "../../../lib/shared/cn"
import type { OptionsRouteMeta } from "../config/routes"
import { OptionsHeader } from "./OptionsHeader"
import {
  OptionsPageFooterProvider,
  type OptionsPageFooterConfig
} from "./OptionsPageFooter"

type PageShellProps = {
  activeMeta: OptionsRouteMeta
  children: React.ReactNode
}

export function PageShell({
  activeMeta,
  children
}: PageShellProps) {
  const [footer, setFooter] = React.useState<OptionsPageFooterConfig | null>(null)

  return (
    <OptionsPageFooterProvider setFooter={setFooter}>
      <section className="relative flex min-w-0 flex-1 flex-col lg:min-h-screen lg:self-stretch">
        <div className="min-h-0 flex-1 overflow-auto">
          <div
            className={cn(
              "mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8 md:px-8 md:py-10",
              footer ? "pb-40 md:pb-36" : null
            )}>
            <OptionsHeader activeMeta={activeMeta} />
            {children}
          </div>
        </div>

        {footer ? (
          <div
            data-testid="options-page-footer"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200/80 bg-white/95 shadow-[0_-18px_32px_rgba(15,23,42,0.06)] backdrop-blur lg:left-64">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-4 md:px-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-400">
                  {i18n.t("options.footer.eyebrow")}
                </p>
                <p className="text-sm font-semibold text-zinc-900">
                  {activeMeta.footerLabel}
                </p>
                {footer.description ? (
                  <p className="text-xs leading-5 text-zinc-500">{footer.description}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                {footer.actions}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </OptionsPageFooterProvider>
  )
}
