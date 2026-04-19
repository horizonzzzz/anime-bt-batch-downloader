import { i18n } from "../../../../lib/i18n"
import type { JSX } from "react"

import { HiOutlineArrowPath } from "react-icons/hi2"

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input
} from "../../../ui"
import { FormField } from "../../form/Field"
import type { DownloaderProfile } from "../../../../lib/downloader/config/types"

export type ConnectionState = "idle" | "success" | "error"

type QbCredentialsSectionProps = {
  config: DownloaderProfile
  onConfigChange: (config: DownloaderProfile) => void
  connectionMessage: string
  connectionState: ConnectionState
  testing: boolean
  onTestConnection: () => Promise<void>
}

function getConnectionStatusClassName(
  connectionState: ConnectionState
): string {
  if (connectionState === "success") {
    return "inline-flex items-center text-sm font-medium text-emerald-600"
  }

  return "inline-flex items-center text-sm font-medium text-red-600"
}

export function QbCredentialsSection({
  config,
  onConfigChange,
  connectionMessage,
  connectionState,
  testing,
  onTestConnection
}: QbCredentialsSectionProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{i18n.t("options.general.qb.title")}</CardTitle>
        <CardDescription>
          {i18n.t("options.general.qb.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <FormField
              label={i18n.t("options.general.qb.baseUrlLabel")}
              htmlFor="qbittorrent.baseUrl"
              required>
              <Input
                id="qbittorrent.baseUrl"
                placeholder="http://127.0.0.1:17474"
                autoComplete="url"
                value={config.baseUrl}
                onChange={(e) => onConfigChange({
                  ...config,
                  baseUrl: e.target.value
                })}
              />
            </FormField>
          </div>

          <FormField
            label={i18n.t("options.general.common.usernameLabel")}
            htmlFor="qbittorrent.username">
            <Input
              id="qbittorrent.username"
              placeholder="admin"
              autoComplete="username"
              value={config.username}
              onChange={(e) => onConfigChange({
                ...config,
                username: e.target.value
              })}
            />
          </FormField>

          <FormField
            label={i18n.t("options.general.common.passwordLabel")}
            htmlFor="qbittorrent.password">
            <Input
              id="qbittorrent.password"
              type="password"
              placeholder={i18n.t("options.general.qb.passwordPlaceholder")}
              autoComplete="current-password"
              value={config.password}
              onChange={(e) => onConfigChange({
                ...config,
                password: e.target.value
              })}
            />
          </FormField>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            aria-label={i18n.t("options.general.common.testConnection")}
            onClick={() => void onTestConnection()}
            disabled={testing}>
            {testing ? (
              <HiOutlineArrowPath className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            <span>
              {testing
                ? i18n.t("options.general.common.testingConnection")
                : i18n.t("options.general.common.testConnection")}
            </span>
          </Button>

          {connectionState !== "idle" ? (
            <span className={getConnectionStatusClassName(connectionState)}>
              {connectionState === "success"
                ? i18n.t("options.general.common.connectionSuccess")
                : i18n.t("options.general.common.connectionFailed")}
              {connectionMessage ? ` · ${connectionMessage}` : ""}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}