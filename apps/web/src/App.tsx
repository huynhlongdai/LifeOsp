import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import type { HealthStatus } from "@lifeos/domain";
import { createApiClient } from "./api";
import { AppShell } from "./AppShell";
import { ClarityReset } from "./ClarityReset";
import { BrainDumpButton, BrainDumpSheet } from "./BrainDump";
import { ExecutePage } from "./ExecutePage";
import { InboxPage } from "./InboxPage";
import { MePage } from "./MePage";
import { DirectionPage } from "./DirectionPage";
import { NowPage } from "./NowPage";
import { ReflectPage } from "./ReflectPage";
import { resolveRoute, type AppRoute } from "./routes";
import { ErrorState, type AsyncState } from "./ui-states";

export function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [apiState, setApiState] = useState<AsyncState<HealthStatus>>({ kind: "loading" });
  const [brainDumpOpen, setBrainDumpOpen] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL ?? "";
  const route = resolveRoute(pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const api = createApiClient(apiUrl);

    setApiState({ kind: "loading" });
    api
      .getHealth(controller.signal)
      .then((health) => setApiState({ kind: "success", data: health }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        const message = error instanceof Error ? error.message : "API health check failed";
        setApiState({ kind: "error", message });
      });

    return () => controller.abort();
  }, [apiUrl]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setBrainDumpOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const navigate = (event: MouseEvent<HTMLAnchorElement>, nextPath: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (window.location.pathname === nextPath && window.location.search === "") return;
    window.history.pushState({}, "", nextPath);
    setPathname(nextPath);
  };

  return (
    <AppShell route={route} onNavigate={navigate} statusSlot={<ApiBadge state={apiState} />}>
      {route ? <RouteContent route={route} apiUrl={apiUrl} /> : <UnknownRoute />}
      <BrainDumpButton onOpen={() => setBrainDumpOpen(true)} />
      {brainDumpOpen ? <BrainDumpSheet apiUrl={apiUrl} onClose={() => setBrainDumpOpen(false)} /> : null}
    </AppShell>
  );
}

function RouteContent({ route, apiUrl }: { route: AppRoute; apiUrl: string }) {
  if (route.key === "now") return <NowPage apiUrl={apiUrl} />;
  if (route.key === "reflect") return <ReflectPage apiUrl={apiUrl} />;
  if (route.key === "clarity") return <LegacyPage><ClarityReset apiUrl={apiUrl} /></LegacyPage>;
  if (route.key === "direction") return <DirectionPage apiUrl={apiUrl} />;

  if (route.key === "execute") return <ExecutePage apiUrl={apiUrl} />;
  if (route.key === "inbox") return <InboxPage apiUrl={apiUrl} />;
  return <MePage apiUrl={apiUrl} />;
}


/** Slice A screens keep their current markup until their own design pass. */
function LegacyPage({ children }: { children: ReactNode }) {
  return <div className="px-5 pt-8 pb-10 md:px-8 md:max-w-3xl">{children}</div>;
}

function UnknownRoute() {
  return (
    <LegacyPage>
    <ErrorState title="Route không tồn tại">
      Dùng navigation của LifeOS để quay về một khu vực đã được định nghĩa.
    </ErrorState>
    </LegacyPage>
  );
}

function ApiBadge({ state }: { state: AsyncState<HealthStatus> }) {
  const tone =
    state.kind === "loading"
      ? { label: "API…", color: "var(--amber)", background: "var(--amber-bg)" }
      : state.kind === "error"
        ? { label: "API offline", color: "var(--red)", background: "var(--red-bg)" }
        : { label: "API online", color: "var(--green)", background: "var(--green-bg)" };

  return (
    <span
      className="flex items-center gap-1.5 px-2.5 h-8 rounded-xl text-[10px] font-extrabold uppercase"
      style={{ color: tone.color, background: tone.background, border: "1px solid var(--border-2)", letterSpacing: "0.06em" }}
      title={state.kind === "error" ? state.message : state.kind === "success" ? `Healthy at ${state.data.timestamp}` : undefined}
      role="status"
    >
      <span className="rounded-full" style={{ width: 7, height: 7, background: tone.color }} />
      {tone.label}
    </span>
  );
}
