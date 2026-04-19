import * as React from "react"

import type { OptionsRouteMeta } from "../config/routes"
import { OptionsHeader } from "./OptionsHeader"

type PageShellProps = {
  activeMeta: OptionsRouteMeta
  children: React.ReactNode
}

export function PageShell({
  activeMeta,
  children
}: PageShellProps) {
  return (
    <section className="relative flex min-w-0 flex-1 flex-col lg:min-h-screen lg:self-stretch">
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8 pb-28 md:px-8 md:py-10">
          <OptionsHeader activeMeta={activeMeta} />
          {children}
        </div>
      </div>
    </section>
  )
}