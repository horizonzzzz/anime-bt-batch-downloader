import type { BatchItem, Settings, TestQbConnectionResult } from "./types"
import type { TaskHistoryRecord } from "../history/types"

export const BATCH_EVENT = "ANIME_BT_BATCH_EVENT"

export type RuntimeRequest =
  | { type: "GET_HISTORY" }
  | { type: "CLEAR_HISTORY" }
  | { type: "DELETE_HISTORY_RECORD"; recordId: string }
  | { type: "RETRY_FAILED_ITEMS"; recordId: string; itemIds?: string[] }
  | { type: "GET_SETTINGS" }
  | { type: "SAVE_SETTINGS"; settings?: Partial<Settings> }
  | { type: "TEST_QB_CONNECTION"; settings?: Partial<Settings> | null }
  | { type: "OPEN_OPTIONS_PAGE" }
  | { type: "START_BATCH_DOWNLOAD"; items?: BatchItem[]; savePath?: string }

export type RuntimeRequestType = RuntimeRequest["type"]

export type RuntimeErrorResponse = {
  ok: false
  error: string
}

export type GetSettingsSuccessResponse = {
  ok: true
  settings: Settings
}

export type SaveSettingsSuccessResponse = {
  ok: true
  settings: Settings
}

export type TestQbConnectionSuccessResponse = {
  ok: true
  result: TestQbConnectionResult
}

export type OpenOptionsPageSuccessResponse = {
  ok: true
}

export type StartBatchDownloadSuccessResponse = {
  ok: true
  total: number
}

export type GetHistorySuccessResponse = {
  ok: true
  records: TaskHistoryRecord[]
}

export type ClearHistorySuccessResponse = {
  ok: true
}

export type DeleteHistoryRecordSuccessResponse = {
  ok: true
}

export type RetryFailedItemsSuccessResponse = {
  ok: true
  successCount: number
  failedCount: number
}

export type RuntimeSuccessResponseMap = {
  GET_HISTORY: GetHistorySuccessResponse
  CLEAR_HISTORY: ClearHistorySuccessResponse
  DELETE_HISTORY_RECORD: DeleteHistoryRecordSuccessResponse
  RETRY_FAILED_ITEMS: RetryFailedItemsSuccessResponse
  GET_SETTINGS: GetSettingsSuccessResponse
  SAVE_SETTINGS: SaveSettingsSuccessResponse
  TEST_QB_CONNECTION: TestQbConnectionSuccessResponse
  OPEN_OPTIONS_PAGE: OpenOptionsPageSuccessResponse
  START_BATCH_DOWNLOAD: StartBatchDownloadSuccessResponse
}

export type RuntimeSuccessResponseFor<TType extends RuntimeRequestType> =
  RuntimeSuccessResponseMap[TType]

export type RuntimeResponseFor<TType extends RuntimeRequestType> =
  | RuntimeSuccessResponseFor<TType>
  | RuntimeErrorResponse

export type GetHistoryResponse = RuntimeResponseFor<"GET_HISTORY">
export type ClearHistoryResponse = RuntimeResponseFor<"CLEAR_HISTORY">
export type DeleteHistoryRecordResponse = RuntimeResponseFor<"DELETE_HISTORY_RECORD">
export type RetryFailedItemsResponse = RuntimeResponseFor<"RETRY_FAILED_ITEMS">
export type GetSettingsResponse = RuntimeResponseFor<"GET_SETTINGS">
export type SaveSettingsResponse = RuntimeResponseFor<"SAVE_SETTINGS">
export type TestQbConnectionResponse = RuntimeResponseFor<"TEST_QB_CONNECTION">
export type OpenOptionsPageResponse = RuntimeResponseFor<"OPEN_OPTIONS_PAGE">
export type StartBatchDownloadResponse = RuntimeResponseFor<"START_BATCH_DOWNLOAD">
export type RuntimeResponse = RuntimeResponseFor<RuntimeRequestType>

export function createRuntimeSuccessResponse<TType extends RuntimeRequestType>(
  _type: TType,
  payload: Omit<RuntimeSuccessResponseFor<TType>, "ok">
): RuntimeSuccessResponseFor<TType> {
  return {
    ok: true,
    ...payload
  } as RuntimeSuccessResponseFor<TType>
}

export function createRuntimeErrorResponse(error: string): RuntimeErrorResponse {
  return {
    ok: false,
    error
  }
}

export async function sendRuntimeRequest<TRequest extends RuntimeRequest>(
  request: TRequest
): Promise<RuntimeResponseFor<TRequest["type"]>> {
  return chrome.runtime.sendMessage(request) as Promise<RuntimeResponseFor<TRequest["type"]>>
}
