export const APP_ROUTES = [
  { key: "now", label: "NOW", path: "/" },
  { key: "direction", label: "DIRECTION", path: "/direction" },
  { key: "execute", label: "EXECUTE", path: "/execute" },
  { key: "reflect", label: "REFLECT", path: "/reflect" },
  { key: "me", label: "ME", path: "/me" }
] as const;

export const CLARITY_ROUTE = { key: "clarity", label: "CLARITY RESET", path: "/clarity" } as const;

// Secondary surfaces (spec §1.2 "secondary nav group"): reachable, never primary navigation.
export const INBOX_ROUTE = { key: "inbox", label: "INBOX", path: "/inbox" } as const;
export const INCUBATOR_ROUTE = { key: "incubator", label: "INCUBATOR", path: "/incubator" } as const;
export const GET_UNSTUCK_ROUTE = { key: "get-unstuck", label: "GET UNSTUCK", path: "/get-unstuck" } as const;
export const WEEKLY_RESET_ROUTE = { key: "weekly-reset", label: "WEEKLY RESET", path: "/weekly-reset" } as const;
export const SECONDARY_ROUTES = [CLARITY_ROUTE, INBOX_ROUTE, INCUBATOR_ROUTE, GET_UNSTUCK_ROUTE, WEEKLY_RESET_ROUTE] as const;

export type AppRoute = (typeof APP_ROUTES)[number] | (typeof SECONDARY_ROUTES)[number];
export type AppRouteKey = AppRoute["key"];

const ALL_ROUTES: readonly AppRoute[] = [...APP_ROUTES, ...SECONDARY_ROUTES];

export function resolveRoute(pathname: string): AppRoute | null {
  const normalized = pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;
  return ALL_ROUTES.find((route) => route.path === normalized) ?? null;
}
