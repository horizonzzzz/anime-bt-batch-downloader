import type { DownloaderConfig } from "../config/types"

type FetchLike = typeof fetch

type TransmissionRpcSuccess<TArguments = Record<string, unknown>> = {
  result: string
  arguments?: TArguments
}

function getTransmissionProfile(config: DownloaderConfig) {
  return config.profiles.transmission
}

function encodeBase64Utf8(value: string): string {
  let binary = ""

  for (const byte of new TextEncoder().encode(value)) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

function buildAuthHeader(config: DownloaderConfig): string | null {
  const { username, password } = getTransmissionProfile(config)
  if (!username && !password) {
    return null
  }

  return `Basic ${encodeBase64Utf8(`${username}:${password}`)}`
}

function buildHeaders(config: DownloaderConfig, sessionId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  }

  if (sessionId) {
    headers["X-Transmission-Session-Id"] = sessionId
  }

  const authHeader = buildAuthHeader(config)
  if (authHeader) {
    headers.Authorization = authHeader
  }

  return headers
}

export async function transmissionRpc<TArguments = Record<string, unknown>>(
  config: DownloaderConfig,
  method: string,
  args: Record<string, unknown> = {},
  fetchImpl: FetchLike = fetch,
  sessionId?: string
): Promise<TransmissionRpcSuccess<TArguments>> {
  const transmissionProfile = getTransmissionProfile(config)
  const response = await fetchImpl(transmissionProfile.baseUrl, {
    method: "POST",
    headers: buildHeaders(config, sessionId),
    body: JSON.stringify({
      method,
      arguments: args
    })
  })

  if (response.status === 409) {
    const nextSessionId = response.headers.get("X-Transmission-Session-Id")
    if (!nextSessionId) {
      throw new Error("Transmission RPC session negotiation failed.")
    }

    return transmissionRpc<TArguments>(config, method, args, fetchImpl, nextSessionId)
  }

  if (!response.ok) {
    throw new Error(`Transmission request failed with HTTP ${response.status}.`)
  }

  const payload = await response.json() as TransmissionRpcSuccess<TArguments>
  if (payload.result !== "success") {
    throw new Error(`Transmission RPC failed: ${payload.result || "unknown error"}`)
  }

  return payload
}

export async function authenticateTransmission(
  config: DownloaderConfig,
  fetchImpl: FetchLike = fetch
): Promise<void> {
  await transmissionRpc(config, "session-get", {}, fetchImpl)
}