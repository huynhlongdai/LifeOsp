import { useEffect, useMemo, useState } from "react";
import type { ActionResultOutcome, DailyCloseView } from "@lifeos/domain";
import { createApiClient } from "./api";
import { browserLocalDate, browserTzOffsetMinutes, createResultApiClient } from "./result-api";
import { resultErrorMessage } from "./ResultPanel";
import { ErrorState, type AsyncState } from "./ui-states";

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
      <section className="daily-close" aria-busy="true">
        <p>Đang tải tổng kết ngày…</p>
      </section>
    );
  }
  if (state.kind === "error") {
    return <ErrorState title="Chưa tải được tổng kết ngày">{state.message}</ErrorState>;
  }

  const view = state.data;
  const summary = view.summary;

  return (
    <section className="daily-close">
      <p className="eyebrow">CHỐT NGÀY · {view.localDate}</p>
      <h2>Hôm nay thực tế đã diễn ra như thế nào</h2>

      <ul className="daily-close-summary">
        <li>
          <strong>{summary.resultsRecorded}</strong> kết quả đã ghi
        </li>
        <li>
          <strong>{summary.completed}</strong> đã xong · <strong>{summary.partial}</strong> một phần
        </li>
        <li>
          <strong>{summary.postponed}</strong> dời lại · <strong>{summary.blocked}</strong> bị chặn ·{" "}
          <strong>{summary.dropped}</strong> bỏ
        </li>
        <li>
          <strong>{summary.focusSessions}</strong> phiên Focus · <strong>{summary.focusMinutes}</strong> phút
        </li>
        <li>
          <strong>{summary.distractionsCaptured}</strong> phân tâm đã ghi · <strong>{summary.capturesCreated}</strong>{" "}
          capture khác
        </li>
      </ul>

      {view.results.length > 0 ? (
        <ol className="daily-close-results">
          {view.results.map((result) => (
            <li key={result.id}>
              <span className="chip">{OUTCOME_LABELS[result.outcome]}</span>
              {result.note ? <span className="result-note"> {result.note}</span> : null}
              {result.reason ? <span className="result-note"> Lý do: {result.reason}</span> : null}
              {result.focusMinutes === undefined ? null : <span className="result-note"> {result.focusMinutes} phút</span>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="daily-close-empty">Chưa có kết quả nào được ghi cho ngày này.</p>
      )}

      {view.closed ? (
        <div className="daily-close-done" role="status">
          <p>Đã chốt lúc {formatDateTime(view.closed.closedAt)}.</p>
          {view.closed.note ? <p className="result-note">{view.closed.note}</p> : null}
        </div>
      ) : (
        <div className="daily-close-form">
          <label>
            <span>Ghi chú của bạn (tuỳ chọn)</span>
            <textarea
              value={note}
              rows={3}
              maxLength={2000}
              disabled={busy}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Chỉ những gì bạn muốn tự nhớ lại. LifeOS không tự suy diễn thêm."
            />
          </label>
          {mutationError ? (
            <p className="now-inline-error" role="alert">
              {mutationError}
            </p>
          ) : null}
          <button className="primary-button" type="button" disabled={busy} onClick={() => void close()}>
            {busy ? "Đang chốt…" : "Chốt ngày"}
          </button>
        </div>
      )}
    </section>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}
