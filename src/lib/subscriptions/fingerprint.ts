import type { SubscriptionFingerprintCandidate } from "./types"

export function createSubscriptionFingerprint(
  candidate: SubscriptionFingerprintCandidate
): string {
  const magnetUrl = normalizeText(candidate.magnetUrl)
  if (magnetUrl) {
    const magnetHash = extractMagnetInfohash(magnetUrl)
    if (magnetHash) {
      return `magnet-btih:${magnetHash}`
    }
  }

  const torrentUrl = normalizeText(candidate.torrentUrl)
  if (torrentUrl) {
    return normalizeComparableUrl(torrentUrl)
  }

  const detailUrl = normalizeText(candidate.detailUrl)
  if (detailUrl) {
    return normalizeComparableUrl(detailUrl)
  }

  const normalizedTitle = normalizeText(candidate.normalizedTitle)
  if (!normalizedTitle) {
    throw new Error("Normalized title is required when no direct resource link is available.")
  }

  return `${candidate.sourceId}:${normalizedTitle}`
}

function normalizeText(value: string): string {
  return String(value ?? "").trim()
}

function normalizeComparableUrl(value: string): string {
  const normalizedValue = normalizeText(value)
  if (!normalizedValue) {
    return ""
  }

  try {
    const parsed = new URL(normalizedValue)
    parsed.hash = ""
    return parsed.href
  } catch {
    return normalizedValue
  }
}

function extractMagnetInfohash(magnetUrl: string): string {
  const normalizedMagnetUrl = String(magnetUrl || "").trim()
  const queryIndex = normalizedMagnetUrl.indexOf("?")
  if (queryIndex < 0) {
    return ""
  }

  try {
    const searchParams = new URLSearchParams(normalizedMagnetUrl.slice(queryIndex + 1))

    for (const value of searchParams.getAll("xt")) {
      const match = String(value ?? "").match(/^urn:btih:([a-z0-9]+)$/i)
      if (match) {
        return match[1].toLowerCase()
      }
    }
  } catch {
    return ""
  }

  return ""
}
