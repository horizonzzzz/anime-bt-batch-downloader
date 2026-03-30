import { useMemo } from "react"

import { FormProvider } from "react-hook-form"
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate
} from "react-router-dom"

import type { Settings, TestQbConnectionResult } from "../../lib/shared/types"
import {
  DEFAULT_OPTIONS_ROUTE,
  OPTIONS_ROUTES,
  getOptionsRouteMeta
} from "./config/routes"
import { useSettingsForm } from "./hooks/use-settings-form"
import { PageShell } from "./layout/PageShell"
import { OptionsSidebar } from "./layout/OptionsSidebar"
import { GeneralSettingsPage } from "./pages/general/GeneralSettingsPage"
import { HistoryPage } from "./pages/history/HistoryPage"
import { OverviewPage } from "./pages/overview/OverviewPage"
import { SitesPage } from "./pages/sites/SitesPage"

export type OptionsApi = {
  loadSettings: () => Promise<Settings>
  saveSettings: (settings: Settings) => Promise<Settings>
  testConnection: (settings: Settings) => Promise<TestQbConnectionResult>
}

type OptionsPageProps = {
  api: OptionsApi
}

type RouteShellProps = {
  api: OptionsApi
  activeMeta: ReturnType<typeof getOptionsRouteMeta>
}

function FormRouteShell({ api, activeMeta }: RouteShellProps) {
  const {
    form,
    status,
    connectionState,
    connectionMessage,
    saving,
    testing,
    handleSave,
    handleTestConnection
  } = useSettingsForm(api)

  return (
    <FormProvider {...form}>
      <PageShell activeMeta={activeMeta} status={status} saving={saving} onSubmit={handleSave}>
        <Routes>
          <Route path="/" element={<Navigate to={DEFAULT_OPTIONS_ROUTE} replace />} />
          <Route
            path="/general"
            element={
              <GeneralSettingsPage
                connectionMessage={connectionMessage}
                connectionState={connectionState}
                testing={testing}
                onTestConnection={handleTestConnection}
              />
            }
          />
          <Route path="/sites" element={<SitesPage />} />
          <Route path="*" element={<Navigate to={DEFAULT_OPTIONS_ROUTE} replace />} />
        </Routes>
      </PageShell>
    </FormProvider>
  )
}

function ViewRouteShell({ activeMeta }: RouteShellProps) {
  return (
    <PageShell activeMeta={activeMeta}>
      <Routes>
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="*" element={<Navigate to={DEFAULT_OPTIONS_ROUTE} replace />} />
      </Routes>
    </PageShell>
  )
}

function OptionsWorkspace({ api }: OptionsPageProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const activeMeta = useMemo(
    () => getOptionsRouteMeta(location.pathname),
    [location.pathname]
  )

  const RouteShell = activeMeta.mode === "form" ? FormRouteShell : ViewRouteShell

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 lg:flex lg:items-start">
      <OptionsSidebar
        routes={OPTIONS_ROUTES}
        activePath={activeMeta.path}
        onNavigate={navigate}
      />
      <RouteShell api={api} activeMeta={activeMeta} />
    </div>
  )
}

export function OptionsPage({ api }: OptionsPageProps) {
  return (
    <HashRouter>
      <OptionsWorkspace api={api} />
    </HashRouter>
  )
}