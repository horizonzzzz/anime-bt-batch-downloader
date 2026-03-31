export const OPTIONS_ROUTE_PATHS = [
  "/general",
  "/sites",
  "/filters",
  "/history",
  "/overview"
] as const

export type OptionsRoutePath = (typeof OPTIONS_ROUTE_PATHS)[number]

export const DEFAULT_OPTIONS_ROUTE: OptionsRoutePath = "/general"

export function isOptionsRoutePath(value: unknown): value is OptionsRoutePath {
  return typeof value === "string" && (OPTIONS_ROUTE_PATHS as readonly string[]).includes(value)
}
