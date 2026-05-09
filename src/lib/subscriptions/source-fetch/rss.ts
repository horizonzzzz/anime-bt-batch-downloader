const ITEM_PATTERN = /<item\b[\s\S]*?<\/item>/giu
const HTML_TAG_PATTERN = /<[^>]+>/g
const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  "#39": "'"
}

export function extractRssItems(xml: string): string[] {
  return Array.from(String(xml ?? "").matchAll(ITEM_PATTERN), (match) => match[0])
}

export function extractRssTagValue(item: string, tagName: string): string {
  const cdata = item.match(new RegExp(`<${tagName}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, "iu"))
  if (cdata?.[1]) {
    return normalizeRssValue(cdata[1])
  }

  const plain = item.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "iu"))
  return normalizeRssValue(plain?.[1] ?? "")
}

function normalizeRssValue(value: string | null | undefined) {
  return decodeHtmlEntities(String(value ?? ""))
    .replace(HTML_TAG_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (entity, token: string) => {
    const normalizedToken = token.toLowerCase()
    const namedEntity = NAMED_HTML_ENTITIES[normalizedToken]
    if (namedEntity) {
      return namedEntity
    }

    if (normalizedToken.startsWith("#x")) {
      const codePoint = Number.parseInt(normalizedToken.slice(2), 16)
      return Number.isNaN(codePoint) ? entity : String.fromCodePoint(codePoint)
    }

    if (normalizedToken.startsWith("#")) {
      const codePoint = Number.parseInt(normalizedToken.slice(1), 10)
      return Number.isNaN(codePoint) ? entity : String.fromCodePoint(codePoint)
    }

    return entity
  })
}
