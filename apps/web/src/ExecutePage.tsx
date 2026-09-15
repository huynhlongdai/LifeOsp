import { useEffect, useMemo, useState } from "react";
import type { ExecuteActionView, ExecuteBoardView, ExecuteOutcomeSummary, ExecuteProjectSummary } from "@lifeos/domain";
import { createApiClient } from "./api";
import { createExecuteApiClient } from "./execute-api";
import { EmptyState, ErrorState, type AsyncState } from "./ui-states";

// Execute landing (spec §7.1). Purpose: inspect execution structure without
// competing with NOW. Sections are fixed (ready / candidates / blocked /
// recently finished) — no huge backlog by default, no completion percentage,
// only counted facts.

type SectionKey = "ready" | "candidates" | "blocked" | "recentlyFinished";

const SECTION_ORDER: SectionKey[] = ["candidates", "blocked", "ready", "recentlyFinished"];

const SECTION_COPY: Record<SectionKey, { title: string; empty: string; tone: string }> = {
  candidates: { title: "Đang chờ bạn xác nhận", empty: "Không có gợi ý nào đang chờ.", tone: "active" },
  blocked: { title: "Đang bị chặn", empty: "Không có việc nào đang bị chặn.", tone: "notnow" },
  ready: { title: "Sẵn sàng làm", empty: "Chưa có việc nào sẵn sàng.", tone: "reflect" },
  recentlyFinished: { title: "Vừa xong gần đây", empty: "Chưa có việc nào được ghi kết quả.", tone: "maintain" }
};

export function ExecutePage({ apiUrl }: { apiUrl: string }) {
  const executeApi = useMemo(() => createExecuteApiClient(apiUrl), [apiUrl]);
  const sessionApi = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [state, setState] = useState<AsyncState<ExecuteBoardView>>({ kind: "loading" });
  const [outcomeFilter, setOutcomeFilter] = useState<string | "all">("all");
  const [projectFilter, setProjectFilter] = useState<string | "all">("all");

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setState({ kind: "loading" });
        await sessionApi.bootstrapSession(controller.signal);
        const board = await executeApi.getBoard(controller.signal);
        setState({ kind: "success", data: board });
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setState({ kind: "error", message: reason instanceof Error ? reason.message : "Không thể tải Execute" });
      }
    };
    void load();
    return () => controller.abort();
  }, [executeApi, sessionApi]);

  if (state.kind === "loading") {
    return (
      <section className="execute-page" aria-busy="true">
        <div className="now-loading-strip" />
        <div className="now-loading-card"><span /><span /><span /></div>
      </section>
    );
  }
  if (state.kind === "error") return <ErrorState title="Chưa mở được Execute">{state.message}</ErrorState>;

  const board = state.data;
  const totalCount = board.ready.length + board.candidates.length + board.blocked.length + board.recentlyFinished.length;

  if (totalCount === 0) {
    return (
      <EmptyState
        label="Execute"
        title="Chưa có gì để thực thi."
        actions={<a className="secondary-button link-button" href="/direction">Bắt đầu từ Direction</a>}
      >
        Execute hiển thị các Action gắn với Outcome/Project đang hoạt động. Xác nhận một Outcome trước, việc sẽ xuất hiện ở đây.
      </EmptyState>
    );
  }

  const projectByOutcome = groupProjectsByOutcome(board.projects);
  const visibleProjects = outcomeFilter === "all" ? board.projects : projectByOutcome.get(outcomeFilter) ?? [];
  const matchesFilter = (action: ExecuteActionView) => {
    if (projectFilter !== "all") return action.projectId === projectFilter;
    if (outcomeFilter !== "all") return action.outcomeId === outcomeFilter;
    return true;
  };

  return (
    <section className="execute-page">
      {board.outcomes.length > 0 ? (
        <div className="execute-filters" role="group" aria-label="Lọc theo Outcome/Project">
          <select
            aria-label="Lọc theo Outcome"
            value={outcomeFilter}
            onChange={(event) => {
              setOutcomeFilter(event.target.value);
              setProjectFilter("all");
            }}
          >
            <option value="all">Tất cả Outcome</option>
            {board.outcomes.map((outcome) => (
              <option key={outcome.id} value={outcome.id}>
                {outcome.title}
              </option>
            ))}
          </select>
          {visibleProjects.length > 0 ? (
            <select aria-label="Lọc theo Project" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
              <option value="all">Mọi Project</option>
              {visibleProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      ) : null}

      {SECTION_ORDER.map((key) => {
        const items = board[key].filter(matchesFilter);
        return <ExecuteSection key={key} sectionKey={key} items={items} outcomes={board.outcomes} projects={board.projects} />;
      })}
    </section>
  );
}

function ExecuteSection({
  sectionKey,
  items,
  outcomes,
  projects
}: {
  sectionKey: SectionKey;
  items: ExecuteActionView[];
  outcomes: ExecuteOutcomeSummary[];
  projects: ExecuteProjectSummary[];
}) {
  const copy = SECTION_COPY[sectionKey];
  if (items.length === 0) return null;

  return (
    <div className="execute-section">
      <div className="execute-section-head">
        <h2>{copy.title}</h2>
        <span className="pill num">{items.length}</span>
      </div>
      <ul className="execute-list">
        {items.map((action) => (
          <ExecuteCard key={action.id} action={action} tone={copy.tone} outcomes={outcomes} projects={projects} />
        ))}
      </ul>
    </div>
  );
}

function ExecuteCard({
  action,
  tone,
  outcomes,
  projects
}: {
  action: ExecuteActionView;
  tone: string;
  outcomes: ExecuteOutcomeSummary[];
  projects: ExecuteProjectSummary[];
}) {
  const projectTitle = action.projectId ? projects.find((project) => project.id === action.projectId)?.title : undefined;
  const outcomeTitle = outcomes.find((outcome) => outcome.id === action.outcomeId)?.title;

  return (
    <li className={`sheet tint execute-card ${tone}`}>
      <div className="execute-card-head">
        <b className="execute-card-title">{action.title}</b>
        {action.estimatedMinutes ? <small className="num">{action.estimatedMinutes} phút</small> : null}
      </div>
      {(outcomeTitle || projectTitle) ? (
        <p className="muted execute-card-context">{[outcomeTitle, projectTitle].filter(Boolean).join(" · ")}</p>
      ) : null}
      {action.doneCondition ? <p>{action.doneCondition}</p> : null}
      {action.status === "blocked" && action.blockedReason ? (
        <p className="execute-card-blocked">Đang chặn: {action.blockedReason}</p>
      ) : null}
      {action.status === "blocked" ? (
        <a className="text-button link-button" href="/get-unstuck">
          Gỡ vướng việc này
        </a>
      ) : null}
      {action.completedAt ? <small className="muted">Ghi nhận {formatDate(action.completedAt)}</small> : null}
    </li>
  );
}

function groupProjectsByOutcome(projects: ExecuteProjectSummary[]): Map<string, ExecuteProjectSummary[]> {
  const map = new Map<string, ExecuteProjectSummary[]>();
  for (const project of projects) {
    const list = map.get(project.outcomeId) ?? [];
    list.push(project);
    map.set(project.outcomeId, list);
  }
  return map;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(date);
}
