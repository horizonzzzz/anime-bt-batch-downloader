import type {
  DownloaderAdapter,
  DownloaderTorrentFile,
  DownloaderUrlSubmissionResult
} from "../downloader"
import { classifyExtractionResult, createPreparedExtractionResult } from "../download-preparation"
import type {
  BatchItem,
  ClassifiedBatchResult,
  ExtractionResult,
  Settings,
  SubscriptionEntry,
  SubscriptionHitRecord,
  SubscriptionNotificationRound,
  SubscriptionRuntimeState
} from "../shared/types"
import { produce } from "immer"
import { resolveSourceEnabled } from "../settings"
import { parseSubscriptionNotificationRoundId } from "./notifications"
import { readSubscriptionRuntimeState } from "./storage"

export type SubscriptionDownloadNotificationPatch = Pick<
  Settings,
  "subscriptionRuntimeStateById" | "subscriptionNotificationRounds"
>

export type DownloadSubscriptionHitsRequest = {
  roundId: string
}

export type DownloadSubscriptionHitsResult = {
  settings: Settings
  totalHits: number
  attemptedHits: number
  submittedCount: number
  duplicateCount: number
  failedCount: number
}

export type SubscriptionNotificationDownloadDependencies = {
  downloader: DownloaderAdapter
  fetchTorrentForUpload: (torrentUrl: string) => Promise<DownloaderTorrentFile>
  extractSingleItem: (item: BatchItem, settings: Settings) => Promise<ExtractionResult>
  now?: () => string
}

export type SubscriptionNotificationDownloadResult = DownloadSubscriptionHitsResult & {
  runtimePatch: SubscriptionDownloadNotificationPatch | null
}

export async function downloadSubscriptionNotificationHits(
  settings: Settings,
  request: DownloadSubscriptionHitsRequest,
  dependencies: SubscriptionNotificationDownloadDependencies
): Promise<SubscriptionNotificationDownloadResult> {
  const normalizedRoundId = parseSubscriptionNotificationRoundId(request.roundId)
  if (!normalizedRoundId) {
    throw new Error(
      `Invalid subscription notification round id: ${String(request.roundId ?? "")}`
    )
  }

  const attemptedAt = dependencies.now?.() ?? new Date().toISOString()
  const notificationRound = settings.subscriptionNotificationRounds.find(
    (round) => round.id === normalizedRoundId
  )

  if (!notificationRound) {
    throw new Error(`Subscription notification round not found: ${normalizedRoundId}`)
  }

  const runtimeStateById = cloneSubscriptionRuntimeStates(settings)
  const retainedHits = resolveRoundHits(notificationRound, runtimeStateById)
  const subscriptionById = new Map(
    settings.subscriptions.map((subscription) => [subscription.id, subscription] as const)
  )
  const activeRetainedHits = retainedHits.filter((hit) =>
    isSubscriptionHitDownloadable(hit, subscriptionById.get(hit.subscriptionId), settings)
  )
  const retainedHitsWerePruned = activeRetainedHits.length !== retainedHits.length
  const pendingHits = activeRetainedHits.filter(
    (hit) => hit.downloadStatus !== "submitted" && hit.downloadStatus !== "duplicate"
  )

  if (pendingHits.length === 0) {
    if (!retainedHitsWerePruned) {
      return {
        settings,
        runtimePatch: null,
        totalHits: retainedHits.length,
        attemptedHits: 0,
        submittedCount: 0,
        duplicateCount: 0,
        failedCount: 0
      }
    }

    const nextSettings = buildSettingsWithRuntimeStates(settings, runtimeStateById)
    const subscriptionNotificationRounds = replaceNotificationRoundHits(
      settings.subscriptionNotificationRounds,
      notificationRound.id,
      activeRetainedHits
    )
    const nextPersistedSettings = {
      ...nextSettings,
      subscriptionNotificationRounds
    }

    return {
      settings: nextPersistedSettings,
      runtimePatch: buildSubscriptionDownloadRuntimePatch(
        nextPersistedSettings,
        subscriptionNotificationRounds
      ),
      totalHits: retainedHits.length,
      attemptedHits: 0,
      submittedCount: 0,
      duplicateCount: 0,
      failedCount: 0
    }
  }

  const seenHashes = new Set<string>()
  const seenUrls = new Set<string>()
  const preparedHits: PreparedSubscriptionHit[] = []
  let duplicateCount = 0
  let failedCount = 0

  for (const hit of pendingHits) {
    const classified = await prepareSubscriptionHit(
      hit,
      subscriptionById.get(hit.subscriptionId),
      settings,
      seenHashes,
      seenUrls,
      dependencies.extractSingleItem
    )

    if (classified.status === "ready") {
      preparedHits.push({
        hitId: hit.id,
        classified
      })
      continue
    }

    if (classified.status === "duplicate") {
      updateHitStatus(runtimeStateById, activeRetainedHits, hit.id, {
        downloadStatus: "duplicate",
        downloadedAt: attemptedAt
      })
      duplicateCount += 1
      continue
    }

    updateHitStatus(runtimeStateById, activeRetainedHits, hit.id, {
      downloadStatus: "failed",
      downloadedAt: null
    })
    failedCount += 1
  }

  let submittedCount = 0
  if (preparedHits.length > 0) {
    try {
      await dependencies.downloader.authenticate(settings)
      const submissionResult = await submitPreparedHits(
        preparedHits,
        settings,
        dependencies.downloader,
        dependencies.fetchTorrentForUpload,
        attemptedAt
      )
      submittedCount += submissionResult.submittedCount
      failedCount += submissionResult.failedCount
      applySubmissionStatuses(runtimeStateById, submissionResult.statuses)
      applySubmissionStatusesToRetainedHits(activeRetainedHits, submissionResult.statuses)
    } catch {
      for (const preparedHit of preparedHits) {
        updateHitStatus(runtimeStateById, activeRetainedHits, preparedHit.hitId, {
          downloadStatus: "failed",
          downloadedAt: null
        })
      }
      failedCount += preparedHits.length
    }
  }

  const subscriptionNotificationRounds = replaceNotificationRoundHits(
    settings.subscriptionNotificationRounds,
    notificationRound.id,
    activeRetainedHits
  )
  const nextPersistedSettings = {
    ...buildSettingsWithRuntimeStates(settings, runtimeStateById),
    subscriptionNotificationRounds
  }

  return {
    settings: nextPersistedSettings,
    runtimePatch: buildSubscriptionDownloadRuntimePatch(
      nextPersistedSettings,
      subscriptionNotificationRounds
    ),
    totalHits: retainedHits.length,
    attemptedHits: pendingHits.length,
    submittedCount,
    duplicateCount,
    failedCount
  }
}

type PreparedSubscriptionHit = {
  hitId: string
  classified: ClassifiedBatchResult
}

type SubmissionStatusByHitId = Record<
  string,
  {
    downloadStatus: SubscriptionHitRecord["downloadStatus"]
    downloadedAt: string | null
  }
>

function cloneSubscriptionRuntimeStates(
  settings: Settings
): Map<string, SubscriptionRuntimeState> {
  const runtimeStateById = new Map<string, SubscriptionRuntimeState>()

  for (const subscription of settings.subscriptions) {
    const state = readSubscriptionRuntimeState(settings, subscription.id)
    runtimeStateById.set(subscription.id, {
      ...state,
      seenFingerprints: [...state.seenFingerprints],
      recentHits: state.recentHits.map((hit) => ({ ...hit }))
    })
  }

  return runtimeStateById
}

function resolveRoundHits(
  round: SubscriptionNotificationRound,
  runtimeStateById: Map<string, SubscriptionRuntimeState>
): SubscriptionHitRecord[] {
  const hitsById = new Map<string, SubscriptionHitRecord>()

  for (const state of runtimeStateById.values()) {
    for (const hit of state.recentHits) {
      hitsById.set(hit.id, hit)
    }
  }

  const retainedRoundHits =
    Array.isArray(round.hits) && round.hits.length > 0
      ? round.hits.map((hit) => ({ ...(hitsById.get(hit.id) ?? hit) }))
      : []
  const fallbackHits = round.hitIds
    .map((hitId) => hitsById.get(hitId))
    .filter((hit): hit is SubscriptionHitRecord => hit !== undefined)
    .map((hit) => ({ ...hit }))

  return retainedRoundHits.length ? retainedRoundHits : fallbackHits
}

function isSubscriptionHitDownloadable(
  hit: SubscriptionHitRecord,
  subscription: SubscriptionEntry | undefined,
  settings: Settings
): boolean {
  return Boolean(subscription?.enabled) && resolveSourceEnabled(hit.sourceId, settings)
}

async function prepareSubscriptionHit(
  hit: SubscriptionHitRecord,
  subscription: SubscriptionEntry | undefined,
  settings: Settings,
  seenHashes: Set<string>,
  seenUrls: Set<string>,
  extractSingleItem: (
    item: BatchItem,
    settings: Settings
  ) => Promise<ExtractionResult>
): Promise<ClassifiedBatchResult> {
  const batchItem: BatchItem = {
    sourceId: hit.sourceId,
    detailUrl: hit.detailUrl,
    title: hit.title,
    ...(hit.magnetUrl ? { magnetUrl: hit.magnetUrl } : {}),
    ...(hit.torrentUrl ? { torrentUrl: hit.torrentUrl } : {})
  }
  const preparedResult = createPreparedExtractionResult(batchItem)
  if (preparedResult) {
    return classifyExtractionResult(hit.sourceId, preparedResult, settings, seenHashes, seenUrls)
  }

  if (subscription?.deliveryMode !== "allow-detail-extraction") {
    return {
      ok: false,
      title: hit.title,
      detailUrl: hit.detailUrl,
      hash: "",
      magnetUrl: "",
      torrentUrl: "",
      failureReason: "No direct download link retained for this hit.",
      status: "failed",
      deliveryMode: "",
      submitUrl: "",
      message: "No direct download link retained for this hit."
    }
  }

  const extractedResult = await extractSingleItem(batchItem, settings)
  return classifyExtractionResult(hit.sourceId, extractedResult, settings, seenHashes, seenUrls)
}

async function submitPreparedHits(
  preparedHits: PreparedSubscriptionHit[],
  settings: Settings,
  downloader: DownloaderAdapter,
  fetchTorrentForUpload: (torrentUrl: string) => Promise<DownloaderTorrentFile>,
  attemptedAt: string
): Promise<{
  submittedCount: number
  failedCount: number
  statuses: SubmissionStatusByHitId
}> {
  const statuses: SubmissionStatusByHitId = {}
  let submittedCount = 0
  let failedCount = 0
  const urlPreparedHits = preparedHits.filter(
    (entry) => entry.classified.deliveryMode !== "torrent-file"
  )
  const torrentPreparedHits = preparedHits.filter(
    (entry) => entry.classified.deliveryMode === "torrent-file"
  )

  if (urlPreparedHits.length > 0) {
    try {
      const result = await downloader.addUrls(
        settings,
        urlPreparedHits.map((entry) => entry.classified.submitUrl),
        undefined
      )
      const urlResult = applyUrlSubmissionStatuses(urlPreparedHits, result, attemptedAt)
      submittedCount += urlResult.submittedCount
      failedCount += urlResult.failedCount
      Object.assign(statuses, urlResult.statuses)
    } catch {
      for (const preparedHit of urlPreparedHits) {
        statuses[preparedHit.hitId] = {
          downloadStatus: "failed",
          downloadedAt: null
        }
      }
      failedCount += urlPreparedHits.length
    }
  }

  for (const preparedHit of torrentPreparedHits) {
    try {
      const torrent = await fetchTorrentForUpload(preparedHit.classified.submitUrl)
      await downloader.addTorrentFiles(settings, [torrent], undefined)
      statuses[preparedHit.hitId] = {
        downloadStatus: "submitted",
        downloadedAt: attemptedAt
      }
      submittedCount += 1
    } catch {
      statuses[preparedHit.hitId] = {
        downloadStatus: "failed",
        downloadedAt: null
      }
      failedCount += 1
    }
  }

  return {
    submittedCount,
    failedCount,
    statuses
  }
}

function applyUrlSubmissionStatuses(
  preparedHits: PreparedSubscriptionHit[],
  result: DownloaderUrlSubmissionResult,
  attemptedAt: string
): {
  submittedCount: number
  failedCount: number
  statuses: SubmissionStatusByHitId
} {
  const statuses: SubmissionStatusByHitId = {}
  let submittedCount = 0
  let failedCount = 0

  for (const [index, preparedHit] of preparedHits.entries()) {
    const entry = result.entries[index]
    if (entry?.status === "submitted") {
      statuses[preparedHit.hitId] = {
        downloadStatus: "submitted",
        downloadedAt: attemptedAt
      }
      submittedCount += 1
      continue
    }

    statuses[preparedHit.hitId] = {
      downloadStatus: "failed",
      downloadedAt: null
    }
    failedCount += 1
  }

  return {
    submittedCount,
    failedCount,
    statuses
  }
}

function applySubmissionStatuses(
  runtimeStateById: Map<string, SubscriptionRuntimeState>,
  statuses: SubmissionStatusByHitId
): void {
  for (const [hitId, status] of Object.entries(statuses)) {
    updateRuntimeStateHit(runtimeStateById, hitId, status)
  }
}

function applySubmissionStatusesToRetainedHits(
  retainedHits: SubscriptionHitRecord[],
  statuses: SubmissionStatusByHitId
): void {
  for (const [hitId, status] of Object.entries(statuses)) {
    updateRetainedHitStatus(retainedHits, hitId, status)
  }
}

function updateRuntimeStateHit(
  runtimeStateById: Map<string, SubscriptionRuntimeState>,
  hitId: string,
  patch: Pick<SubscriptionHitRecord, "downloadStatus" | "downloadedAt">
): void {
  for (const [subscriptionId, state] of runtimeStateById.entries()) {
    const hitIndex = state.recentHits.findIndex((hit) => hit.id === hitId)
    if (hitIndex === -1) {
      continue
    }

    runtimeStateById.set(
      subscriptionId,
      produce(state, (draft) => {
        const targetHit = draft.recentHits[hitIndex]
        if (!targetHit) {
          return
        }

        targetHit.downloadStatus = patch.downloadStatus
        targetHit.downloadedAt = patch.downloadedAt
      })
    )
    return
  }
}

function updateRetainedHitStatus(
  retainedHits: SubscriptionHitRecord[],
  hitId: string,
  patch: Pick<SubscriptionHitRecord, "downloadStatus" | "downloadedAt">
): void {
  const hit = retainedHits.find((entry) => entry.id === hitId)
  if (!hit) {
    return
  }

  hit.downloadStatus = patch.downloadStatus
  hit.downloadedAt = patch.downloadedAt
}

function updateHitStatus(
  runtimeStateById: Map<string, SubscriptionRuntimeState>,
  retainedHits: SubscriptionHitRecord[],
  hitId: string,
  patch: Pick<SubscriptionHitRecord, "downloadStatus" | "downloadedAt">
): void {
  updateRuntimeStateHit(runtimeStateById, hitId, patch)
  updateRetainedHitStatus(retainedHits, hitId, patch)
}

function buildSettingsWithRuntimeStates(
  settings: Settings,
  runtimeStateById: Map<string, SubscriptionRuntimeState>
): Settings {
  return {
    ...settings,
    subscriptionRuntimeStateById: {
      ...settings.subscriptionRuntimeStateById,
      ...Object.fromEntries(runtimeStateById.entries())
    }
  }
}

function buildSubscriptionDownloadRuntimePatch(
  settings: Pick<Settings, "subscriptionRuntimeStateById">,
  subscriptionNotificationRounds: Settings["subscriptionNotificationRounds"]
): SubscriptionDownloadNotificationPatch {
  return {
    subscriptionRuntimeStateById: settings.subscriptionRuntimeStateById,
    subscriptionNotificationRounds
  }
}

function replaceNotificationRoundHits(
  rounds: Settings["subscriptionNotificationRounds"],
  roundId: string,
  retainedHits: SubscriptionHitRecord[]
): Settings["subscriptionNotificationRounds"] {
  return produce(rounds, (draft) => {
    const roundIndex = draft.findIndex((round) => round.id === roundId)
    if (roundIndex === -1) {
      return
    }

    if (retainedHits.length === 0) {
      draft.splice(roundIndex, 1)
      return
    }

    const targetRound = draft[roundIndex]
    if (!targetRound) {
      return
    }

    targetRound.hitIds = retainedHits.map((hit) => hit.id)
    targetRound.hits = retainedHits.map((hit) => ({ ...hit }))
  })
}
