import type { SourceId } from "../shared/types"

const WRAPPED_PATTERNS = [/^\[([^\]]+)\]/, /^【([^】]+)】/, /^\(([^)]+)\)/]

export function extractSubgroup(_sourceId: SourceId, title: string): string {
  const normalizedTitle = String(title ?? "").trim()

  for (const pattern of WRAPPED_PATTERNS) {
    const match = normalizedTitle.match(pattern)
    if (match?.[1]) {
      return match[1].trim()
    }
  }

  return ""
}
