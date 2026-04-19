import { i18n } from "../../../../lib/i18n"
import type { JSX } from "react"

import { Input, Label } from "../../../ui"
import { SectionHeading } from "../../form/SectionHeading"
import type { KisssubScriptConfig } from "../../../../lib/sources/config/types"

type SiteScriptFieldsSectionProps = {
  script: KisssubScriptConfig
  onScriptChange: (url: string, revision: string) => void
}

export function SiteScriptFieldsSection({
  script,
  onScriptChange
}: SiteScriptFieldsSectionProps): JSX.Element {
  return (
    <section className="grid gap-4 border-t border-zinc-100 pt-6">
      <SectionHeading
        title={i18n.t("options.sites.scriptFields.title")}
        description={i18n.t("options.sites.scriptFields.description")}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="remoteScriptUrl">{i18n.t("options.sites.scriptFields.remoteScriptUrlLabel")}</Label>
          <Input
            id="remoteScriptUrl"
            value={script.url}
            onChange={(event) => onScriptChange(event.target.value, script.revision)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="remoteScriptRevision">{i18n.t("options.sites.scriptFields.remoteScriptRevisionLabel")}</Label>
          <Input
            id="remoteScriptRevision"
            value={script.revision}
            onChange={(event) => onScriptChange(script.url, event.target.value)}
          />
        </div>
      </div>
    </section>
  )
}