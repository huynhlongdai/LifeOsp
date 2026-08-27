import { useEffect, useMemo, useState } from "react";
import type { NowView, ResolveNowRecommendationInput } from "@lifeos/domain";
import { createApiClient } from "./api";
import { createNowApiClient } from "./now-api";
import { FocusPanel } from "./FocusPanel";
import { ErrorState, type AsyncState } from "./ui-states";

export function NowPage({ apiUrl }: { apiUrl: string }) {
  const [state, setState] = useState<AsyncState<NowView>>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

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
      setMutationError(error instanceof Error ? error.message : "Không thể cập nhật recommendation");
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

  if (state.kind === "loading") return <NowLoading />;
  if (state.kind === "error") {
    return <ErrorState title="NOW chưa sẵn sàng">{state.message}</ErrorState>;
  }

  const view = state.data;
  if (view.state === "no_direction") return <NoDirection view={view} />;
  if (view.state === "blocked") return <BlockedState view={view} />;
  if (view.state === "no_ready_action") {
    return (
      <NoReadyAction
        view={view}
        busy={busy}
        mutationError={mutationError}
        onRefresh={() => void refresh()}
      />
    );
  }

  return (
    <section className="now-page" aria-live="polite">
      <SeasonStrip view={view} />

      <article className="now-primary-card">
        <div className="now-primary-heading">
          <div>
            <p className="eyebrow">RIGHT NOW</p>
            <h2>{view.action.title}</h2>
          </div>
          <RecommendationStatus status={view.recommendation.status} />
        </div>

        {view.action.doneCondition ? (
          <div className="now-done-condition">
            <span>Khi nào được xem là xong?</span>
            <strong>{view.action.doneCondition}</strong>
          </div>
        ) : null}

        <div className="now-meta-row" aria-label="Thông tin Action">
          {view.action.estimatedMinutes ? <span>≈ {view.action.estimatedMinutes} phút</span> : null}
          {view.action.scheduledFor ? <span>Lịch: {formatDateTime(view.action.scheduledFor)}</span> : null}
          <span>{confidenceLabel(view.recommendation.confidenceClass)}</span>
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
          <div className="now-action-stack">
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
                  ? "Đã chấp nhận. Action vẫn ở trạng thái ready cho tới khi bước Execute/Focus bắt đầu."
                  : "Bạn đã chỉnh Action này. Evidence bên dưới vẫn giải thích recommendation ban đầu."}
              </div>
            )}

            <div className="now-secondary-actions">
              <button className="secondary-button" type="button" disabled={busy} onClick={() => setEditing(true)}>
                Chỉnh sửa
              </button>
              <button className="text-button" type="button" disabled={busy} onClick={() => setShowWhy((value) => !value)}>
                {showWhy ? "Ẩn lý do" : "Vì sao việc này?"}
              </button>
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
          </div>
        )}

        {showWhy ? <EvidencePanel view={view} /> : null}
      </article>

      <FocusPanel
        apiUrl={apiUrl}
        recommendationId={view.recommendation.id}
        recommendationStatus={view.recommendation.status}
      />

      <aside className="now-guardrail">
        <strong>NOW chỉ yêu cầu một quyết định.</strong>
        <span>Không có backlog phụ và không có client-side ranking. Việc khác vẫn ở ngoài vùng chú ý hiện tại.</span>
      </aside>
    </section>
  );
}

function SeasonStrip({ view }: { view: Extract<NowView, { state: "ready" }> }) {
  return (
    <div className="now-season-strip">
      <div>
        <p className="eyebrow">CURRENT SEASON</p>
        <strong>{view.season.title}</strong>
      </div>
      <p>{view.season.primaryFocusText ?? view.season.purpose}</p>
    </div>
  );
}

function RecommendationStatus({ status }: { status: "shown" | "accepted" | "edited" }) {
  const label = status === "shown" ? "Đề xuất" : status === "accepted" ? "Đã chấp nhận" : "Đã chỉnh";
  return <span className={`now-recommendation-status ${status}`}>{label}</span>;
}

function EvidencePanel({ view }: { view: Extract<NowView, { state: "ready" }> }) {
  return (
    <section className="now-evidence" aria-label="Recommendation evidence">
      <div className="now-evidence-heading">
        <div>
          <p className="eyebrow">WHY THIS?</p>
          <h3>Evidence đã được lưu khi recommendation được tạo</h3>
        </div>
        <span>{view.recommendation.evidence.length} tín hiệu</span>
      </div>
      <div className="now-evidence-list">
        {view.recommendation.evidence.map((item) => (
          <div className="now-evidence-item" key={item.key}>
            <div>
              <strong>{item.label}</strong>
              <small>{evidenceStrengthLabel(item.strength)}</small>
            </div>
            <span className="now-score">{item.score >= 0 ? "+" : ""}{item.score}</span>
          </div>
        ))}
      </div>
      <small className="now-evidence-footnote">
        Đây là score/evidence cấp sản phẩm, không phải chain-of-thought ẩn của AI.
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
        <span>Action</span>
        <input value={title} maxLength={500} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        <span>Điều kiện hoàn thành</span>
        <textarea value={doneCondition} maxLength={1000} rows={3} onChange={(event) => setDoneCondition(event.target.value)} />
      </label>
      <label className="now-minutes-field">
        <span>Ước lượng phút</span>
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
    <section className="now-empty-card">
      <p className="eyebrow">NO DIRECTION</p>
      <h2>Chưa cần ép mình chọn một task.</h2>
      <p>{view.message}</p>
      <div className="now-empty-actions">
        <a className="primary-button link-button" href="/direction">Xác định hướng hiện tại</a>
        <a className="text-button link-button" href="/clarity">Brain Dump trước</a>
      </div>
    </section>
  );
}

function NoReadyAction({
  view,
  busy,
  mutationError,
  onRefresh
}: {
  view: Extract<NowView, { state: "no_ready_action" }>;
  busy: boolean;
  mutationError: string | null;
  onRefresh: () => void;
}) {
  const resolved = view.reason === "recommendation_resolved";
  return (
    <section className="now-page">
      <div className="now-season-strip">
        <div><p className="eyebrow">CURRENT SEASON</p><strong>{view.season.title}</strong></div>
        <p>{view.season.primaryFocusText ?? view.season.purpose}</p>
      </div>
      <section className="now-empty-card">
        <p className="eyebrow">{resolved ? "USER CONTROL" : "NO READY ACTION"}</p>
        <h2>{resolved ? "LifeOS đã tôn trọng quyết định vừa rồi." : "Chưa có một việc đủ rõ để đặt vào RIGHT NOW."}</h2>
        <p>{view.message}</p>
        {mutationError ? <p className="now-inline-error" role="alert">{mutationError}</p> : null}
        <div className="now-empty-actions">
          {resolved || view.reason === "recommendation_missing" ? (
            <button className="secondary-button" type="button" disabled={busy} onClick={onRefresh}>
              {busy ? "Đang tính lại…" : "Yêu cầu đề xuất lại"}
            </button>
          ) : null}
          <a className="text-button link-button" href="/execute">Xem vùng Execute</a>
        </div>
        {resolved ? <small>LifeOS không tự đưa recommendation đã bác trở lại. Nút trên là một yêu cầu mới có chủ ý.</small> : null}
      </section>
    </section>
  );
}

function BlockedState({ view }: { view: Extract<NowView, { state: "blocked" }> }) {
  return (
    <section className="now-page">
      <div className="now-season-strip">
        <div><p className="eyebrow">CURRENT SEASON</p><strong>{view.season.title}</strong></div>
        <p>{view.season.primaryFocusText ?? view.season.purpose}</p>
      </div>
      <section className="now-empty-card blocked">
        <p className="eyebrow">BLOCKED</p>
        <h2>Không nên giả vờ rằng bạn có một “next action” khả thi.</h2>
        <p>{view.message}</p>
        <strong>{view.blockedActionCount} Action đang bị chặn</strong>
        <p className="now-muted">NOW chỉ báo trạng thái thật. Việc gỡ blocker sẽ thuộc flow Execute tiếp theo.</p>
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
      <p className="now-loading-label">Đang đọc Current Season và recommendation đã lưu…</p>
    </section>
  );
}

function confidenceLabel(value: string) {
  if (value === "direct") return "Evidence trực tiếp";
  if (value === "strong_pattern") return "Pattern mạnh";
  if (value === "possible_pattern") return "Pattern có thể";
  return "Gợi ý";
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
