import { i18n } from "../../../../lib/i18n"
import { useMemo, useState } from "react"

import { useFormContext, useWatch } from "react-hook-form"
import { HiOutlinePlus } from "react-icons/hi2"

import { duplicateSubscription } from "../../../../lib/subscriptions/storage"
import type { Settings, SubscriptionEntry } from "../../../../lib/shared/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card
} from "../../../ui"
import {
  type SettingsFormInput,
  type SettingsFormValues
} from "../../schema/settings-form"
import { SubscriptionCard } from "./SubscriptionCard"
import { SubscriptionEditorDialog } from "./SubscriptionEditorDialog"
import { SubscriptionsGlobalCard } from "./SubscriptionsGlobalCard"
import {
  countRecentHits,
  countSubscriptionsWithRecentErrors,
  countSubscriptionsWithScans,
  createSubscriptionDraft,
  type SubscriptionWorkbenchDraft
} from "./subscription-workbench"

export type SubscriptionsRuntimeSnapshot = Pick<
  Settings,
  "lastSchedulerRunAt" | "subscriptionRuntimeStateById" | "subscriptionNotificationRounds"
>

type SubscriptionsPageProps = {
  runtimeSnapshot?: SubscriptionsRuntimeSnapshot | null
}

export function SubscriptionsPage({ runtimeSnapshot = null }: SubscriptionsPageProps) {
  const form = useFormContext<SettingsFormInput, unknown, SettingsFormValues>()
  const subscriptions =
    useWatch({
      control: form.control,
      name: "subscriptions"
    }) ?? []
  const subscriptionsEnabled =
    useWatch({
      control: form.control,
      name: "subscriptionsEnabled"
    }) ?? false
  const pollingIntervalMinutes = Number(
    useWatch({
      control: form.control,
      name: "pollingIntervalMinutes"
    }) ?? 30
  )
  const notificationsEnabled =
    useWatch({
      control: form.control,
      name: "notificationsEnabled"
    }) ?? true
  const notificationDownloadActionEnabled =
    useWatch({
      control: form.control,
      name: "notificationDownloadActionEnabled"
    }) ?? true

  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [creatingSubscription, setCreatingSubscription] = useState(false)
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null)

  const runtimeStateById = runtimeSnapshot?.subscriptionRuntimeStateById ?? {}
  const configuredCount = subscriptions.length
  const enabledCount = subscriptions.filter((subscription) => subscription.enabled).length
  const subscriptionIds = subscriptions.map((subscription) => subscription.id)
  const scannedCount = countSubscriptionsWithScans(runtimeStateById, subscriptionIds)
  const errorCount = countSubscriptionsWithRecentErrors(runtimeStateById, subscriptionIds)
  const recentHitCount = countRecentHits(runtimeStateById, subscriptionIds)
  const pendingDeleteSubscription =
    pendingDeleteIndex !== null ? subscriptions[pendingDeleteIndex] : null

  const initialSubscription = useMemo(() => {
    if (editingIndex === null) {
      return undefined
    }

    return createSubscriptionDraft(subscriptions[editingIndex])
  }, [editingIndex, subscriptions])

  const setSubscriptions = (nextSubscriptions: SubscriptionEntry[]) => {
    form.setValue("subscriptions", nextSubscriptions, {
      shouldDirty: true,
      shouldTouch: true
    })
  }

  const handleSaveSubscription = (nextSubscription: SubscriptionWorkbenchDraft) => {
    const currentSubscriptions = form.getValues("subscriptions") ?? []

    if (editingIndex === null) {
      setSubscriptions([...currentSubscriptions, nextSubscription])
    } else {
      setSubscriptions(
        currentSubscriptions.map((subscription, index) =>
          index === editingIndex ? nextSubscription : subscription
        )
      )
    }

    setCreatingSubscription(false)
    setEditingIndex(null)
  }

  const handleDuplicateSubscription = (subscription: SubscriptionEntry) => {
    const currentSubscriptions = form.getValues("subscriptions") ?? []
    const duplicated = duplicateSubscription(subscription, {
      now: new Date().toISOString()
    })

    setSubscriptions([...currentSubscriptions, duplicated])
  }

  const handleDeleteSubscription = (targetIndex: number) => {
    setSubscriptions(subscriptions.filter((_, index) => index !== targetIndex))
  }

  const handleToggleEnabled = (targetIndex: number, enabled: boolean) => {
    setSubscriptions(
      subscriptions.map((subscription, index) =>
        index === targetIndex ? { ...subscription, enabled } : subscription
      )
    )
  }

  return (
    <div className="space-y-8" data-testid="subscriptions-workbench">
      <SubscriptionsGlobalCard
        subscriptionsEnabled={subscriptionsEnabled}
        pollingIntervalMinutes={pollingIntervalMinutes}
        notificationsEnabled={notificationsEnabled}
        notificationDownloadActionEnabled={notificationDownloadActionEnabled}
        configuredCount={configuredCount}
        enabledCount={enabledCount}
        scannedCount={scannedCount}
        errorCount={errorCount}
        recentHitCount={recentHitCount}
        lastSchedulerRunAt={runtimeSnapshot?.lastSchedulerRunAt ?? null}
        onSubscriptionsEnabledChange={(enabled) =>
          form.setValue("subscriptionsEnabled", enabled, {
            shouldDirty: true,
            shouldTouch: true
          })
        }
        onPollingIntervalMinutesChange={(minutes) =>
          form.setValue("pollingIntervalMinutes", Number.isFinite(minutes) ? minutes : 0, {
            shouldDirty: true,
            shouldTouch: true
          })
        }
        onNotificationsEnabledChange={(enabled) =>
          form.setValue("notificationsEnabled", enabled, {
            shouldDirty: true,
            shouldTouch: true
          })
        }
        onNotificationDownloadActionEnabledChange={(enabled) =>
          form.setValue("notificationDownloadActionEnabled", enabled, {
            shouldDirty: true,
            shouldTouch: true
          })
        }
      />

      <section className="space-y-4" data-testid="subscriptions-list">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">
              {i18n.t("options.subscriptions.listTitle")}
            </h3>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              {i18n.t("options.subscriptions.listDescription")}
            </p>
          </div>

          <Button
            type="button"
            onClick={() => {
              setEditingIndex(null)
              setCreatingSubscription(true)
            }}>
            <HiOutlinePlus className="h-4 w-4" />
            {i18n.t("options.subscriptions.add")}
          </Button>
        </div>

        {subscriptions.length ? (
          <div className="grid gap-4">
            {subscriptions.map((subscription, index) => (
              <SubscriptionCard
                key={`${subscription.id}-${index}`}
                subscription={subscription}
                runtimeState={runtimeStateById[subscription.id]}
                onEdit={() => {
                  setCreatingSubscription(false)
                  setEditingIndex(index)
                }}
                onDuplicate={() => handleDuplicateSubscription(subscription)}
                onDelete={() => setPendingDeleteIndex(index)}
                onToggleEnabled={(enabled) => handleToggleEnabled(index, enabled)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <div className="space-y-4 px-6 py-10 text-center">
              <h4 className="text-base font-medium text-zinc-900">
                {i18n.t("options.subscriptions.emptyTitle")}
              </h4>
              <p className="text-sm leading-6 text-zinc-500">
                {i18n.t("options.subscriptions.emptyDescription")}
              </p>
              <div className="flex justify-center">
                <Button
                  type="button"
                  onClick={() => {
                    setEditingIndex(null)
                    setCreatingSubscription(true)
                  }}>
                  <HiOutlinePlus className="h-4 w-4" />
                  {i18n.t("options.subscriptions.add")}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </section>

      <SubscriptionEditorDialog
        open={creatingSubscription || editingIndex !== null}
        initialSubscription={initialSubscription}
        onClose={() => {
          setCreatingSubscription(false)
          setEditingIndex(null)
        }}
        onSave={handleSaveSubscription}
      />

      <AlertDialog
        open={pendingDeleteIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteIndex(null)
          }
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{i18n.t("options.subscriptions.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteSubscription
                ? i18n.t("options.subscriptions.deleteDescriptionNamed", [
                    pendingDeleteSubscription.name
                  ])
                : i18n.t("options.subscriptions.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{i18n.t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                if (pendingDeleteIndex === null) {
                  return
                }

                handleDeleteSubscription(pendingDeleteIndex)
                setPendingDeleteIndex(null)
              }}>
              {i18n.t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
