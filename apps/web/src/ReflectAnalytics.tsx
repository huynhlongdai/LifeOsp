import { useEffect, useMemo, useState } from "react";
import type { ReflectAnalyticsView } from "@lifeos/domain";
import { ApiRequestError, createApiClient } from "./api";

const CARD = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-card)"
} as const;

const WEEK_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function hourLabel(hour: number): string {
  return `${hour}h`;
}

function minuteLabel(minute: number): string {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return minutes === 0 ? `${hours}:00` : `${hours}:${String(minutes).padStart(2, "0")}`;
}

function weekdayLabel(localDate: string): string {
  const [year, month, day] = localDate.split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) return "";
  return WEEK_LABELS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? "";
}

/** Bar colour follows how strong the hour was compared with the strongest hour today. */
function energyColor(level: number): string {
  if (level >= 0.8) return "#22c55e";
  if (level >= 0.55) return "#a3e635";
  if (level >= 0.25) return "#f59e0b";
  if (level > 0) return "#f87171";
  return "var(--border-2)";
}

/**
 * The energy and habit tabs of REFLECT. Every bar, dot and suggested block is a
 * count of something the user actually did; empty data stays visibly empty.
 */
export function ReflectAnalytics({
  apiUrl,
  tzOffsetMinutes,
  tab
}: {
  apiUrl: string;
  tzOffsetMinutes: number;
  tab: "energy" | "habits";
}) {
  const api = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "ready"; view: ReflectAnalyticsView } | { kind: "error"; message: string }
  >({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });
    api
      .getReflectAnalytics(tzOffsetMinutes, controller.signal)
      .then((view) => setState({ kind: "ready", view }))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setState({
          kind: "error",
          message:
            reason instanceof ApiRequestError && reason.status === 401
              ? "Cần một phiên LifeOS đang hoạt động."
              : reason instanceof Error
                ? reason.message
                : "Không thể tải dữ liệu nhìn lại."
        });
      });
    return () => controller.abort();
  }, [api, tzOffsetMinutes]);

  if (state.kind === "loading") {
    return (
      <p className="text-sm px-1" role="status" style={{ color: "var(--text-3)" }}>
        Đang đọc dữ liệu bạn đã ghi…
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="rounded-2xl p-4" role="alert" style={{ background: "var(--red-bg)", border: "1px solid var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-2)" }}>{state.message}</p>
      </div>
    );
  }

  return tab === "energy" ? <EnergyTab view={state.view} /> : <HabitsTab view={state.view} />;
}

function EnergyTab({ view }: { view: ReflectAnalyticsView }) {
  const { energy, schedule } = view;
  const delta = energy.deltaPercentVsPreviousWeek;

  return (
    <div className="space-y-3">
      <section className="rounded-2xl overflow-hidden" style={CARD}>
        <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold tracking-widest" style={{ color: "var(--text-3)" }}>NĂNG LƯỢNG HÔM NAY</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text)" }}>
              {energy.peakWindow
                ? `Khung mạnh nhất: ${energy.peakWindow.startHour}:00 – ${energy.peakWindow.endHour}:00`
                : "Chưa đủ phiên Focus để biết khung giờ mạnh"}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
              {energy.minutesToday} phút Focus hôm nay
            </p>
          </div>
          {delta === null ? null : (
            <span
              className="text-xs font-bold px-2.5 py-1.5 rounded-xl flex-shrink-0"
              style={{
                background: delta >= 0 ? "var(--green-bg)" : "var(--red-bg)",
                color: delta >= 0 ? "var(--green)" : "var(--red)"
              }}
            >
              {delta >= 0 ? "+" : ""}{delta}% vs. tuần trước
            </span>
          )}
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-end gap-1" style={{ height: 72 }} role="img" aria-label="Phút Focus theo từng giờ hôm nay">
            {energy.bars.map((bar) => (
              <div key={bar.hour} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-sm"
                  title={`${bar.hour}:00 · ${bar.minutes} phút`}
                  style={{
                    height: `${Math.max(4, bar.level * 56)}px`,
                    background: energyColor(bar.level),
                    opacity: bar.level > 0.7 ? 1 : 0.6
                  }}
                />
                <span className="text-[9px]" style={{ color: "var(--text-3)" }}>{hourLabel(bar.hour)}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-2" style={{ color: "var(--text-3)" }}>
            Chiều cao cột = số phút Focus trong giờ đó, so với giờ mạnh nhất hôm nay.
            {energy.minutesPrevious7Days === 0 ? " Chưa có tuần trước để so sánh." : ` 7 ngày: ${energy.minutesLast7Days} phút · tuần trước: ${energy.minutesPrevious7Days} phút.`}
          </p>
        </div>
      </section>

      <section className="rounded-2xl p-4" style={CARD}>
        <p className="text-[10px] font-extrabold tracking-widest mb-3" style={{ color: "var(--text-3)" }}>KHUYẾN NGHỊ LỊCH LÀM VIỆC</p>
        {schedule.blocks.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-2)" }}>{schedule.note}</p>
        ) : (
          <>
            {schedule.blocks.map((block, index) => (
              <div
                key={block.type}
                className="flex items-center gap-3 py-2"
                style={{ borderBottom: index < schedule.blocks.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <div className="w-1.5 h-9 rounded-full flex-shrink-0" style={{ background: block.color }} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
                      {minuteLabel(block.startMinute)} – {minuteLabel(block.endMinute)}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: "var(--bg-2)", color: block.color }}>
                      {block.type}
                    </span>
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--text-2)" }}>{block.description}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>{block.evidence}</p>
                </div>
              </div>
            ))}
            <p className="text-[10px] mt-2" style={{ color: "var(--text-3)" }}>{schedule.note}</p>
          </>
        )}
      </section>
    </div>
  );
}

function HabitsTab({ view }: { view: ReflectAnalyticsView }) {
  return (
    <section className="rounded-2xl overflow-hidden" style={CARD}>
      <div className="px-4 pt-4">
        <p className="text-[10px] font-extrabold tracking-widest mb-1" style={{ color: "var(--text-3)" }}>HABITS · TUẦN NÀY</p>
        <p className="text-xs mb-3" style={{ color: "var(--text-2)" }}>Được theo dõi tự động từ dữ liệu bạn đã ghi</p>
      </div>
      <div>
        {view.habits.map((habit, index) => (
          <div
            key={habit.id}
            className="px-4 py-3"
            style={{ borderBottom: index < view.habits.length - 1 ? "1px solid var(--border)" : "none" }}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: habit.color }} />
                <span className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{habit.name}</span>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: habit.streak > 0 ? "var(--green-bg)" : "var(--bg-2)",
                  color: habit.streak > 0 ? "var(--green)" : "var(--text-3)"
                }}
              >
                {habit.streak}d
              </span>
            </div>
            <div className="flex gap-1.5">
              {habit.days.map((day) => (
                <div key={day.localDate} className="flex flex-col items-center gap-0.5">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    title={`${day.localDate}: ${day.done ? "có" : "không"}`}
                    style={{
                      background: day.done ? "var(--bg-2)" : "var(--bg-2)",
                      border: `1.5px solid ${day.done ? habit.color : "var(--border)"}`
                    }}
                  >
                    {day.done ? (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M5 12l5 5L20 7" stroke={habit.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <span className="w-1 h-1 rounded-full" style={{ background: "var(--border-2)" }} />
                    )}
                  </div>
                  <span className="text-[8px]" style={{ color: "var(--text-3)" }}>{weekdayLabel(day.localDate)}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: "var(--text-3)" }}>{habit.rule}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
