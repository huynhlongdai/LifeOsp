import { useEffect, useMemo, useState } from "react";
import type { ReflectWeekView } from "@lifeos/domain";
import { createApiClient } from "./api";

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/**
 * The week in counted facts: focus minutes, Actions completed and which days were
 * actually closed. Days without data show as zero — nothing is smoothed or predicted.
 */
export function ReflectWeek({ apiUrl, tzOffsetMinutes }: { apiUrl: string; tzOffsetMinutes: number }) {
  const api = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [state, setState] = useState<{ kind: "loading" } | { kind: "ready"; week: ReflectWeekView } | { kind: "error"; message: string }>({
    kind: "loading"
  });

  useEffect(() => {
    const controller = new AbortController();
    api
      .getReflectWeek(tzOffsetMinutes, controller.signal)
      .then((week) => setState({ kind: "ready", week }))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setState({ kind: "error", message: reason instanceof Error ? reason.message : "Không tải được tuần này." });
      });
    return () => controller.abort();
  }, [api, tzOffsetMinutes]);

  if (state.kind === "loading") {
    return (
      <div className="rounded-2xl p-5" style={CARD} role="status">
        <p className="text-sm" style={{ color: "var(--text-3)" }}>Đang đọc 7 ngày gần nhất…</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="rounded-2xl p-4" role="alert" style={{ background: "var(--red-bg)", border: "1px solid var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-2)" }}>{state.message}</p>
      </div>
    );
  }

  const { week } = state;
  const maxMinutes = Math.max(60, ...week.days.map((day) => day.focusMinutes));

  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-4" style={CARD}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-extrabold tracking-widest" style={{ color: "var(--text-3)" }}>FOCUS 7 NGÀY</p>
          <span className="text-xs font-semibold" style={{ color: "var(--text-2)" }}>
            {(week.totals.focusMinutes / 60).toFixed(1)}h
          </span>
        </div>
        <div className="flex items-end gap-2" style={{ height: 120 }}>
          {week.days.map((day) => {
            const height = Math.round((day.focusMinutes / maxMinutes) * 100);
            const weekday = new Date(`${day.localDate}T00:00:00Z`).getUTCDay();
            return (
              <div key={day.localDate} className="flex-1 flex flex-col items-center justify-end gap-1.5" style={{ height: "100%" }}>
                <span className="text-[9px] font-bold" style={{ color: "var(--text-3)" }}>
                  {day.focusMinutes > 0 ? Math.round(day.focusMinutes) : ""}
                </span>
                <div
                  className="w-full rounded-lg"
                  style={{
                    height: `${Math.max(height, day.focusMinutes > 0 ? 6 : 2)}%`,
                    background: day.focusMinutes > 0 ? "linear-gradient(180deg, var(--primary), var(--blue))" : "var(--bg-2)"
                  }}
                  aria-label={`${day.localDate}: ${Math.round(day.focusMinutes)} phút focus`}
                />
                <span className="text-[10px] font-semibold" style={{ color: "var(--text-3)" }}>{DAY_LABELS[weekday]}</span>
                <span
                  className="rounded-full"
                  aria-label={day.closed ? "đã chốt ngày" : "chưa chốt ngày"}
                  style={{ width: 6, height: 6, background: day.closed ? "var(--green)" : "var(--border-2)" }}
                />
              </div>
            );
          })}
        </div>
        <p className="text-[11px] mt-3" style={{ color: "var(--text-3)" }}>
          Chấm xanh là ngày bạn đã chốt. Cột trống nghĩa là ngày đó không có phiên Focus nào được ghi.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Giờ focus" value={(week.totals.focusMinutes / 60).toFixed(1)} />
        <Stat label="Action xong" value={String(week.totals.actionsCompleted)} />
        <Stat label="Ngày đã chốt" value={`${week.totals.closedDays}/7`} />
      </div>

      <div className="rounded-2xl overflow-hidden" style={CARD}>
        {week.days
          .slice()
          .reverse()
          .map((day, index) => (
            <div
              key={day.localDate}
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: index < week.days.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              <span className="text-xs font-semibold" style={{ color: "var(--text-2)" }}>{formatLocalDate(day.localDate)}</span>
              <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
                {Math.round(day.focusMinutes)} phút · {day.focusSessions} phiên · {day.actionsCompleted} action
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

const CARD = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-card)"
} as const;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl px-2 py-2.5 text-center" style={CARD}>
      <p className="text-lg font-bold" style={{ color: "var(--text)" }}>{value}</p>
      <p className="text-[10px]" style={{ color: "var(--text-3)" }}>{label}</p>
    </div>
  );
}

function formatLocalDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}` : value;
}
