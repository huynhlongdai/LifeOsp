import { useEffect, useMemo, useState } from "react";
import type { DirectionOutlookView } from "@lifeos/domain";
import { createApiClient } from "./api";

const CARD = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-card)"
} as const;

function formatDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Focus areas, next milestone, recent wins and the season analysis — all counted
 * from stored Outcomes and Actions, so every number on screen can be traced back.
 */
export function DirectionOutlook({ apiUrl }: { apiUrl: string }) {
  const api = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [outlook, setOutlook] = useState<DirectionOutlookView | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .getDirectionOutlook(controller.signal)
      .then(setOutlook)
      .catch(() => setOutlook(null));
    return () => controller.abort();
  }, [api]);

  if (!outlook) return null;

  return (
    <div className="space-y-4 mb-4">
      <section className="rounded-2xl p-4" style={CARD}>
        <p className="text-[10px] font-bold tracking-widest mb-2.5" style={{ color: "var(--text-3)" }}>FOCUS AREAS</p>
        {outlook.focusAreas.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-2)" }}>
            Season này chưa có Outcome nào đang hoạt động.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {outlook.focusAreas.map((area) => (
              <li key={area.outcomeId}>
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{area.title}</p>
                  <span className="text-[11px] font-bold flex-shrink-0" style={{ color: area.percent === null ? "var(--text-3)" : "var(--primary)" }}>
                    {area.percent === null ? "—" : `${area.percent}%`}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-2)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${area.percent ?? 0}%`, background: "linear-gradient(90deg, var(--primary), var(--blue))" }}
                  />
                </div>
                <p className="text-[10px] mt-1" style={{ color: "var(--text-3)" }}>
                  {area.actionsTotal === 0
                    ? "Chưa có Action nào thuộc Outcome này"
                    : `${area.actionsCompleted}/${area.actionsTotal} Action đã xong`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {outlook.nextMilestone ? (
        <section className="rounded-2xl p-4" style={{ background: "var(--primary-bg)", border: "1px solid var(--primary-border)" }}>
          <p className="text-[9px] font-bold tracking-widest mb-1" style={{ color: "var(--primary)" }}>MILESTONE TIẾP THEO</p>
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{outlook.nextMilestone.title}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-2)" }}>
            Còn {outlook.nextMilestone.actionsRemaining} Action
            {outlook.nextMilestone.nextActionTitle ? ` · kế tiếp: ${outlook.nextMilestone.nextActionTitle}` : ""}
          </p>
        </section>
      ) : null}

      {outlook.recentWins.length > 0 ? (
        <section className="rounded-2xl p-4" style={CARD}>
          <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: "var(--text-3)" }}>THÀNH TỰU GẦN ĐÂY</p>
          <ul className="space-y-2">
            {outlook.recentWins.map((win) => (
              <li key={win.actionId} className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--green-bg)" }} aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12l5 5L20 7" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <p className="text-xs truncate" style={{ color: "var(--text-2)" }}>{win.title}</p>
                <span className="text-[10px] ml-auto flex-shrink-0" style={{ color: "var(--text-3)" }}>{formatDay(win.completedAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl p-4" style={CARD}>
        <p className="text-[10px] font-bold tracking-widest mb-1.5" style={{ color: "var(--text-3)" }}>PHÂN TÍCH AI</p>
        <p className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>{outlook.analysis.title}</p>
        <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--text-2)" }}>{outlook.analysis.body}</p>
        <div className="flex flex-wrap gap-1.5">
          {outlook.analysis.evidence.map((item) => (
            <span key={item} className="text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ background: "var(--bg-2)", color: "var(--text-3)" }}>
              {item}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
