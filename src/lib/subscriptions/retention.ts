export const SEEN_FINGERPRINT_RETENTION_CAP = 200
export const RECENT_HIT_RETENTION_CAP = 20

export function retainSeenFingerprints(seenFingerprints: string[]): string[] {
  const dedupedNewestFirst = seenFingerprints
    .map((value) => String(value ?? "").trim())
    .filter((value) => value.length > 0)
    .reduceRight<string[]>((accumulator, value) => {
      if (accumulator.includes(value)) {
        return accumulator
      }

      accumulator.unshift(value)
      return accumulator
    }, [])

  return dedupedNewestFirst.slice(-SEEN_FINGERPRINT_RETENTION_CAP)
}

export function pushSeenFingerprint(
  seenFingerprints: string[],
  fingerprint: string
): string[] {
  const normalizedFingerprint = String(fingerprint ?? "").trim()
  if (!normalizedFingerprint) {
    return retainSeenFingerprints(seenFingerprints)
  }

  const withoutDuplicate = retainSeenFingerprints(seenFingerprints).filter(
    (value) => value !== normalizedFingerprint
  )

  return retainSeenFingerprints([...withoutDuplicate, normalizedFingerprint])
}

export function retainRecentHits<T>(recentHits: T[]): T[] {
  return recentHits.slice(-RECENT_HIT_RETENTION_CAP)
}

export function pushRecentHit<T>(recentHits: T[], hit: T): T[] {
  return retainRecentHits([...recentHits, hit])
}
