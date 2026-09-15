import { useEffect, useState, type MouseEvent } from "react";
import type { HealthStatus } from "@lifeos/domain";
import { createApiClient } from "./api";
import { ClarityReset } from "./ClarityReset";
import { DailyClosePage } from "./DailyClosePage";
import { DirectionPage } from "./DirectionPage";
import { ExecutePage } from "./ExecutePage";
import { GetUnstuckPage } from "./GetUnstuckPage";
import { ClarityIcon, RouteIcon, ShieldIcon } from "./icons";
import { InboxPage } from "./InboxPage";
import { IncubatorPage } from "./IncubatorPage";
import { MePage } from "./MePage";
import { NowPage } from "./NowPage";
import { QuickCapture } from "./QuickCapture";
import { APP_ROUTES, resolveRoute, type AppRoute, type AppRouteKey } from "./routes";
import { EmptyState, ErrorState, LoadingState, type AsyncState } from "./ui-states";

// Display copy for the shell. Route keys/labels in routes.ts stay canonical.
const NAV_LABEL: Record<AppRouteKey, string> = {
  now: "Now",
  direction: "Direction",
  execute: "Execute",
  reflect: "Reflect",
  me: "Me",
  clarity: "Làm rõ",
  inbox: "Inbox",
  incubator: "Được giữ lại",
  "get-unstuck": "Gỡ vướng"
};

const PAGE_HEADING: Record<Exclude<AppRouteKey, "now">, { kicker: string; title: string }> = {
  direction: { kicker: "Direction", title: "Hướng hiện tại" },
  execute: { kicker: "Execute", title: "Việc đang có" },
  reflect: { kicker: "Reflect", title: "Khép lại hôm nay" },
  me: { kicker: "Me", title: "Bạn" },
  clarity: { kicker: "Clarity Reset", title: "Làm rõ điều đang quan trọng" },
  inbox: { kicker: "Inbox", title: "Những gì bạn đã ghi lại" },
  incubator: { kicker: "Không phải bây giờ", title: "Được giữ lại" },
  "get-unstuck": { kicker: "Gỡ vướng", title: "Việc gì đang kẹt?" }
};

export function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [apiState, setApiState] = useState<AsyncState<HealthStatus>>({ kind: "loading" });
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

  const navigate = (event: MouseEvent<HTMLAnchorElement>, nextPath: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (window.location.pathname === nextPath && window.location.search === "") return;
    window.history.pushState({}, "", nextPath);
    setPathname(nextPath);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="LifeOS navigation">
        <a className="brand" href="/" onClick={(event) => navigate(event, "/")}>
          <span className="brand-mark" aria-hidden="true" />
          LifeOS
        </a>
        <nav>
          {APP_ROUTES.map((item) => (
            <a
              className={route?.key === item.key ? "nav-item active" : "nav-item"}
              href={item.path}
              key={item.key}
              aria-current={route?.key === item.key ? "page" : undefined}
              aria-label={item.label}
              onClick={(event) => navigate(event, item.path)}
            >
              <RouteIcon routeKey={item.key} />
              {NAV_LABEL[item.key]}
            </a>
          ))}
        </nav>
        <div className="secondary-links" aria-label="Công cụ phụ">
          <QuickCapture apiUrl={apiUrl} />
          <a href="/inbox" aria-current={route?.key === "inbox" ? "page" : undefined} onClick={(event) => navigate(event, "/inbox")}>
            <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 13h4l2 3h4l2-3h4M5 6h14l1 7v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5z" />
            </svg>
            Inbox
          </a>
          <a href="/incubator" aria-current={route?.key === "incubator" ? "page" : undefined} onClick={(event) => navigate(event, "/incubator")}>
            <ShieldIcon />
            Được giữ lại
          </a>
          <a href="/get-unstuck" aria-current={route?.key === "get-unstuck" ? "page" : undefined} onClick={(event) => navigate(event, "/get-unstuck")}>
            <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 3 4 6v6c0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9V6z" />
              <path d="M12 9v3M12 15v.5" />
            </svg>
            Gỡ vướng
          </a>
          <a href="/clarity" aria-current={route?.key === "clarity" ? "page" : undefined} onClick={(event) => navigate(event, "/clarity")}>
            <ClarityIcon />
            Làm rõ lại (Clarity Reset)
          </a>
          <ApiBadge state={apiState} />
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <ContextHeader route={route} />
        </header>

        <div className="route-enter" key={route?.key ?? "unknown"}>
          {route ? <RouteContent route={route} apiUrl={apiUrl} /> : <UnknownRoute />}
        </div>
      </main>
    </div>
  );
}

function ContextHeader({ route }: { route: AppRoute | null }) {
  if (!route) {
    return (
      <div className="context-stamp">
        <span className="kicker">LifeOS</span>
        <h1>Trang này không tồn tại</h1>
      </div>
    );
  }

  if (route.key === "now") {
    const { partOfDay, weekday, dayMonth } = describeToday();
    return (
      <div className="context-stamp">
        <span className="kicker">{partOfDay}</span>
        <h1>
          {weekday}, <em>{dayMonth}</em>
        </h1>
      </div>
    );
  }

  const heading = PAGE_HEADING[route.key];
  return (
    <div className="context-stamp">
      <span className="kicker">{heading.kicker}</span>
      <h1>{heading.title}</h1>
    </div>
  );
}

function RouteContent({ route, apiUrl }: { route: AppRoute; apiUrl: string }) {
  if (route.key === "clarity") return <ClarityReset apiUrl={apiUrl} />;
  if (route.key === "direction") return <DirectionPage apiUrl={apiUrl} />;
  if (route.key === "now") return <NowPage apiUrl={apiUrl} />;
  if (route.key === "execute") return <ExecutePage apiUrl={apiUrl} />;
  if (route.key === "me") return <MePage apiUrl={apiUrl} />;
  if (route.key === "reflect") return <DailyClosePage apiUrl={apiUrl} />;
  if (route.key === "inbox") return <InboxPage apiUrl={apiUrl} />;
  if (route.key === "incubator") return <IncubatorPage apiUrl={apiUrl} />;
  if (route.key === "get-unstuck") return <GetUnstuckPage apiUrl={apiUrl} />;

  const unhandledRoute = route as AppRoute;
  return (
    <EmptyState
      label={NAV_LABEL[unhandledRoute.key]}
      title="Khu này mở khi vòng lặp tương ứng bắt đầu."
      actions={
        <a className="secondary-button link-button" href="/">
          Về NOW
        </a>
      }
    >
      Route đã có chỗ trong shell, nhưng dữ liệu và thao tác chỉ được thêm khi vertical slice tương ứng được bật.
    </EmptyState>
  );
}

function UnknownRoute() {
  return (
    <ErrorState title="Đường dẫn này không có trong LifeOS">
      Dùng điều hướng bên cạnh để quay về một khu đã được định nghĩa.
    </ErrorState>
  );
}

function ApiBadge({ state }: { state: AsyncState<HealthStatus> }) {
  if (state.kind === "loading") return <LoadingState label="Đang kiểm tra kết nối" />;
  if (state.kind === "error") {
    return (
      <span className="status offline" title={state.message} role="status">
        Mất kết nối máy chủ
      </span>
    );
  }
  return (
    <span className="status online" title={`Healthy at ${state.data.timestamp}`} role="status">
      Đã kết nối
    </span>
  );
}

export function describeToday(now = new Date()): { partOfDay: string; weekday: string; dayMonth: string } {
  const hour = now.getHours();
  const partOfDay = hour < 11 ? "Buổi sáng" : hour < 14 ? "Buổi trưa" : hour < 18 ? "Buổi chiều" : "Buổi tối";
  const rawWeekday = new Intl.DateTimeFormat("vi-VN", { weekday: "long" }).format(now);
  const weekday = rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1);
  const dayMonth = `${now.getDate()} tháng ${now.getMonth() + 1}`;
  return { partOfDay, weekday, dayMonth };
}
