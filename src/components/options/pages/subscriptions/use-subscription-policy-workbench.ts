import { i18n } from "../../../../lib/i18n"
import { DEFAULT_SUBSCRIPTION_POLICY_CONFIG } from "../../../../lib/subscriptions/policy/defaults"
import { normalizeSubscriptionPollingInterval } from "../../../../lib/subscriptions/policy/index"
import type { SubscriptionPolicyConfig } from "../../../../lib/subscriptions/policy/types"
import { useCallback, useEffect, useState } from "react"

import type { OptionsApi } from "../../OptionsPage"

export type SubscriptionPolicyWorkbenchStatus = {
  tone: "info" | "success" | "error"
  message: string
}

export function useSubscriptionPolicyWorkbench(api: OptionsApi) {
  const [policy, setPolicy] = useState<SubscriptionPolicyConfig>(DEFAULT_SUBSCRIPTION_POLICY_CONFIG)
  const [status, setStatus] = useState<SubscriptionPolicyWorkbenchStatus>({
    tone: "info",
    message: i18n.t("options.status.loadingSettings")
  })
  const [loading, setLoading] = useState(true)
  const [policyReady, setPolicyReady] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true

    void api
      .getSubscriptionPolicy()
      .then((loaded) => {
        if (!active) {
          return
        }

        setPolicy(loaded)
        setPolicyReady(true)
        setStatus({
          tone: "success",
          message: i18n.t("options.status.settingsLoaded")
        })
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }

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

  const savePolicy = useCallback(async (nextPolicy: SubscriptionPolicyConfig = policy) => {
    if (!policyReady) {
      return
    }

    const normalizedPolicy = {
      ...nextPolicy,
      pollingIntervalMinutes: normalizeSubscriptionPollingInterval(
        nextPolicy.pollingIntervalMinutes
      )
    }

    setSaving(true)
    setStatus({
      tone: "info",
      message: i18n.t("options.status.savingSettings")
    })

    try {
      const saved = await api.saveSubscriptionPolicy(normalizedPolicy)
      setPolicy(saved)
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
  }, [api, policy, policyReady])

  return {
    policy,
    setPolicy,
    status,
    loading,
    policyReady,
    saving,
    savePolicy
  }
}
