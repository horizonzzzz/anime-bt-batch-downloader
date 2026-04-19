import { i18n } from "../../../../lib/i18n"
import { useEffect, useMemo, useRef, useState } from "react"

import { Button, Card, Alert } from "../../../ui"
import type { OptionsApi } from "../../OptionsPage"
import { useSourceConfigWorkbench } from "./use-source-config-workbench"

import acgripSiteIcon from "../../../../assets/site-icon-acgrip.png"
import bangumiMoeSiteIcon from "../../../../assets/site-icon-bangumimoe.svg"
import dongmanhuayuanSiteIcon from "../../../../assets/site-icon-dongmanhuayuan.png"
import kisssubSiteIcon from "../../../../assets/site-icon-kisssub.png"
import { SOURCE_IDS } from "../../../../lib/sources/catalog"
import { getLocalizedSiteConfigMeta } from "../../../../lib/sources/site-meta"
import type { DeliveryMode, SourceId } from "../../../../lib/shared/types"
import type { SourceConfig } from "../../../../lib/sources/config/types"
import { SiteCard } from "./SiteCard"
import {
  buildSortedSitesFromConfig,
  countEnabledSitesFromConfig,
  getInitialExpandedSitesFromConfig,
  reconcileExpandedSitesFromConfig
} from "./site-management"

const SITE_ICONS: Record<SourceId, string> = {
  kisssub: kisssubSiteIcon,
  dongmanhuayuan: dongmanhuayuanSiteIcon,
  acgrip: acgripSiteIcon,
  bangumimoe: bangumiMoeSiteIcon
}

type SiteManagementViewProps = {
  api: OptionsApi
}

export function SiteManagementView({ api }: SiteManagementViewProps) {
  const { config, setConfig, status, loading, saving, save } = useSourceConfigWorkbench(api)
  const [expandedSites, setExpandedSites] = useState<SourceId[]>([])
  const hasSyncedExpandedSites = useRef(false)
  const previousConfigRef = useRef<SourceConfig | null>(null)

  // Sync expanded sites when config loads
  useEffect(() => {
    if (!config || hasSyncedExpandedSites.current) return
    setExpandedSites(getInitialExpandedSitesFromConfig(config))
    hasSyncedExpandedSites.current = true
    previousConfigRef.current = config
  }, [config])

  // Reconcile expanded sites when config changes
  useEffect(() => {
    if (!config || !previousConfigRef.current) return
    setExpandedSites((currentExpandedSites) =>
      reconcileExpandedSitesFromConfig({
        currentExpandedSites,
        previousConfig: previousConfigRef.current!,
        nextConfig: config
      })
    )
    previousConfigRef.current = config
  }, [config])

  const sortedSites = useMemo(() => {
    if (!config) return []
    return buildSortedSitesFromConfig(config)
  }, [config])

  const enabledCount = useMemo(() => {
    if (!config) return 0
    return countEnabledSitesFromConfig(config)
  }, [config])

  const toggleSiteExpanded = (sourceId: SourceId) => {
    if (!config || !config[sourceId].enabled) return
    setExpandedSites((currentExpandedSites) =>
      currentExpandedSites.includes(sourceId)
        ? currentExpandedSites.filter((currentId) => currentId !== sourceId)
        : [...currentExpandedSites, sourceId]
    )
  }

  const toggleEnabled = (sourceId: SourceId, enabled: boolean) => {
    if (!config) return
    setConfig((current) => {
      if (!current) return current
      return {
        ...current,
        [sourceId]: {
          ...current[sourceId],
          enabled
        }
      }
    })
  }

  const updateDeliveryMode = (sourceId: SourceId, deliveryMode: DeliveryMode) => {
    if (!config) return
    setConfig((current) => {
      if (!current) return current
      return {
        ...current,
        [sourceId]: {
          ...current[sourceId],
          deliveryMode
        }
      }
    })
  }

  const updateKisssubScript = (url: string, revision: string) => {
    if (!config) return
    setConfig((current) => {
      if (!current) return current
      return {
        ...current,
        kisssub: {
          ...current.kisssub,
          script: { url, revision }
        }
      }
    })
  }

  if (!config) {
    return (
      <div className="space-y-8" data-testid="sites-workbench">
        <div role="status" aria-live="polite">
          <Alert tone={status.tone} title={status.message} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8" data-testid="sites-workbench">
      <div role="status" aria-live="polite">
        <Alert tone={status.tone} title={status.message} />
      </div>

      <Card>
        <div className="flex flex-col gap-5 px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-3 text-sm text-zinc-600">
              <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2">
                {i18n.t("options.sites.enabledSummary", [enabledCount, SOURCE_IDS.length])}
              </div>
            </div>

            <Button
              type="button"
              onClick={() => void save()}
              disabled={loading || saving}>
              {saving ? i18n.t("common.processing") : i18n.t("options.sites.saveSites")}
            </Button>
          </div>
        </div>
      </Card>

      <section className="space-y-4">
        <div className="grid gap-4">
          {sortedSites.map((site) => {
            const localizedSite = getLocalizedSiteConfigMeta(site.id)
            const siteConfig = config[site.id]
            const isEnabled = siteConfig.enabled
            const isExpanded = isEnabled && expandedSites.includes(site.id)
            const currentMode = siteConfig.deliveryMode

            return (
              <SiteCard
                key={site.id}
                site={localizedSite}
                siteIcon={SITE_ICONS[site.id]}
                isEnabled={isEnabled}
                isExpanded={isExpanded}
                currentMode={currentMode}
                kisssubScript={site.id === "kisssub" ? config.kisssub.script : undefined}
                onToggleExpanded={toggleSiteExpanded}
                onToggleEnabled={toggleEnabled}
                onDeliveryModeChange={updateDeliveryMode}
                onKisssubScriptChange={updateKisssubScript}
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}