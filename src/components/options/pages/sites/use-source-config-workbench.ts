import { i18n } from "../../../../lib/i18n"
import { useCallback, useEffect, useState } from "react"

import type { SourceConfig } from "../../../../lib/sources/config/types"
import type { OptionsApi } from "../../OptionsPage"

export function useSourceConfigWorkbench(api: OptionsApi) {
  const [config, setConfig] = useState<SourceConfig | null>(null)
  const [status, setStatus] = useState({
    tone: "info" as "info" | "success" | "error",
    message: i18n.t("options.status.loadingSettings")
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true

    void api.getSourceConfig()
      .then((nextConfig) => {
        if (!active) return
        setConfig(nextConfig)
        setStatus({
          tone: "success",
          message: i18n.t("options.status.settingsLoaded")
        })
      })
      .catch((error: unknown) => {
        if (!active) return
        setStatus({
          tone: "error",
          message: error instanceof Error ? error.message : i18n.t("options.status.loadFailed")
        })
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [api])

  const save = useCallback(async () => {
    if (!config) return
    setSaving(true)
    setStatus({
      tone: "info",
      message: i18n.t("options.status.savingSettings")
    })

    try {
      const saved = await api.saveSourceConfig(config)
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

  return { config, setConfig, status, loading, saving, save }
}
