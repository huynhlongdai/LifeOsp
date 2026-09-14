export const APP_ROUTES = [
  { key: "now", label: "NOW", path: "/" },
  { key: "direction", label: "DIRECTION", path: "/direction" },
  { key: "execute", label: "EXECUTE", path: "/execute" },
  { key: "reflect", label: "REFLECT", path: "/reflect" },
  { key: "me", label: "ME", path: "/me" }
] as const;

export const CLARITY_ROUTE = { key: "clarity", label: "CLARITY RESET", path: "/clarity" } as const;
export const INBOX_ROUTE = { key: "inbox", label: "INBOX", path: "/inbox" } as const;
export const INCUBATOR_ROUTE = { key: "incubator", label: "INCUBATOR", path: "/incubator" } as const;
export const ADMIN_ROUTE = { key: "admin", label: "ADMIN", path: "/admin" } as const;
export const COACH_ROUTE = { key: "coach", label: "AI COACH", path: "/coach" } as const;

export type AppRoute = (typeof APP_ROUTES)[number] | typeof CLARITY_ROUTE | typeof INBOX_ROUTE | typeof INCUBATOR_ROUTE | typeof COACH_ROUTE | typeof ADMIN_ROUTE;
export type AppRouteKey = AppRoute["key"];

const ALL_ROUTES: readonly AppRoute[] = [...APP_ROUTES, CLARITY_ROUTE, INBOX_ROUTE, INCUBATOR_ROUTE, COACH_ROUTE, ADMIN_ROUTE];

export function resolveRoute(pathname: string): AppRoute | null {
  const normalized = pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;
  return ALL_ROUTES.find((route) => route.path === normalized) ?? null;
}
