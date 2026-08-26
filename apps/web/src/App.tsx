import { useEffect, useState } from "react";
import type { HealthStatus } from "@lifeos/domain";

const NAV_ITEMS = ["NOW", "DIRECTION", "EXECUTE", "REFLECT", "ME"] as const;

type ApiState =
  | { kind: "checking" }
  | { kind: "online"; health: HealthStatus }
  | { kind: "offline" };

export function App() {
  const [apiState, setApiState] = useState<ApiState>({ kind: "checking" });
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${apiUrl}/health`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("API health check failed");
        return (await response.json()) as HealthStatus;
      })
      .then((health) => setApiState({ kind: "online", health }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setApiState({ kind: "offline" });
      });

    return () => controller.abort();
  }, [apiUrl]);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="LifeOS navigation">
        <div className="brand">LifeOS</div>
        <nav>
          {NAV_ITEMS.map((item, index) => (
            <button className={index === 0 ? "nav-item active" : "nav-item"} key={item} type="button">
              {item}
            </button>
          ))}
        </nav>
        <div className="secondary-links">
          <span>Inbox</span>
          <span>Not Now</span>
          <span>Ask LifeOS</span>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">FOUNDATION / NOW</p>
            <h1>Biết điều gì quan trọng. Biết việc cần làm tiếp theo.</h1>
          </div>
          <ApiBadge state={apiState} />
        </header>

        <section className="hero-card">
          <p className="eyebrow">RIGHT NOW</p>
          <h2>Foundation đang được xây dựng</h2>
          <p>
            Màn hình này chỉ chứng minh Web ↔ API wiring. Recommendation thật sẽ xuất hiện sau Vertical Slice
            Capture → Clarify → Direction.
          </p>
          <button type="button" disabled>
            Start focus — coming next
          </button>
        </section>

        <section className="grid">
          <article className="panel">
            <p className="eyebrow">CURRENT DIRECTION</p>
            <h3>Chưa có dữ liệu</h3>
            <p>LifeOS sẽ không giả lập mục tiêu chỉ để dashboard trông đầy.</p>
          </article>
          <article className="panel">
            <p className="eyebrow">NOT NOW</p>
            <h3>Protected space</h3>
            <p>Ý tưởng chưa cần làm sẽ được giữ an toàn, không cạnh tranh với focus hiện tại.</p>
          </article>
        </section>
      </main>
    </div>
  );
}

function ApiBadge({ state }: { state: ApiState }) {
  if (state.kind === "checking") return <span className="status checking">API checking</span>;
  if (state.kind === "offline") return <span className="status offline">API offline</span>;
  return <span className="status online">API online</span>;
}
