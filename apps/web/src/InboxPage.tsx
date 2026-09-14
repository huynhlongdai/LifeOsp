import { useEffect, useMemo, useState } from "react";
import type { InboxCaptureView, InboxView } from "@lifeos/domain";
import { ApiRequestError, createApiClient } from "./api";

type FilterId = "all" | "unprocessed" | "interpreted" | "promoted";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  unprocessed: { label: "Chờ xử lý", bg: "var(--amber-bg)", color: "var(--amber)", icon: "○" },
  interpreted: { label: "Đã phân tích", bg: "var(--primary-bg)", color: "var(--primary)", icon: "◌" },
  corrected: { label: "Đã sửa", bg: "var(--primary-bg)", color: "var(--primary)", icon: "◌" },
  promoted: { label: "Đã dùng", bg: "var(--green-bg)", color: "var(--green)", icon: "✓" },
  archived: { label: "Lưu trữ", bg: "var(--bg-2)", color: "var(--text-3)", icon: "·" }
};

/**
 * INBOX is the capture timeline from the prototype, wired to real captures. Promoting a
 * capture still happens in Clarity Reset; this screen only reads and can ask the AI to
 * interpret a capture, which is an explicit user action.
 */
export function InboxPage({ apiUrl }: { apiUrl: string }) {
  const api = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [filter, setFilter] = useState<FilterId>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "ready"; inbox: InboxView } | { kind: "empty" } | { kind: "error"; message: string }
  >({ kind: "loading" });

  const load = useMemo(
    () => (signal?: AbortSignal) =>
      api
        .getInbox(signal)
        .then((inbox) => setState(inbox ? { kind: "ready", inbox } : { kind: "empty" }))
        .catch((reason: unknown) => {
          if (reason instanceof DOMException && reason.name === "AbortError") return;
          if (reason instanceof ApiRequestError && reason.status === 401) {
            setState({ kind: "empty" });
            return;
          }
          setState({ kind: "error", message: reason instanceof Error ? reason.message : "Không thể tải hộp chờ." });
        }),
    [api]
  );

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (state.kind === "loading") {
    return (
      <div className="px-5 pt-9" role="status">
        <p className="text-sm" style={{ color: "var(--text-3)" }}>Đang tải captures…</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="px-5 pt-9">
        <div className="rounded-2xl p-4" role="alert" style={{ background: "var(--red-bg)", border: "1px solid var(--border)" }}>
          <p className="text-[10px] font-extrabold tracking-widest mb-1" style={{ color: "var(--red)" }}>INBOX</p>
          <p className="text-sm" style={{ color: "var(--text-2)" }}>{state.message}</p>
        </div>
      </div>
    );
  }

  if (state.kind === "empty") {
    return (
      <div className="px-5 pt-9">
        <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-2)" }}>
            Chưa có phiên LifeOS nào trên thiết bị này. Mở NOW để bắt đầu, rồi dùng Brain Dump để ghi.
          </p>
        </div>
      </div>
    );
  }

  const captures = state.inbox.captures;
  const pendingCount = captures.filter((capture) => capture.processingStatus === "unprocessed").length;
  const filtered = captures.filter((capture) => {
    if (filter === "all") return true;
    if (filter === "interpreted") return capture.processingStatus === "interpreted" || capture.processingStatus === "corrected";
    return capture.processingStatus === filter;
  });

  const groups = groupByDay(filtered);

  const interpret = async (captureId: string) => {
    setBusyId(captureId);
    setActionError(null);
    try {
      await api.generateInterpretation(captureId);
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không phân tích được capture này.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="pb-8 md:max-w-2xl">
      <div className="relative px-5 pt-8 pb-5 md:px-8 overflow-hidden" style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 60% at 90% -10%, var(--primary-bg) 0%, transparent 70%)" }} />
        <div className="relative z-10 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-widest mb-1.5" style={{ color: "var(--text-3)" }}>INBOX</p>
            <h1 className="text-[28px] leading-none font-display" style={{ color: "var(--text)" }}>Captures</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>Mọi thứ bạn ghi đều được giữ nguyên văn.</p>
          </div>
          {pendingCount > 0 ? (
            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl flex-shrink-0" style={{ background: "var(--amber-bg)", border: "1px solid var(--border)" }}>
              <span className="text-xl font-bold leading-none" style={{ color: "var(--amber)" }}>{pendingCount}</span>
              <span className="text-[9px] font-bold mt-0.5" style={{ color: "var(--amber)" }}>CHỜ</span>
            </div>
          ) : null}
        </div>

        <div className="relative z-10 flex gap-1.5 mt-4 overflow-x-auto pb-0.5">
          {([
            { id: "all" as const, label: "Tất cả", count: captures.length },
            { id: "unprocessed" as const, label: "Chờ", count: pendingCount },
            {
              id: "interpreted" as const,
              label: "Đã phân tích",
              count: captures.filter((c) => c.processingStatus === "interpreted" || c.processingStatus === "corrected").length
            },
            { id: "promoted" as const, label: "Đã dùng", count: captures.filter((c) => c.processingStatus === "promoted").length }
          ]).map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold flex-shrink-0"
              style={{
                background: filter === id ? "var(--primary)" : "var(--bg-2)",
                color: filter === id ? "var(--primary-fg)" : "var(--text-2)",
                border: `1px solid ${filter === id ? "transparent" : "var(--border)"}`
              }}
            >
              {label}
              <span className="text-[10px] opacity-80 font-bold">{count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 md:px-8 space-y-6">
        {actionError ? (
          <p className="text-xs px-3.5 py-3 rounded-2xl" role="alert" style={{ background: "var(--red-bg)", color: "var(--red)" }}>
            {actionError}
          </p>
        ) : null}

        {groups.map((group) => (
          <div key={group.label}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-bold tracking-widest" style={{ color: "var(--text-3)" }}>{group.label.toUpperCase()}</span>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>

            <div className="relative">
              <div className="absolute left-[19px] top-0 bottom-0 w-px" style={{ background: "var(--border)" }} />
              <div className="space-y-3">
                {group.items.map((capture) => {
                  const config = STATUS_CONFIG[capture.processingStatus] ?? STATUS_CONFIG.unprocessed!;
                  const isOpen = expanded === capture.id;
                  return (
                    <div key={capture.id} className="flex gap-3">
                      <div className="relative z-10 flex-shrink-0 flex flex-col items-center" style={{ width: 40 }}>
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-2.5"
                          style={{ background: config.bg, color: config.color, border: `1.5px solid ${config.color}` }}
                          aria-hidden="true"
                        >
                          {config.icon}
                        </div>
                        <span className="text-[9px] mt-1 font-medium" style={{ color: "var(--text-3)" }}>{formatTime(capture.createdAt)}</span>
                      </div>

                      <div
                        className="flex-1 rounded-2xl overflow-hidden"
                        style={{
                          background: isOpen ? "var(--card)" : "var(--surface)",
                          border: `1px solid ${isOpen ? "var(--primary-border)" : "var(--border)"}`,
                          boxShadow: isOpen ? "var(--shadow-raise)" : "none"
                        }}
                      >
                        <button
                          type="button"
                          className="flex items-start gap-3 w-full p-4 text-left"
                          onClick={() => setExpanded(isOpen ? null : capture.id)}
                          aria-expanded={isOpen}
                        >
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm leading-relaxed whitespace-pre-wrap"
                              style={
                                isOpen
                                  ? { color: "var(--text)" }
                                  : {
                                      color: "var(--text)",
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden"
                                    }
                              }
                            >
                              {capture.rawText}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap mt-2">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: config.bg, color: config.color }}>
                                {config.label}
                              </span>
                              {capture.hasInterpretation ? (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--primary-bg)", color: "var(--primary)" }}>
                                  đã có bản phân tích
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                            style={{ transform: isOpen ? "rotate(180deg)" : "", transition: "transform 0.2s", color: "var(--text-3)", flexShrink: 0, marginTop: 4 }}
                          >
                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>

                        {isOpen ? (
                          <div className="px-4 pb-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                            <p className="text-[11px] mb-3" style={{ color: "var(--text-3)" }}>
                              Ghi lúc {formatDateTime(capture.createdAt)}. LifeOS không tự biến capture này thành cam kết.
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {capture.hasInterpretation ? null : (
                                <button
                                  type="button"
                                  disabled={busyId === capture.id}
                                  onClick={() => void interpret(capture.id)}
                                  className="flex-1 h-9 rounded-xl text-xs font-semibold"
                                  style={{ background: "var(--primary)", color: "var(--primary-fg)", minWidth: 140 }}
                                >
                                  {busyId === capture.id ? "Đang phân tích…" : "Phân tích bằng AI"}
                                </button>
                              )}
                              <a
                                href="/clarity"
                                className="flex-1 h-9 rounded-xl text-xs font-semibold flex items-center justify-center"
                                style={{ background: "var(--bg-2)", color: "var(--text-2)", border: "1px solid var(--border)", minWidth: 140, textDecoration: "none" }}
                              >
                                Mở Clarity Reset
                              </a>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 ? (
          <div className="rounded-2xl p-10 flex flex-col items-center gap-3 mt-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <span className="text-3xl" aria-hidden="true">📭</span>
            <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>Không có capture nào ở bộ lọc này.</p>
          </div>
        ) : null}

        <div className="px-4 py-3 rounded-2xl" style={{ background: "var(--primary-bg)", border: "1px solid var(--primary-border)" }}>
          <p className="text-xs leading-relaxed" style={{ color: "var(--primary)" }}>
            Phân tích chỉ chạy khi bạn bấm. Việc biến capture thành Direction, Season hay Action luôn diễn ra trong Clarity Reset.
          </p>
        </div>
      </div>
    </div>
  );
}

function groupByDay(captures: InboxCaptureView[]): Array<{ label: string; items: InboxCaptureView[] }> {
  const today: InboxCaptureView[] = [];
  const yesterday: InboxCaptureView[] = [];
  const older: InboxCaptureView[] = [];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);

  for (const capture of captures) {
    const created = new Date(capture.createdAt).getTime();
    if (created >= startOfToday.getTime()) today.push(capture);
    else if (created >= startOfYesterday.getTime()) yesterday.push(capture);
    else older.push(capture);
  }

  return [
    { label: "Hôm nay", items: today },
    { label: "Hôm qua", items: yesterday },
    { label: "Trước đó", items: older }
  ].filter((group) => group.items.length > 0);
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString("vi-VN");
}
