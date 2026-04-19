import { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { ReactNode } from "react"

import { i18n } from "../../../../lib/i18n"
import type { DownloaderConfig } from "../../../../lib/downloader/config/types"
import type { OptionsApi } from "../../OptionsPage"

type DownloaderWorkbenchState = {
  config: DownloaderConfig
  status: {
    tone: "info" | "success" | "warning" | "error"
    message: string
  }
  loading: boolean
  saving: boolean
}

type DownloaderWorkbenchActions = {
  setConfig: (config: DownloaderConfig) => void
  save: () => Promise<void>
}

type DownloaderWorkbenchContextValue = DownloaderWorkbenchState & DownloaderWorkbenchActions

const DownloaderWorkbenchContext = createContext<DownloaderWorkbenchContextValue | null>(null)

export function useDownloaderWorkbench(): DownloaderWorkbenchContextValue {
  const context = useContext(DownloaderWorkbenchContext)
  if (!context) {
    throw new Error("useDownloaderWorkbench must be used within DownloaderWorkbenchProvider")
  }
  return context
}

const DEFAULT_CONFIG: DownloaderConfig = {
  activeId: "qbittorrent",
  profiles: {
    qbittorrent: {
      baseUrl: "",
      username: "",
      password: ""
    },
    transmission: {
      baseUrl: "",
      username: "",
      password: ""
    }
  }
}

export function DownloaderWorkbenchProvider({
  api,
  children
}: {
  api: OptionsApi
  children: ReactNode
}) {
  const [config, setConfig] = useState<DownloaderConfig>(DEFAULT_CONFIG)
  const [status, setStatus] = useState<{
    tone: "info" | "success" | "warning" | "error"
    message: string
  }>({
    tone: "info",
    message: i18n.t("options.status.loadingSettings")
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded) return // Only load once

    let active = true

    void api.getDownloaderConfig()
      .then((nextConfig) => {
        if (!active) return
        setConfig(nextConfig)
        setLoading(false)
        setLoaded(true)
        setStatus({
          tone: "success",
          message: i18n.t("options.status.settingsLoaded")
        })
      })
      .catch((error: unknown) => {
        if (!active) return
        setLoading(false)
        setLoaded(true)
        setStatus({
          tone: "error",
          message: error instanceof Error ? error.message : i18n.t("options.status.loadFailed")
        })
      })

    return () => {
      active = false
    }
  }, [api, loaded])

  const save = useCallback(async () => {
    setSaving(true)
    setStatus({
      tone: "info",
      message: i18n.t("options.status.savingSettings")
    })
    try {
      const saved = await api.saveDownloaderConfig(config)
      setConfig(saved)
      setStatus({
        tone: "success",
        message: i18n.t("options.status.settingsSaved")
      })
    } catch (error: unknown) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : i18n.t("options.status.saveFailed")
      })
    } finally {
      setSaving(false)
    }
  }, [api, config])

  const value: DownloaderWorkbenchContextValue = {
    config,
    status,
    loading,
    saving,
    setConfig,
    save
  }

  return (
    <DownloaderWorkbenchContext.Provider value={value}>
      {children}
    </DownloaderWorkbenchContext.Provider>
  )
}