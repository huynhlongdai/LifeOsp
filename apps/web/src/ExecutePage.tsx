import { useEffect, useMemo, useState } from "react";
import type { ActionView, ExecuteBoardView } from "@lifeos/domain";
import { ApiRequestError, createApiClient } from "./api";

const ACTION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  candidate: { label: "Ứng viên", color: "var(--text-3)" },
  ready: { label: "Sẵn sàng", color: "var(--primary)" },
  active: { label: "Đang làm", color: "var(--amber)" },
  completed: { label: "Hoàn thành", color: "var(--green)" },
  partial: { label: "Một phần", color: "var(--amber)" },
  postponed: { label: "Hoãn", color: "var(--text-3)" },
  blocked: { label: "Kẹt", color: "var(--red)" },
  dropped: { label: "Bỏ", color: "var(--text-3)" }
};

const DONE_STATUSES = new Set(["completed", "dropped"]);

/**
 * EXECUTE shows the confirmed Season as Outcome → Project → Action. It is read-only in
 * this slice: Actions change state through Focus and Result, never by a tap on the board.
 */
export function ExecutePage({ apiUrl }: { apiUrl: string }) {
  const api = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "empty" }
    | { kind: "ready"; board: ExecuteBoardView }
    | { kind: "error"; message: string }
  >({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });

    api
      .getExecuteBoard(controller.signal)
      .then((board) => setState(board ? { kind: "ready", board } : { kind: "empty" }))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (reason instanceof ApiRequestError && reason.status === 401) {
          setState({ kind: "empty" });
          return;
        }
        setState({ kind: "error", message: reason instanceof Error ? reason.message : "Không thể tải EXECUTE." });
      });

    return () => controller.abort();
  }, [api]);

  if (state.kind === "loading") {
    return (
      <div className="px-5 pt-9" role="status">
        <p className="text-sm" style={{ color: "var(--text-3)" }}>Đang tải bảng thực thi…</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="px-5 pt-9">
        <div className="rounded-2xl p-4" role="alert" style={{ background: "var(--red-bg)", border: "1px solid var(--border)" }}>
          <p className="text-[10px] font-extrabold tracking-widest mb-1" style={{ color: "var(--red)" }}>EXECUTE</p>
          <p className="text-sm" style={{ color: "var(--text-2)" }}>{state.message}</p>
        </div>
      </div>
    );
  }

  if (state.kind === "empty") {
    return (
      <div className="pb-8 md:max-w-4xl">
        <ExecuteHero subtitle="Chưa có Season nào đang chạy" total={0} done={0} />
        <div className="px-4 md:px-8">
          <div className="rounded-3xl p-6" style={CARD}>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-2)" }}>
              EXECUTE chỉ hiển thị công việc thuộc một Season đã được bạn xác nhận. Hãy xác nhận hướng đi trước, rồi
              thêm Outcome và Project cho Season đó.
            </p>
            <a href="/direction" className="btn-primary-action inline-flex items-center justify-center w-full h-12 rounded-2xl font-display text-sm" style={{ textDecoration: "none" }}>
              Mở DIRECTION
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { board } = state;
  const allActions = board.outcomes.flatMap((group) => [
    ...group.projects.flatMap((project) => project.actions),
    ...group.unassignedActions
  ]);
  const doneCount = allActions.filter((action) => DONE_STATUSES.has(action.status)).length;

  return (
    <div className="pb-8 md:max-w-4xl">
      <ExecuteHero subtitle={board.seasonTitle} total={allActions.length} done={doneCount} />

      <div className="px-4 pt-4 md:px-8">
        {board.outcomes.length === 0 ? (
          <div className="rounded-3xl p-6" style={CARD}>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
              Season <strong>{board.seasonTitle}</strong> chưa có Outcome nào. LifeOS không tự tạo Outcome —
              bạn quyết định Season này cần đạt kết quả gì.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {board.outcomes.map((group) => (
              <OutcomeCard key={group.outcome.id} group={group} />
            ))}
          </div>
        )}

        <p className="text-[11px] mt-4" style={{ color: "var(--text-3)" }}>
          Bảng này chỉ đọc: trạng thái Action thay đổi qua Focus và ô ghi kết quả, không đổi bằng một cú chạm.
        </p>
      </div>
    </div>
  );
}

const CARD = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-card)"
} as const;

function ExecuteHero({ subtitle, total, done }: { subtitle: string; total: number; done: number }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="hero-execute relative overflow-hidden px-5 pt-9 pb-5 md:px-8">
      <svg className="absolute pointer-events-none" style={{ top: 10, right: 18, opacity: 0.2 }} width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
        <path d="M15 2L18 11H27L20 17L23 26L15 20L7 26L10 17L3 11H12L15 2Z" stroke="var(--text)" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
      <div className="relative z-10 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[9px] font-extrabold tracking-widest mb-1.5" style={{ color: "var(--text-3)", letterSpacing: "0.14em" }}>EXECUTE</p>
          <h1 className="text-[48px] leading-none font-display" style={{ color: "var(--text)", textTransform: "uppercase" }}>THỰC THI</h1>
          <p className="font-hand mt-1 truncate" style={{ color: "var(--text-3)", fontSize: 17 }}>{subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 pb-1 flex-shrink-0">
          <span className="text-[10px] font-bold" style={{ color: "var(--text-3)" }}>Đã xong {done}/{total}</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full" style={{ width: `${percent}%`, background: "var(--primary)" }} />
            </div>
            <span className="text-sm font-extrabold" style={{ color: "var(--primary)" }}>{percent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OutcomeCard({ group }: { group: ExecuteBoardView["outcomes"][number] }) {
  const [open, setOpen] = useState(true);
  const actions = [...group.projects.flatMap((project) => project.actions), ...group.unassignedActions];
  const done = actions.filter((action) => DONE_STATUSES.has(action.status)).length;
  const percent = actions.length === 0 ? 0 : Math.round((done / actions.length) * 100);

  return (
    <div className="rounded-2xl overflow-hidden" style={CARD}>
      <button type="button" className="w-full flex items-center gap-3 px-4 py-3.5 text-left" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: "var(--primary-bg)", border: "1px solid var(--primary-border)" }} aria-hidden="true">🎯</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>{group.outcome.title}</p>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: "var(--primary-bg)", color: "var(--primary)" }}>
              {done}/{actions.length}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-2)" }}>
              <div className="h-full rounded-full" style={{ width: `${percent}%`, background: "var(--primary)" }} />
            </div>
            <span className="text-[10px] font-bold flex-shrink-0" style={{ color: "var(--primary)" }}>{percent}%</span>
          </div>
          {group.outcome.successDefinition ? (
            <p className="text-[10px] mt-1 truncate" style={{ color: "var(--text-3)" }}>📌 {group.outcome.successDefinition}</p>
          ) : null}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "", transition: "transform 0.2s", color: "var(--text-3)" }}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          {group.projects.map((project) => (
            <div key={project.project.id}>
              <div className="px-4 py-2 flex items-center gap-2" style={{ background: "var(--bg-2)" }}>
                <span className="text-xs font-bold" style={{ color: "var(--text-2)" }}>{project.project.title}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: "var(--card)", color: "var(--text-3)" }}>
                  {project.project.status}
                </span>
              </div>
              {project.actions.length === 0 ? (
                <p className="px-4 py-3 text-xs" style={{ color: "var(--text-3)" }}>Chưa có Action nào trong Project này.</p>
              ) : (
                project.actions.map((action, index) => (
                  <ActionRow key={action.id} action={action} last={index === project.actions.length - 1} />
                ))
              )}
            </div>
          ))}

          {group.unassignedActions.length > 0 ? (
            <div>
              <div className="px-4 py-2" style={{ background: "var(--bg-2)" }}>
                <span className="text-xs font-bold" style={{ color: "var(--text-2)" }}>Không thuộc Project</span>
              </div>
              {group.unassignedActions.map((action, index) => (
                <ActionRow key={action.id} action={action} last={index === group.unassignedActions.length - 1} />
              ))}
            </div>
          ) : null}

          {group.projects.length === 0 && group.unassignedActions.length === 0 ? (
            <p className="px-4 py-3 text-xs" style={{ color: "var(--text-3)" }}>Outcome này chưa có Project hay Action nào.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ActionRow({ action, last }: { action: ActionView; last: boolean }) {
  const status = ACTION_STATUS_LABELS[action.status] ?? { label: action.status, color: "var(--text-3)" };
  const done = DONE_STATUSES.has(action.status);

  return (
    <div className="flex items-start gap-3 py-2.5 px-4" style={{ opacity: done ? 0.55 : 1, borderBottom: last ? "none" : "1px solid var(--border)" }}>
      <span
        className="rounded-full flex-shrink-0 mt-1 flex items-center justify-center"
        aria-hidden="true"
        style={{ width: 18, height: 18, border: "2px solid", borderColor: done ? "var(--primary)" : "var(--border-2)", background: done ? "var(--primary)" : "transparent" }}
      >
        {done ? (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L20 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: done ? "var(--text-3)" : "var(--text)", textDecoration: done ? "line-through" : "none" }}>
          {action.title}
        </p>
        {action.doneCondition ? (
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>{action.doneCondition}</p>
        ) : null}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "var(--bg-2)", color: status.color }}>
            {status.label}
          </span>
          {action.estimatedMinutes ? (
            <span className="text-[10px]" style={{ color: "var(--text-3)" }}>{action.estimatedMinutes} phút</span>
          ) : null}
          {action.priority ? (
            <span className="text-[10px]" style={{ color: "var(--text-3)" }}>ưu tiên {action.priority}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
