import { useCallback, useEffect, useMemo, useState } from "react";
import type { ActionResultView, FocusStateView, NowView, ResolveNowRecommendationInput } from "@lifeos/domain";
import { createApiClient } from "./api";
import { createNowApiClient } from "./now-api";
import { FocusPanel } from "./FocusPanel";
import { ShieldIcon } from "./icons";
import { ResultPanel, resultLabel } from "./ResultPanel";
import { ErrorState, PaperStack, type AsyncState } from "./ui-states";

export function NowPage({ apiUrl }: { apiUrl: string }) {
  const [state, setState] = useState<AsyncState<NowView>>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [focusView, setFocusView] = useState<FocusStateView | null>(null);
  const [lastResult, setLastResult] = useState<ActionResultView | null>(null);
  const onFocusStateChange = useCallback((view: FocusStateView) => setFocusView(view), []);

  const nowApi = useMemo(() => createNowApiClient(apiUrl), [apiUrl]);
  const sessionApi = useMemo(() => createApiClient(apiUrl), [apiUrl]);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setState({ kind: "loading" });
        await sessionApi.bootstrapSession(controller.signal);
        let view = await nowApi.getNow(controller.signal);
        if (view.state === "no_ready_action" && view.reason === "recommendation_missing") {
          view = await nowApi.refreshNow(controller.signal);
        }
        setState({ kind: "success", data: view });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ kind: "error", message: error instanceof Error ? error.message : "Không thể tải NOW" });
      }
    };

    void load();
    return () => controller.abort();
  }, [nowApi, sessionApi]);

  const resolve = async (recommendationId: string, input: ResolveNowRecommendationInput) => {
    try {
      setBusy(true);
      setMutationError(null);
      const next = await nowApi.resolveRecommendation(recommendationId, input);
      setState({ kind: "success", data: next });
      setEditing(false);
      setShowWhy(false);
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "Không thể cập nhật gợi ý");
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    try {
      setBusy(true);
      setMutationError(null);
      const next = await nowApi.refreshNow();
      setState({ kind: "success", data: next });
      setEditing(false);
      setShowWhy(false);
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "Không thể tính lại việc tiếp theo");
    } finally {
      setBusy(false);
    }
  };

  const onResultRecorded = (result: ActionResultView) => {
    setLastResult(result);
    setFocusView(null);
    void refresh();
  };

  if (state.kind === "loading") return <NowLoading />;
  if (state.kind === "error") {
    return <ErrorState title="NOW chưa sẵn sàng">{state.message}</ErrorState>;
  }

  const view = state.data;
  const returnBanner = view.returning ? <ReturnBanner /> : null;
  if (view.state === "no_direction") {
    return (
      <div className="now-stack">
        {returnBanner}
        <NoDirection view={view} />
      </div>
    );
  }
  if (view.state === "blocked") {
    return (
      <div className="now-stack">
        {returnBanner}
        <BlockedState view={view} lastResult={lastResult} />
      </div>
    );
  }
  if (view.state === "no_ready_action") {
    return (
      <div className="now-stack">
        {returnBanner}
        <NoReadyAction
          view={view}
          busy={busy}
          mutationError={mutationError}
          lastResult={lastResult}
          onRefresh={() => void refresh()}
        />
      </div>
    );
  }

  const activeFocus =
    focusView?.state === "active" && focusView.focus.actionId === view.action.id ? focusView.focus : null;
  const resultEligible = view.recommendation.status === "accepted" || view.recommendation.status === "edited";

  return (
    <section className="now-page" aria-live="polite">
      {returnBanner}
      <SeasonStrip view={view} />
      {lastResult ? <ResultNote result={lastResult} /> : null}

      <article className="sheet stack now-hero">
        <div className="now-lead">
          <span className="label">Một việc để bắt đầu</span>
          <RecommendationStatus status={view.recommendation.status} />
        </div>
        <h2 className="now-title">{view.action.title}</h2>

        <div className="now-facts">
          <div>
            <div className="k">Xong khi</div>
            <div className="v">{view.action.doneCondition ?? "Bạn tự quyết định khi nào việc này xong."}</div>
          </div>
          {view.action.estimatedMinutes ? (
            <div className="time">
              <div className="k">Ước lượng</div>
              <div className="v num">{view.action.estimatedMinutes} phút</div>
            </div>
          ) : null}
          {view.action.scheduledFor ? <div className="sched">Có lịch: {formatDateTime(view.action.scheduledFor)}</div> : null}
        </div>

        <p className="now-rationale">{view.recommendation.rationale}</p>

        {mutationError ? <p className="now-inline-error" role="alert">{mutationError}</p> : null}

        {editing ? (
          <EditActionForm
            view={view}
            busy={busy}
            onCancel={() => setEditing(false)}
            onSave={(input) => void resolve(view.recommendation.id, input)}
          />
        ) : (
          <div className="now-cta">
            {view.recommendation.status === "shown" ? (
              <button
                className="primary-button now-primary-cta"
                type="button"
                disabled={busy}
                onClick={() => void resolve(view.recommendation.id, { resolution: "accepted" })}
              >
                Chấp nhận việc này
              </button>
            ) : (
              <div className="now-confirmed-note" role="status">
                {view.recommendation.status === "accepted"
                  ? "Đã chấp nhận. Việc này sẵn sàng — bắt đầu Focus bên dưới khi bạn muốn."
                  : "Bạn đã chỉnh việc này. Lý do bên dưới vẫn giải thích gợi ý ban đầu."}
              </div>
            )}
            <button className="secondary-button" type="button" disabled={busy} onClick={() => setEditing(true)}>
              Chỉnh sửa
            </button>
            <span className="gap" />
            <button
              className="text-button"
              type="button"
              disabled={busy}
              onClick={() => void resolve(view.recommendation.id, { resolution: "not_now" })}
            >
              Để sau
            </button>
            <button
              className="text-button"
              type="button"
              disabled={busy}
              onClick={() => void resolve(view.recommendation.id, { resolution: "wrong_assumption" })}
            >
              Giả định sai
            </button>
          </div>
        )}

        <div className="now-why">
          <button
            className="text-button"
            type="button"
            disabled={busy}
            aria-expanded={showWhy}
            onClick={() => setShowWhy((value) => !value)}
          >
            {showWhy ? "Ẩn lý do" : "Vì sao việc này?"}
          </button>
          {!showWhy ? <span>· {confidenceSentence(view.recommendation.confidenceClass)}</span> : null}
        </div>

        {showWhy ? <EvidencePanel view={view} /> : null}
      </article>

      <FocusPanel
        apiUrl={apiUrl}
        recommendationId={view.recommendation.id}
        recommendationStatus={view.recommendation.status}
        onStateChange={onFocusStateChange}
      />

      {resultEligible ? (
        <ResultPanel
          apiUrl={apiUrl}
          actionId={view.action.id}
          actionTitle={view.action.title}
          activeFocus={activeFocus}
          onRecorded={onResultRecorded}
        />
      ) : null}

      <aside className="now-protect">
        <ShieldIcon />
        <span>
          <strong>Việc khác đang được giữ lại.</strong> NOW chỉ đưa ra một việc; bạn không cần nghĩ về phần còn lại lúc này.
        </span>
      </aside>
    </section>
  );
}

function SeasonStrip({ view }: { view: Extract<NowView, { state: "ready" | "no_ready_action" | "blocked" }> }) {
  return (
    <div className="now-season">
      <span className="pill accent">
        <i className="dot" aria-hidden="true" />
        Mùa hiện tại · {view.season.title}
      </span>
      <p>{view.season.primaryFocusText ?? view.season.purpose}</p>
    </div>
  );
}

function RecommendationStatus({ status }: { status: "shown" | "accepted" | "edited" }) {
  if (status === "shown") return null;
  const label = status === "accepted" ? "Đã chấp nhận" : "Đã chỉnh";
  return <span className={`pill ${status === "accepted" ? "success" : "maintain"}`}>{label}</span>;
}

function EvidencePanel({ view }: { view: Extract<NowView, { state: "ready" }> }) {
  return (
    <section className="now-evidence" aria-label="Lý do gợi ý">
      <div className="now-evidence-heading">
        <h3>{confidenceSentence(view.recommendation.confidenceClass)}</h3>
        <span>{view.recommendation.evidence.length} tín hiệu</span>
      </div>
      <div className="now-evidence-list">
        {view.recommendation.evidence.map((item) => (
          <div className="now-evidence-item" key={item.key}>
            <div>
              <strong>{item.label}</strong>
              <small>{evidenceStrengthLabel(item.strength)}</small>
            </div>
            <span className="now-score num">{item.score >= 0 ? "+" : ""}{item.score}</span>
          </div>
        ))}
      </div>
      <small className="now-evidence-footnote">
        Những tín hiệu này được lưu lại đúng lúc gợi ý được tạo, để bạn kiểm tra được.
      </small>
    </section>
  );
}

function EditActionForm({
  view,
  busy,
  onCancel,
  onSave
}: {
  view: Extract<NowView, { state: "ready" }>;
  busy: boolean;
  onCancel: () => void;
  onSave: (input: ResolveNowRecommendationInput) => void;
}) {
  const [title, setTitle] = useState(view.action.title);
  const [doneCondition, setDoneCondition] = useState(view.action.doneCondition ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    view.action.estimatedMinutes === undefined ? "" : String(view.action.estimatedMinutes)
  );

  const submit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    const parsedMinutes = estimatedMinutes.trim() === "" ? null : Number(estimatedMinutes);
    if (parsedMinutes !== null && (!Number.isInteger(parsedMinutes) || parsedMinutes < 1 || parsedMinutes > 480)) return;

    onSave({
      resolution: "edited",
      action: {
        title: trimmedTitle,
        doneCondition: doneCondition.trim() === "" ? null : doneCondition.trim(),
        estimatedMinutes: parsedMinutes
      }
    });
  };

  return (
    <div className="now-edit-form">
      <label>
        <span>Việc</span>
        <input value={title} maxLength={500} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        <span>Xong khi</span>
        <textarea value={doneCondition} maxLength={1000} rows={3} onChange={(event) => setDoneCondition(event.target.value)} />
      </label>
      <label className="now-minutes-field">
        <span>Ước lượng (phút)</span>
        <input
          type="number"
          min={1}
          max={480}
          value={estimatedMinutes}
          onChange={(event) => setEstimatedMinutes(event.target.value)}
        />
      </label>
      <div className="now-edit-actions">
        <button className="primary-button" type="button" disabled={busy || title.trim().length === 0} onClick={submit}>
          Lưu chỉnh sửa
        </button>
        <button className="secondary-button" type="button" disabled={busy} onClick={onCancel}>
          Hủy
        </button>
      </div>
    </div>
  );
}

function NoDirection({ view }: { view: Extract<NowView, { state: "no_direction" }> }) {
  return (
    <section className="sheet now-empty-card">
      <PaperStack />
      <p className="eyebrow notnow">Chưa có hướng</p>
      <h2>Chưa cần ép mình chọn một việc.</h2>
      <p>{view.message}</p>
      <div className="now-empty-actions">
        <a className="primary-button link-button" href="/direction">Xác định hướng hiện tại</a>
        <a className="text-button link-button" href="/clarity">Làm rõ trong 2 phút</a>
      </div>
    </section>
  );
}

/**
 * W5 — welcome back after an absence (Meeting #003 Pattern F). No day count,
 * no red, no recovery debt: the direction is still here and one action is below.
 */
function ReturnBanner() {
  return (
    <div className="now-return" role="status">
      <div>
        <strong>Chào mừng trở lại.</strong>
        <span>Hướng của bạn vẫn ở đây. Không có gì phải đuổi theo — chỉ một việc bên dưới, nếu bạn muốn.</span>
      </div>
      <a className="text-button link-button" href="/clarity">Có gì đổi không?</a>
    </div>
  );
}

/** One warm, factual line after a result is recorded. Links to the Daily Close ritual. */
function ResultNote({ result }: { result: ActionResultView }) {
  return (
    <div className={`now-result-note ${result.result}`} role="status">
      <span>
        <strong>Đã ghi: {resultLabel(result.result)}.</strong> {result.action.title}
        {result.actualFocusMinutes > 0 ? ` · ${result.actualFocusMinutes} phút Focus` : ""}
      </span>
      <a href="/reflect">Khép ngày khi bạn muốn</a>
    </div>
  );
}

function NoReadyAction({
  view,
  busy,
  mutationError,
  lastResult,
  onRefresh
}: {
  view: Extract<NowView, { state: "no_ready_action" }>;
  busy: boolean;
  mutationError: string | null;
  lastResult: ActionResultView | null;
  onRefresh: () => void;
}) {
  const resolved = view.reason === "recommendation_resolved";
  return (
    <section className="now-page">
      <SeasonStrip view={view} />
      {lastResult ? <ResultNote result={lastResult} /> : null}
      <section className="sheet now-empty-card">
        <PaperStack />
        <p className={resolved ? "eyebrow success" : "eyebrow maintain"}>{resolved ? "Theo quyết định của bạn" : "Chưa có việc sẵn sàng"}</p>
        <h2>{resolved ? "Đã tôn trọng lựa chọn vừa rồi." : "Chưa có một việc đủ rõ để đặt vào lúc này."}</h2>
        <p>{view.message}</p>
        {mutationError ? <p className="now-inline-error" role="alert">{mutationError}</p> : null}
        <div className="now-empty-actions">
          {resolved || view.reason === "recommendation_missing" ? (
            <button className="secondary-button" type="button" disabled={busy} onClick={onRefresh}>
              {busy ? "Đang tính lại…" : "Gợi ý lại cho tôi"}
            </button>
          ) : null}
          <a className="text-button link-button" href="/execute">Xem việc đang có</a>
        </div>
        {resolved ? <small>Gợi ý bạn đã bác sẽ không tự quay lại. Nút trên là một yêu cầu mới, do bạn chủ động.</small> : null}
      </section>
    </section>
  );
}

function BlockedState({ view, lastResult }: { view: Extract<NowView, { state: "blocked" }>; lastResult: ActionResultView | null }) {
  return (
    <section className="now-page">
      <SeasonStrip view={view} />
      {lastResult ? <ResultNote result={lastResult} /> : null}
      <section className="sheet now-empty-card blocked">
        <PaperStack />
        <p className="eyebrow">Có vẻ đang bị chặn</p>
        <h2>Không nên giả vờ rằng có một việc khả thi ngay lúc này.</h2>
        <p>{view.message}</p>
        <strong className="now-blocked-count num">{view.blockedActionCount} việc đang bị chặn</strong>
        <p className="now-muted">NOW chỉ báo trạng thái thật. Gỡ chặn sẽ thuộc khu Execute.</p>
      </section>
    </section>
  );
}

function NowLoading() {
  return (
    <section className="now-page" aria-busy="true" aria-live="polite">
      <div className="now-loading-strip" />
      <div className="now-loading-card">
        <span />
        <span />
        <span />
      </div>
      <p className="now-loading-label">Đang đọc mùa hiện tại và gợi ý đã lưu…</p>
    </section>
  );
}

function confidenceSentence(value: string) {
  if (value === "direct") return "Dựa trên điều bạn đã xác nhận trực tiếp";
  if (value === "strong_pattern") return "Dựa trên một mẫu lặp lại rõ";
  if (value === "possible_pattern") return "Dựa trên một mẫu có thể đúng";
  return "Một gợi ý để bắt đầu";
}

function evidenceStrengthLabel(value: string) {
  if (value === "direct") return "Trực tiếp";
  if (value === "strong") return "Mạnh";
  if (value === "supporting") return "Hỗ trợ";
  return "Tạm thời";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}
