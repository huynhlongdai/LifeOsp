export const APP_ROUTES = [
  { key: "now", label: "NOW", path: "/" },
  { key: "direction", label: "DIRECTION", path: "/direction" },
  { key: "execute", label: "EXECUTE", path: "/execute" },
  { key: "reflect", label: "REFLECT", path: "/reflect" },
  { key: "me", label: "ME", path: "/me" }
] as const;

export type AppRoute = (typeof APP_ROUTES)[number];
export type AppRouteKey = AppRoute["key"];

export function resolveRoute(pathname: string): AppRoute | null {
  const normalized = pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;
  return APP_ROUTES.find((route) => route.path === normalized) ?? null;
}
