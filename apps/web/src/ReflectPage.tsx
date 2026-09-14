import { useEffect, useMemo, useState } from "react";
import type { ActionResultOutcome, DailyCloseView } from "@lifeos/domain";
import { createApiClient } from "./api";
import { browserLocalDate, browserTzOffsetMinutes, createResultApiClient } from "./result-api";
import { resultErrorMessage } from "./ResultPanel";
import type { AsyncState } from "./ui-states";

const OUTCOME_LABELS: Record<ActionResultOutcome, string> = {
  completed: "Đã xong",
  partial: "Xong một phần",
  postponed: "Dời lại",
  blocked: "Bị chặn",
  dropped: "Bỏ"
};

/**
 * B5 Daily Close V0. Everything shown here is a recorded fact plus the user's
 * own note: no pattern inference, no Weekly Adapt, no Get Unstuck.
 */
export function ReflectPage({ apiUrl }: { apiUrl: string }) {
  const resultApi = useMemo(() => createResultApiClient(apiUrl), [apiUrl]);
  const sessionApi = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const localDate = useMemo(() => browserLocalDate(), []);
  const tzOffsetMinutes = useMemo(() => browserTzOffsetMinutes(), []);

  const [state, setState] = useState<AsyncState<DailyCloseView>>({ kind: "loading" });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setState({ kind: "loading" });
        await sessionApi.bootstrapSession(controller.signal);
        const view = await resultApi.getDailyClose(localDate, tzOffsetMinutes, controller.signal);
        setState({ kind: "success", data: view });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ kind: "error", message: resultErrorMessage(error) });
      }
    };

    void load();
    return () => controller.abort();
  }, [localDate, resultApi, sessionApi, tzOffsetMinutes]);

  const close = async () => {
    try {
      setBusy(true);
      setMutationError(null);
      const view = await resultApi.commitDailyClose({
        localDate,
        tzOffsetMinutes,
        ...(note.trim().length > 0 ? { note: note.trim() } : {})
      });
      setState({ kind: "success", data: view });
      setNote("");
    } catch (error) {
      setMutationError(resultErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (state.kind === "loading") {
    return (
      <div className="px-5 pt-9" aria-busy="true">
        <p className="text-sm" style={{ color: "var(--text-3)" }}>Đang tải tổng kết ngày…</p>
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="px-5 pt-9">
        <div className="rounded-2xl p-4" style={{ background: "var(--red-bg)", border: "1px solid var(--border)" }}>
          <p className="text-[10px] font-extrabold tracking-widest mb-1" style={{ color: "var(--red)" }}>CHƯA TẢI ĐƯỢC TỔNG KẾT NGÀY</p>
          <p className="text-sm" style={{ color: "var(--text-2)" }}>{state.message}</p>
        </div>
      </div>
    );
  }

  const view = state.data;
  const summary = view.summary;
  const stats = [
    { label: "kết quả đã ghi", value: summary.resultsRecorded, color: "var(--text)" },
    { label: "đã xong", value: summary.completed, color: "var(--green)" },
    { label: "một phần", value: summary.partial, color: "var(--primary)" },
    { label: "dời lại", value: summary.postponed, color: "var(--amber)" },
    { label: "bị chặn", value: summary.blocked, color: "var(--red)" },
    { label: "bỏ", value: summary.dropped, color: "var(--text-3)" },
    { label: "phiên Focus", value: summary.focusSessions, color: "var(--text)" },
    { label: "phút Focus", value: summary.focusMinutes, color: "var(--text)" },
    { label: "phân tâm đã ghi", value: summary.distractionsCaptured, color: "var(--text-2)" }
  ];

  return (
    <div className="pb-6 md:max-w-3xl">
      {/* Hero — ported from the Figma prototype (ReflectScreen) */}
      <div className="hero-reflect relative overflow-hidden px-5 pt-9 pb-5 md:px-8">
        <svg className="absolute pointer-events-none" style={{ top: 12, right: 22, opacity: 0.2 }} width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M16 2L19 11H28L21 17L24 26L16 20L8 26L11 17L4 11H13L16 2Z" stroke="var(--text)" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
        <div className="relative z-10">
          <p className="text-[9px] font-extrabold tracking-widest mb-1.5" style={{ color: "var(--text-3)", letterSpacing: "0.14em" }}>CHỐT NGÀY</p>
          <h1 className="text-[48px] leading-none mb-1.5 font-display" style={{ color: "var(--text)", textTransform: "uppercase" }}>NHÌN LẠI</h1>
          <p className="font-hand" style={{ color: "var(--text-3)", fontSize: 17 }}>Hôm nay thực tế đã diễn ra như thế nào · {view.localDate}</p>
        </div>
      </div>

      <div className="px-4 pt-4 md:px-8 space-y-3">
        <div className="rounded-2xl p-4" style={CARD_STYLE}>
          <p className="text-[10px] font-extrabold tracking-widest mb-3" style={{ color: "var(--text-3)" }}>SỰ THẬT ĐÃ GHI</p>
          <div className="grid grid-cols-3 gap-2">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center px-2 py-2.5 rounded-xl" style={{ background: "var(--bg)" }}>
                <p className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-[10px]" style={{ color: "var(--text-3)" }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {view.results.length > 0 ? (
          <div className="rounded-2xl overflow-hidden" style={CARD_STYLE}>
            {view.results.map((result, index) => (
              <div
                key={result.id}
                className="px-4 py-3.5 flex items-start gap-3"
                style={{ borderBottom: index < view.results.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <span className="text-[10px] font-extrabold px-2 py-1 rounded-lg flex-shrink-0" style={{ background: "var(--primary-bg)", color: "var(--primary)" }}>
                  {OUTCOME_LABELS[result.outcome]}
                </span>
                <div className="flex-1 min-w-0">
                  {result.note ? <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>{result.note}</p> : null}
                  {result.reason ? <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Lý do: {result.reason}</p> : null}
                </div>
                {result.focusMinutes === undefined ? null : (
                  <span className="text-xs font-bold flex-shrink-0" style={{ color: "var(--text-3)" }}>{result.focusMinutes} ph</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl p-5 text-center" style={CARD_STYLE}>
            <p className="text-sm" style={{ color: "var(--text-3)" }}>Chưa có kết quả nào được ghi cho ngày này.</p>
          </div>
        )}

        {view.closed ? (
          <div className="rounded-2xl p-4" role="status" style={{ background: "var(--green-bg)", border: "1px solid var(--border)" }}>
            <p className="text-[10px] font-extrabold tracking-widest mb-1" style={{ color: "var(--green)" }}>ĐÃ CHỐT</p>
            <p className="text-sm" style={{ color: "var(--text-2)" }}>Lúc {formatDateTime(view.closed.closedAt)}.</p>
            {view.closed.note ? <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--text-2)" }}>{view.closed.note}</p> : null}
          </div>
        ) : (
          <div className="rounded-2xl p-4" style={CARD_STYLE}>
            <label className="block mb-3">
              <span className="block text-[10px] font-extrabold tracking-widest mb-1.5" style={{ color: "var(--text-3)" }}>GHI CHÚ CỦA BẠN (TUỲ CHỌN)</span>
              <textarea
                value={note}
                rows={3}
                maxLength={2000}
                disabled={busy}
                onChange={(event) => setNote(event.target.value)}
                className="w-full px-3.5 py-3 rounded-2xl text-sm"
                style={{ background: "var(--bg)", border: "1px solid var(--border-2)", color: "var(--text)" }}
                placeholder="Chỉ những gì bạn muốn tự nhớ lại. LifeOS không tự suy diễn thêm."
              />
            </label>
            {mutationError ? (
              <p className="text-xs px-3.5 py-3 rounded-2xl mb-3" role="alert" style={{ color: "var(--red)", background: "var(--red-bg)", border: "1px solid var(--border)" }}>
                {mutationError}
              </p>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void close()}
              className="btn-primary-action w-full h-12 rounded-2xl font-display text-sm active:scale-[0.97] disabled:opacity-50"
            >
              {busy ? "Đang chốt…" : "Chốt ngày"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const CARD_STYLE = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-card)"
} as const;

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}
