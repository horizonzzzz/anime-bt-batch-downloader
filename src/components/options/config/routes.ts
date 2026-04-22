import { i18n } from "../../../lib/i18n"

import {
  DEFAULT_OPTIONS_ROUTE,
  OPTIONS_ROUTE_PATHS,
  type OptionsRoutePath
} from "../../../lib/shared/options-routes"
export { DEFAULT_OPTIONS_ROUTE } from "../../../lib/shared/options-routes"

export type OptionsRouteId =
  | "general"
  | "sites"
  | "filters"
  | "subscriptions"
  | "subscriptionHits"
  | "history"
  | "overview"

export type OptionsRouteGroupId = "config" | "activity" | "overview"

export type OptionsRouteMeta = {
  id: OptionsRouteId
  groupId: OptionsRouteGroupId
  path: OptionsRoutePath
  label: string
  title: string
  description: string
  footerLabel: string
}

export type OptionsRouteGroupMeta = {
  id: OptionsRouteGroupId
  label: string
  routes: OptionsRouteMeta[]
}

const [
  GENERAL_ROUTE,
  SITES_ROUTE,
  FILTERS_ROUTE,
  SUBSCRIPTIONS_ROUTE,
  SUBSCRIPTION_HITS_ROUTE,
  HISTORY_ROUTE,
  OVERVIEW_ROUTE
] = OPTIONS_ROUTE_PATHS

export const OPTIONS_ROUTES = [
  {
    id: "general",
    groupId: "config",
    path: GENERAL_ROUTE
  },
  {
    id: "sites",
    groupId: "config",
    path: SITES_ROUTE
  },
  {
    id: "filters",
    groupId: "config",
    path: FILTERS_ROUTE
  },
  {
    id: "subscriptions",
    groupId: "config",
    path: SUBSCRIPTIONS_ROUTE
  },
  {
    id: "subscriptionHits",
    groupId: "activity",
    path: SUBSCRIPTION_HITS_ROUTE
  },
  {
    id: "history",
    groupId: "activity",
    path: HISTORY_ROUTE
  },
  {
    id: "overview",
    groupId: "overview",
    path: OVERVIEW_ROUTE
  }
 ] as const satisfies ReadonlyArray<Pick<OptionsRouteMeta, "id" | "groupId" | "path">>

const OPTIONS_ROUTE_GROUPS = [
  "config",
  "activity",
  "overview"
] as const satisfies ReadonlyArray<OptionsRouteGroupId>

function localizeRoute(route: (typeof OPTIONS_ROUTES)[number]): OptionsRouteMeta {
  const baseKey = `options.routes.${route.id}` as const

  return {
    ...route,
    label: i18n.t(`${baseKey}.label`),
    title: i18n.t(`${baseKey}.title`),
    description: i18n.t(`${baseKey}.description`),
    footerLabel: i18n.t(`${baseKey}.footerLabel`)
  }
}

export function getOptionsRoutes(): OptionsRouteMeta[] {
  return OPTIONS_ROUTES.map(localizeRoute)
}

export function groupOptionsRoutes(routes: OptionsRouteMeta[]): OptionsRouteGroupMeta[] {
  return OPTIONS_ROUTE_GROUPS.map((groupId) => ({
    id: groupId,
    label: i18n.t(`options.sidebar.groups.${groupId}`),
    routes: routes.filter((route) => route.groupId === groupId)
  })).filter((group) => group.routes.length > 0)
}

export function getOptionsRouteMeta(pathname: string) {
  const localizedRoutes = getOptionsRoutes()
  const routeMetaByPath = Object.fromEntries(
    localizedRoutes.map((route) => [route.path, route])
  ) as Record<string, OptionsRouteMeta>

  return routeMetaByPath[pathname] ?? routeMetaByPath[DEFAULT_OPTIONS_ROUTE]
}
