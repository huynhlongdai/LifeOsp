export const APP_ROUTES = [
  { key: "now", label: "NOW", path: "/" },
  { key: "direction", label: "DIRECTION", path: "/direction" },
  { key: "execute", label: "EXECUTE", path: "/execute" },
  { key: "reflect", label: "REFLECT", path: "/reflect" },
  { key: "me", label: "ME", path: "/me" }
] as const;

export const CLARITY_ROUTE = { key: "clarity", label: "CLARITY RESET", path: "/clarity" } as const;

export type AppRoute = (typeof APP_ROUTES)[number] | typeof CLARITY_ROUTE;
export type AppRouteKey = AppRoute["key"];

const ALL_ROUTES: readonly AppRoute[] = [...APP_ROUTES, CLARITY_ROUTE];

export function resolveRoute(pathname: string): AppRoute | null {
  const normalized = pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;
  return ALL_ROUTES.find((route) => route.path === normalized) ?? null;
}
