import type { OptionsApi } from "../../OptionsPage"
import { SiteManagementView } from "./SiteManagementView"

type SitesPageProps = {
  api: OptionsApi
}

export function SitesPage({ api }: SitesPageProps) {
  return <SiteManagementView api={api} />
}
