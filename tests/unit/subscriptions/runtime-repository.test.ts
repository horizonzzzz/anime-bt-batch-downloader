import { describe, expect, it, vi } from "vitest"

import { DEFAULT_SETTINGS } from "../../../src/lib/settings/defaults"
import type {
  Settings,
  SubscriptionEntry,
  SubscriptionRuntimeState
} from "../../../src/lib/shared/types"
import {
  createSettingsSubscriptionRuntimeRepository,
  type SubscriptionRuntimeSettingsPatch
} from "../../../src/lib/subscriptions/runtime-repository"

function createSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    ...DEFAULT_SETTINGS,
    subscriptions: [],
    subscriptionRuntimeStateById: {},
    subscriptionNotificationRounds: [],
    ...overrides
  }
}

function createSubscription(
  overrides: Partial<SubscriptionEntry> = {}
): SubscriptionEntry {
  return {
    id: "sub-1",
    name: "Medalist",
    enabled: true,
    sourceIds: ["acgrip"],
    multiSiteModeEnabled: false,
    titleQuery: "medalist",
    subgroupQuery: "",
    advanced: {
      must: [],
      any: []
    },
    deliveryMode: "direct-only",
    createdAt: "2026-04-01T00:00:00.000Z",
    baselineCreatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides
  }
}

function createRuntimeState(
  overrides: Partial<SubscriptionRuntimeState> = {}
): SubscriptionRuntimeState {
  return {
    lastScanAt: "2026-04-14T08:00:00.000Z",
    lastMatchedAt: null,
    lastError: "",
    seenFingerprints: [],
    recentHits: [],
    ...overrides
  }
}

describe("createSettingsSubscriptionRuntimeRepository", () => {
  it("loads settings plus runtime snapshot together", async () => {
    const settings = createSettings({
      lastSchedulerRunAt: "2026-04-14T09:00:00.000Z",
      subscriptions: [createSubscription()],
      subscriptionRuntimeStateById: {
        "sub-1": createRuntimeState({
          seenFingerprints: ["fp-1"]
        })
      },
      subscriptionNotificationRounds: [
        {
          id: "subscription-round:20260414090000000",
          createdAt: "2026-04-14T09:00:00.000Z",
          hitIds: ["hit-1"]
        }
      ]
    })
    const getSettings = vi.fn(async () => settings)
    const saveSettings = vi.fn()
    const repository = createSettingsSubscriptionRuntimeRepository({
      getSettings,
      saveSettings
    })

    const loaded = await repository.load()

    expect(getSettings).toHaveBeenCalledTimes(1)
    expect(loaded.settings).toBe(settings)
    expect(loaded.runtimeSnapshot).toEqual({
      lastSchedulerRunAt: "2026-04-14T09:00:00.000Z",
      subscriptionRuntimeStateById: settings.subscriptionRuntimeStateById,
      subscriptionNotificationRounds: settings.subscriptionNotificationRounds
    })
  })

  it("saves only runtime fields from the snapshot through settings storage", async () => {
    const saveSettings = vi.fn(async (patch: SubscriptionRuntimeSettingsPatch) =>
      createSettings({
        ...patch
      })
    )
    const repository = createSettingsSubscriptionRuntimeRepository({
      getSettings: vi.fn(async () => createSettings()),
      saveSettings
    })

    const saved = await repository.save({
      lastSchedulerRunAt: "2026-04-14T10:00:00.000Z",
      subscriptionRuntimeStateById: {
        "sub-1": createRuntimeState({
          lastScanAt: "2026-04-14T10:00:00.000Z",
          seenFingerprints: ["fp-1"]
        })
      },
      subscriptionNotificationRounds: [
        {
          id: "subscription-round:20260414100000000",
          createdAt: "2026-04-14T10:00:00.000Z",
          hitIds: ["hit-1"]
        }
      ]
    })

    expect(saveSettings).toHaveBeenCalledWith({
      lastSchedulerRunAt: "2026-04-14T10:00:00.000Z",
      subscriptionRuntimeStateById: {
        "sub-1": expect.objectContaining({
          lastScanAt: "2026-04-14T10:00:00.000Z",
          seenFingerprints: ["fp-1"]
        })
      },
      subscriptionNotificationRounds: [
        expect.objectContaining({
          id: "subscription-round:20260414100000000",
          hitIds: ["hit-1"]
        })
      ]
    })
    expect(saved.lastSchedulerRunAt).toBe("2026-04-14T10:00:00.000Z")
    expect(saved.subscriptionRuntimeStateById).toEqual(
      expect.objectContaining({
        "sub-1": expect.objectContaining({
          lastScanAt: "2026-04-14T10:00:00.000Z"
        })
      })
    )
  })

  it("always saves a full runtime settings patch even when scheduler timestamp is unchanged", async () => {
    const unchangedSchedulerAt = "2026-04-14T09:00:00.000Z"
    const existingSettings = createSettings({
      lastSchedulerRunAt: unchangedSchedulerAt
    })
    const saveSettings = vi.fn(async (patch: SubscriptionRuntimeSettingsPatch) =>
      createSettings({
        ...patch
      })
    )
    const repository = createSettingsSubscriptionRuntimeRepository({
      getSettings: vi.fn(async () => existingSettings),
      saveSettings
    })

    await repository.load()
    await repository.save({
      lastSchedulerRunAt: unchangedSchedulerAt,
      subscriptionRuntimeStateById: {
        "sub-1": createRuntimeState({
          lastScanAt: "2026-04-14T09:10:00.000Z"
        })
      },
      subscriptionNotificationRounds: [
        {
          id: "subscription-round:20260414091000000",
          createdAt: "2026-04-14T09:10:00.000Z",
          hitIds: ["hit-1"]
        }
      ]
    })

    expect(saveSettings).toHaveBeenCalledWith({
      lastSchedulerRunAt: unchangedSchedulerAt,
      subscriptionRuntimeStateById: {
        "sub-1": expect.objectContaining({
          lastScanAt: "2026-04-14T09:10:00.000Z"
        })
      },
      subscriptionNotificationRounds: [
        expect.objectContaining({
          id: "subscription-round:20260414091000000"
        })
      ]
    })
  })
})
