import { useEffect, useState, type MouseEvent } from "react";
import type { HealthStatus } from "@lifeos/domain";
import { createApiClient } from "./api";
import { APP_ROUTES, resolveRoute, type AppRoute } from "./routes";
import { EmptyState, ErrorState, LoadingState, type AsyncState } from "./ui-states";

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
    if (window.location.pathname === nextPath) return;
    window.history.pushState({}, "", nextPath);
    setPathname(nextPath);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="LifeOS navigation">
        <a className="brand" href="/" onClick={(event) => navigate(event, "/")}>
          LifeOS
        </a>
        <nav>
          {APP_ROUTES.map((item) => (
            <a
              className={route?.key === item.key ? "nav-item active" : "nav-item"}
              href={item.path}
              key={item.key}
              aria-current={route?.key === item.key ? "page" : undefined}
              onClick={(event) => navigate(event, item.path)}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="secondary-links" aria-label="Foundation status">
          <span>Foundation Milestone</span>
          <span>Product data: not seeded</span>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">FOUNDATION / {route?.label ?? "UNKNOWN"}</p>
            <h1>{route?.key === "now" ? "Biết điều gì quan trọng. Biết việc cần làm tiếp theo." : route?.label ?? "Route không tồn tại"}</h1>
          </div>
          <ApiBadge state={apiState} />
        </header>

        {route ? <RouteContent route={route} /> : <UnknownRoute />}
      </main>
    </div>
  );
}

function RouteContent({ route }: { route: AppRoute }) {
  if (route.key === "now") {
    return (
      <>
        <section className="hero-card">
          <p className="eyebrow">RIGHT NOW</p>
          <h2>NOW shell đã sẵn sàng</h2>
          <p>
            Web ↔ API contract đang hoạt động. Recommendation thật chỉ xuất hiện khi Vertical Slice A sở hữu dữ liệu và semantics tương ứng.
          </p>
        </section>
        <EmptyState title="Chưa có recommendation">
          LifeOS không tạo goal, action hay direction giả chỉ để lấp đầy màn hình.
        </EmptyState>
      </>
    );
  }

  return (
    <EmptyState title={`${route.label} chưa có dữ liệu`}>
      Route đã có ownership trong app shell, nhưng feature và dữ liệu chỉ được thêm khi vertical slice tương ứng bắt đầu.
    </EmptyState>
  );
}

function UnknownRoute() {
  return (
    <ErrorState title="Route không tồn tại">
      Dùng navigation của LifeOS để quay về một khu vực foundation đã được định nghĩa.
    </ErrorState>
  );
}

function ApiBadge({ state }: { state: AsyncState<HealthStatus> }) {
  if (state.kind === "loading") return <LoadingState label="API checking" />;
  if (state.kind === "error") {
    return (
      <span className="status offline" title={state.message} role="status">
        API offline
      </span>
    );
  }
  return (
    <span className="status online" title={`Healthy at ${state.data.timestamp}`} role="status">
      API online
    </span>
  );
}
