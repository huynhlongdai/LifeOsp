import { useEffect, useMemo, useState } from "react";
import type { WeeklyResetUnavailableSection, WeeklyResetView } from "@lifeos/domain";
import { createApiClient } from "./api";
import { createWeeklyResetApiClient, localWeekContext } from "./weekly-reset-api";
import { ErrorState, type AsyncState } from "./ui-states";

// Weekly Reset (spec §13). V0 is a guided-narrative single page (not a
// multi-step wizard) covering the chapters with real data: Reality,
// Movement, Next Week context. Pattern Candidates/Adjustment are named
// honestly as not yet available — see weekly-reset.ts.

const UNAVAILABLE_COPY: Record<WeeklyResetUnavailableSection, { title: string; body: string }> = {
  patternCandidates: {
    title: "Điều LifeOS nhận thấy trong tuần",
    body: "Cần một cơ chế nhận diện khuôn mẫu có bằng chứng rõ ràng — chưa có ở bản này. Sẽ không đoán khi chưa đủ căn cứ."
  },
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
  const [state, setState] = useState<AsyncState<WeeklyResetView>>({ kind: "loading" });
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const context = useMemo(() => localWeekContext(), []);

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
