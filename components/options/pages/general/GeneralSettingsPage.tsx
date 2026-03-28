import { useState } from "react"

import type { ConnectionState } from "../../hooks/use-settings-form"
import { ConnectionHelpAlert } from "./ConnectionHelpAlert"
import { ExtractionCadenceSection } from "./ExtractionCadenceSection"
import { QbCredentialsSection } from "./QbCredentialsSection"

type GeneralSettingsPageProps = {
  connectionMessage: string
  connectionState: ConnectionState
  testing: boolean
  onTestConnection: () => Promise<void>
}

export function GeneralSettingsPage({
  connectionMessage,
  connectionState,
  testing,
  onTestConnection
}: GeneralSettingsPageProps) {
  const [advancedOpen, setAdvancedOpen] = useState(true)

  return (
    <div className="space-y-6">
      <ConnectionHelpAlert />
      <QbCredentialsSection
        connectionMessage={connectionMessage}
        connectionState={connectionState}
        testing={testing}
        onTestConnection={onTestConnection}
      />
      <ExtractionCadenceSection
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
      />
    </div>
  )
}
