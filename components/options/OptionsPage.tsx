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

function OptionsWorkspace({ api }: OptionsPageProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const activeMeta = useMemo(
    () => getOptionsRouteMeta(location.pathname),
    [location.pathname]
  )
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

  const isFormMode = activeMeta.mode === "form"

  const shellProps = isFormMode
    ? {
        activeMeta,
        status,
        saving,
        onSubmit: handleSave
      }
    : {
        activeMeta
      }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 lg:flex lg:items-start">
      <OptionsSidebar
        routes={OPTIONS_ROUTES}
        activePath={activeMeta.path}
        onNavigate={navigate}
      />

      {isFormMode ? (
        <FormProvider {...form}>
          <PageShell {...shellProps}>
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
      ) : (
        <PageShell {...shellProps}>
          <Routes>
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="*" element={<Navigate to={DEFAULT_OPTIONS_ROUTE} replace />} />
          </Routes>
        </PageShell>
      )}
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
