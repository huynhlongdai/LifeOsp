import { useEffect, useMemo, useState } from "react";
import type { InsightView, WeeklyResetUnavailableSection, WeeklyResetView } from "@lifeos/domain";
import { createApiClient } from "./api";
import { createInsightApiClient } from "./insight-api";
import { createWeeklyResetApiClient, localWeekContext } from "./weekly-reset-api";
import { ErrorState, type AsyncState } from "./ui-states";

// Weekly Reset (spec §13). V0 is a guided-narrative single page (not a
// multi-step wizard) covering the chapters with real data: Reality,
// Movement, Pattern Candidates (reusing insight.ts's deterministic
// detection, capped at 3 per spec §13.4), Next Week context. Adjustment
// (§13.5) is named honestly as not yet available — see weekly-reset.ts.

const WEEKLY_RESET_PATTERN_CANDIDATE_LIMIT = 3;

const UNAVAILABLE_COPY: Record<WeeklyResetUnavailableSection, { title: string; body: string }> = {
  adjustment: {
    title: "Đề xuất điều chỉnh cho tuần tới",
    body: "Sẽ xuất hiện cùng lúc với Pattern Candidates, dựa trên bằng chứng thật thay vì gợi ý chung chung."
  }
};

const RESULT_LABEL: Record<string, string> = {
  completed: "Hoàn thành",
  partial: "Làm một phần",
  postponed: "Dời lại",
  blocked: "Bị chặn",
  dropped: "Bỏ có chủ ý"
};

export function WeeklyResetPage({ apiUrl }: { apiUrl: string }) {
  const weeklyResetApi = useMemo(() => createWeeklyResetApiClient(apiUrl), [apiUrl]);
  const sessionApi = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const insightApi = useMemo(() => createInsightApiClient(apiUrl), [apiUrl]);
  const [state, setState] = useState<AsyncState<WeeklyResetView>>({ kind: "loading" });
  const [insights, setInsights] = useState<InsightView[]>([]);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const context = useMemo(() => localWeekContext(), []);

  useEffect(() => {
    const controller = new AbortController();
    insightApi
      .listInsights(controller.signal)
      .then((view) => setInsights(view.candidates.slice(0, WEEKLY_RESET_PATTERN_CANDIDATE_LIMIT)))
      .catch(() => {
        /* Pattern Candidates are a bonus chapter here; a load failure should not block the rest of Weekly Reset */
      });
    return () => controller.abort();
  }, [insightApi]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setState({ kind: "loading" });
        await sessionApi.bootstrapSession(controller.signal);
        const view = await weeklyResetApi.getWeeklyReset(context.weekStart, context.offsetMinutes, controller.signal);
        setState({ kind: "success", data: view });
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setState({ kind: "error", message: reason instanceof Error ? reason.message : "Không thể tải Weekly Reset" });
      }
    };
    void load();
    return () => controller.abort();
  }, [weeklyResetApi, sessionApi, context.weekStart, context.offsetMinutes]);

  if (state.kind === "loading") {
    return (
      <section className="weekly-reset-page" aria-busy="true">
        <div className="now-loading-strip" />
        <div className="now-loading-card"><span /><span /><span /></div>
      </section>
    );
  }
  if (state.kind === "error") return <ErrorState title="Chưa mở được Weekly Reset">{state.message}</ErrorState>;

  const view = state.data;
  const totalResults = Object.values(view.reality.resultCounts).reduce((sum, count) => sum + count, 0);
  const alreadyCompletedThisWeek =
    !!view.lastCompletedAt && view.lastCompletedAt >= new Date(view.weekStart + "T00:00:00").toISOString();

  const complete = async () => {
    setCompleting(true);
    setCompleteError(null);
    try {
      const result = await weeklyResetApi.complete({ weekStart: context.weekStart, offsetMinutes: context.offsetMinutes });
      setState({ kind: "success", data: { ...view, lastCompletedAt: result.completedAt } });
    } catch (reason) {
      setCompleteError(reason instanceof Error ? reason.message : "Chưa ghi nhận được. Thử lại.");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <section className="weekly-reset-page">
      <div className="weekly-reset-start sheet tint">
        <p className="eyebrow">Weekly Reset</p>
        <h2>{formatWeekRange(view.weekStart, view.weekEnd)}</h2>
        <p className="muted">Nhìn lại một tuần bằng số đo thật — không phần trăm, không so sánh tuần trước.</p>
      </div>

      <div className="weekly-reset-chapter">
        <h3>Thực tế</h3>
        {totalResults === 0 ? (
          <p className="muted">Chưa có kết quả nào được ghi nhận trong tuần này.</p>
        ) : (
          <>
            <div className="weekly-reset-stats">
              <div className="weekly-reset-stat">
                <b className="num">{Math.round(view.reality.focusMinutes / 6) / 10}h</b>
                <span>tập trung ({view.reality.focusSessionCount} phiên)</span>
              </div>
              <div className="weekly-reset-stat">
                <b className="num">{view.reality.dailyClosesCompleted}</b>
                <span>ngày đã khép lại</span>
              </div>
            </div>
            <ul className="weekly-reset-result-list">
              {Object.entries(view.reality.resultCounts)
                .filter(([, count]) => count > 0)
                .map(([result, count]) => (
                  <li key={result}>
                    <span className="pill num">{count}</span> {RESULT_LABEL[result] ?? result}
                  </li>
                ))}
            </ul>
          </>
        )}
      </div>

      <div className="weekly-reset-chapter">
        <h3>Chuyển động</h3>
        <MovementGroup title="Đã tiến lên" items={view.movement.advanced} tone="active" />
        <MovementGroup title="Đang bị chặn" items={view.movement.blocked} tone="notnow" />
        <MovementGroup title="Chủ động bỏ" items={view.movement.intentionallyDropped} tone="maintain" />
        {view.movement.advanced.length === 0 && view.movement.blocked.length === 0 && view.movement.intentionallyDropped.length === 0 ? (
          <p className="muted">Chưa có chuyển động nào được ghi nhận.</p>
        ) : null}
      </div>

      {insights.length > 0 ? (
        <div className="weekly-reset-chapter">
          <h3>Điều LifeOS nhận thấy</h3>
          {insights.map((insight) => (
            <WeeklyResetInsightCard key={insight.id} insight={insight} api={insightApi} onResolved={() => setInsights((prev) => prev.filter((i) => i.id !== insight.id))} />
          ))}
        </div>
      ) : null}

      {view.unavailableSections.map((section) => (
        <div key={section} className="me-unavailable-card">
          <b>{UNAVAILABLE_COPY[section].title}</b>
          <p className="muted">{UNAVAILABLE_COPY[section].body}</p>
        </div>
      ))}

      <div className="weekly-reset-chapter">
        <h3>Tuần tới</h3>
        {view.nextWeek.hasDirection ? (
          <p>
            Vẫn theo <strong>{view.nextWeek.directionTitle}</strong>
            {view.nextWeek.seasonTitle ? <> — mùa {view.nextWeek.seasonTitle}</> : null}. Việc tiếp theo vẫn ở NOW.
          </p>
        ) : (
          <p className="muted">Chưa có hướng đi nào được xác nhận cho tuần tới.</p>
        )}
        <a className="text-button link-button" href="/">
          Về NOW để xem việc tiếp theo
        </a>
      </div>

      <div className="weekly-reset-complete">
        {alreadyCompletedThisWeek ? (
          <p className="muted">Bạn đã khép lại tuần này.</p>
        ) : (
          <button type="button" className="primary-button" onClick={() => void complete()} disabled={completing}>
            {completing ? "Đang ghi nhận…" : "Hoàn tất tuần này"}
          </button>
        )}
        {completeError ? <p className="now-inline-error" role="alert">{completeError}</p> : null}
      </div>
    </section>
  );
}

function WeeklyResetInsightCard({
  insight,
  api,
  onResolved
}: {
  insight: InsightView;
  api: ReturnType<typeof createInsightApiClient>;
  onResolved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolve = async (resolution: "confirm" | "reject") => {
    setBusy(true);
    setError(null);
    try {
      await api.resolve(insight.id, resolution, undefined);
      onResolved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa ghi nhận được. Thử lại.");
      setBusy(false);
    }
  };

  return (
    <div className="sheet tint me-insight-card">
      <b>{insight.title}</b>
      <p className="muted">{insight.description}</p>
      <div className="me-insight-actions">
        <button type="button" className="primary-button" disabled={busy} onClick={() => void resolve("confirm")}>
          Xác nhận
        </button>
        <button type="button" className="text-button" disabled={busy} onClick={() => void resolve("reject")}>
          Không đúng / Bỏ qua
        </button>
        <a className="text-button link-button" href="/me">
          Sửa cho đúng ở trang Bạn
        </a>
      </div>
      {error ? <p className="now-inline-error" role="alert">{error}</p> : null}
    </div>
  );
}

function MovementGroup({ title, items, tone }: { title: string; items: WeeklyResetView["movement"]["advanced"]; tone: string }) {
  if (items.length === 0) return null;
  return (
    <div className="weekly-reset-movement-group">
      <p className={`eyebrow ${tone}`}>
        {title} <span className="pill num">{items.length}</span>
      </p>
      <ul className="weekly-reset-movement-list">
        {items.map((item) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>
    </div>
  );
}

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const format = (value: string) => {
    const [, month, day] = value.split("-");
    return `${day}/${month}`;
  };
  return `Tuần ${format(weekStart)} – ${format(weekEnd)}`;
}
