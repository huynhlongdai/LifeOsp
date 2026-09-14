import { useEffect, useMemo, useState } from "react";
import type { CoachView } from "@lifeos/domain";
import { ApiRequestError, createApiClient } from "./api";

const KIND_ICON: Record<string, string> = { focus: "🧠", result: "📝", closing: "🌙", capacity: "📅" };

/**
 * AI Coach as LifeOS is allowed to do it: observations built from counted facts, each
 * with the numbers behind it. No scores, no confidence percentages, no auto-scheduling.
 */
export function CoachPage({ apiUrl }: { apiUrl: string }) {
  const api = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [tab, setTab] = useState<"insights" | "capacity">("insights");
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "ready"; coach: CoachView } | { kind: "empty" } | { kind: "error"; message: string }
  >({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });

    api
      .getCoach(controller.signal)
      .then((coach) => setState(coach ? { kind: "ready", coach } : { kind: "empty" }))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (reason instanceof ApiRequestError && reason.status === 401) {
          setState({ kind: "empty" });
          return;
        }
        setState({ kind: "error", message: reason instanceof Error ? reason.message : "Không thể tải AI Coach." });
      });

    return () => controller.abort();
  }, [api]);

  if (state.kind === "loading") {
    return (
      <div className="px-5 pt-9" role="status">
        <p className="text-sm" style={{ color: "var(--text-3)" }}>Đang đọc dữ liệu bạn đã ghi…</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="px-5 pt-9">
        <div className="rounded-2xl p-4" role="alert" style={{ background: "var(--red-bg)", border: "1px solid var(--border)" }}>
          <p className="text-[10px] font-extrabold tracking-widest mb-1" style={{ color: "var(--red)" }}>AI COACH</p>
          <p className="text-sm" style={{ color: "var(--text-2)" }}>{state.message}</p>
        </div>
      </div>
    );
  }

  if (state.kind === "empty") {
    return (
      <div className="px-5 pt-9">
        <div className="rounded-2xl p-5" style={CARD}>
          <p className="text-sm" style={{ color: "var(--text-2)" }}>Chưa có phiên LifeOS nào trên thiết bị này.</p>
        </div>
      </div>
    );
  }

  const { coach } = state;
  const focusHours = (coach.capacity.focusMinutesLast7Days / 60).toFixed(1);
  const plannedHours = (coach.capacity.plannedWeeklyMinutes / 60).toFixed(0);
  const usedPercent =
    coach.capacity.plannedWeeklyMinutes === 0
      ? 0
      : Math.min(100, Math.round((coach.capacity.focusMinutesLast7Days / coach.capacity.plannedWeeklyMinutes) * 100));

  return (
    <div className="pb-8 md:max-w-2xl">
      <div className="relative px-5 pt-8 pb-5 md:px-8 overflow-hidden" style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 85% -10%, var(--primary-bg) 0%, transparent 70%)" }} />
        <div className="relative z-10">
          <p className="text-[10px] font-bold tracking-widest mb-1.5" style={{ color: "var(--text-3)" }}>AI COACH</p>
          <h1 className="text-[28px] leading-none font-display" style={{ color: "var(--text)" }}>Quan sát</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>
            Chỉ dựa trên dữ liệu bạn đã ghi trong 7–30 ngày qua.
          </p>
        </div>
      </div>

      <div className="px-4 pt-4 md:px-8">
        <div className="flex gap-1 mb-3 p-1 rounded-xl" style={{ background: "var(--bg-2)", width: "fit-content" }} role="tablist" aria-label="Khu vực coach">
          {([
            { id: "insights" as const, label: "Nhận xét" },
            { id: "capacity" as const, label: "Năng lực" }
          ]).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                background: tab === id ? "var(--card)" : "transparent",
                color: tab === id ? "var(--text)" : "var(--text-3)",
                boxShadow: tab === id ? "var(--shadow-card)" : "none"
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "insights" ? (
          <div className="space-y-3">
            {coach.insights.map((insight) => (
              <article key={insight.id} className="rounded-2xl p-4" style={CARD}>
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg-2)" }} aria-hidden="true">
                    {KIND_ICON[insight.kind] ?? "•"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>{insight.title}</p>
                    <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--text-2)" }}>{insight.body}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {insight.evidence.map((item) => (
                        <span key={item} className="text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ background: "var(--bg-2)", color: "var(--text-3)" }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}

            <div className="rounded-2xl p-4" style={{ background: "var(--primary-bg)", border: "1px solid var(--primary-border)" }}>
              <p className="text-xs leading-relaxed" style={{ color: "var(--primary)" }}>
                Mỗi nhận xét đều kèm con số nó dựa vào. LifeOS không chấm điểm bạn, không đoán mức độ tự tin và không tự đổi lịch.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Focus 7 ngày" value={`${focusHours}h`} hint={`${coach.capacity.focusSessionsLast7Days} phiên`} />
              <Stat label="Khung giờ làm việc" value={`${plannedHours}h/tuần`} hint={`${coach.capacity.workDaysPerWeek} ngày/tuần`} />
              <Stat label="Đã đặt lịch 7 ngày tới" value={`${Math.round(coach.capacity.scheduledMinutesNext7Days / 60)}h`} hint="theo Action bạn hẹn giờ" />
              <Stat label="Phiên bị gián đoạn" value={`${coach.capacity.interruptedSessionsLast7Days}`} hint="7 ngày qua" />
            </div>

            <div className="rounded-2xl p-4" style={CARD}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold tracking-widest" style={{ color: "var(--text-3)" }}>FOCUS SO VỚI KHUNG GIỜ LÀM VIỆC</p>
                <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>{usedPercent}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-2)" }}>
                <div className="h-full rounded-full" style={{ width: `${usedPercent}%`, background: "linear-gradient(90deg, var(--primary), var(--blue))" }} />
              </div>
              <p className="text-[11px] mt-2" style={{ color: "var(--text-3)" }}>
                Đây là thời gian Focus đã ghi so với khung giờ làm việc bạn tự đặt trong ME — không phải điểm hiệu suất.
              </p>
            </div>

            <div className="rounded-2xl p-4" style={CARD}>
              <p className="text-[10px] font-bold tracking-widest mb-2.5" style={{ color: "var(--text-3)" }}>7 NGÀY QUA</p>
              <ul className="space-y-2">
                <Fact label="Action hoàn thành" value={`${coach.facts.actionsCompletedLast7Days}`} />
                <Fact label="Action làm một phần" value={`${coach.facts.actionsPartialLast7Days}`} />
                <Fact label="Action bị hoãn" value={`${coach.facts.actionsPostponedLast7Days}`} />
                <Fact label="Ngày đã chốt" value={`${coach.facts.dailyClosesLast7Days}/7`} />
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const CARD = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-card)"
} as const;

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl p-4" style={CARD}>
      <p className="text-[10px] font-bold tracking-widest mb-1" style={{ color: "var(--text-3)" }}>{label.toUpperCase()}</p>
      <p className="text-xl font-bold" style={{ color: "var(--text)" }}>{value}</p>
      <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>{hint}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-xs" style={{ color: "var(--text-2)" }}>{label}</span>
      <span className="text-xs font-bold" style={{ color: "var(--text)" }}>{value}</span>
    </li>
  );
}
