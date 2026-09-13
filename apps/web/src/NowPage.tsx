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
    <section className="now-page-v2" aria-live="polite">
      <SeasonBanner view={view} />

      <article className="now-card-v2">
        <div className="now-card-header">
          <div className="now-badge">
            <span>⚡</span>
            <span>Việc cần làm tiếp</span>
          </div>
          <div className="confidence-indicator">
            <span className="confidence-dot"></span>
            <span>{confidenceLabel(view.recommendation.confidenceClass)}</span>
          </div>
        </div>

        <h2 className="now-title">{view.action.title}</h2>

        {view.action.doneCondition ? (
          <div className="done-condition-box">
            <div className="done-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div>
              <div className="done-label">Khi nào xong</div>
              <div className="done-text">{view.action.doneCondition}</div>
            </div>
          </div>
        ) : null}

        <div className="now-tags">
          {view.action.estimatedMinutes ? (
            <span className="tag">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              ≈ {view.action.estimatedMinutes} phút
            </span>
          ) : null}
          {view.action.scheduledFor ? (
            <span className="tag">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              {formatDate(view.action.scheduledFor)}
            </span>
          ) : null}
        </div>

        <p className="now-rationale-v2">{view.recommendation.rationale}</p>

        {mutationError ? <div className="error-message-v2">{mutationError}</div> : null}

        {editing ? (
          <EditActionForm
            view={view}
            busy={busy}
            onCancel={() => setEditing(false)}
            onSave={(input) => void resolve(view.recommendation.id, input)}
          />
        ) : (
          <div className="now-actions-v2">
            {view.recommendation.status === "shown" ? (
              <button
                className="btn btn-primary btn-lg"
                type="button"
                disabled={busy}
                onClick={() => void resolve(view.recommendation.id, { resolution: "accepted" })}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Bắt đầu Focus
              </button>
            ) : (
              <div className="confirmed-badge">
                {view.recommendation.status === "accepted"
                  ? "✓ Đã chấp nhận. Action đang ở trạng thái ready."
                  : "✓ Đã chỉnh sửa. Evidence bên dưới vẫn giải thích recommendation ban đầu."}
              </div>
            )}

            <div className="now-secondary-row">
              <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => setEditing(true)}>
                Chỉnh sửa
              </button>
              <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => setShowWhy((value) => !value)}>
                {showWhy ? "Ẩn lý do" : "Vì sao việc này?"}
              </button>
            </div>

            <div className="now-tertiary-row">
              <button
                className="btn btn-ghost"
                type="button"
                disabled={busy}
                onClick={() => void resolve(view.recommendation.id, { resolution: "not_now" })}
              >
                Để sau
              </button>
              <button
                className="btn btn-ghost"
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

      <div className="now-footer-note">
        "NOW chỉ yêu cầu một quyết định. Những việc khác đã có chỗ riêng."
      </div>
    </section>
  );
}

function SeasonBanner({ view }: { view: Extract<NowView, { state: "ready" | "no_ready_action" | "blocked" }> }) {
  return (
    <div className="season-banner-v2">
      <div className="season-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
          <path d="M2 17l10 5 10-5"></path>
          <path d="M2 12l10 5 10-5"></path>
        </svg>
      </div>
      <div className="season-info">
        <div className="season-label">Mùa hiện tại</div>
        <div className="season-name">{view.season.title}</div>
      </div>
    </div>
  );
}

function EvidencePanel({ view }: { view: Extract<NowView, { state: "ready" }> }) {
  return (
    <section className="evidence-panel-v2" aria-label="Recommendation evidence">
      <div className="evidence-header">
        <h3>Vì sao việc này?</h3>
        <span className="evidence-count">{view.recommendation.evidence.length} tín hiệu</span>
      </div>
      <div className="evidence-list">
        {view.recommendation.evidence.map((item) => (
          <div className="evidence-item" key={item.key}>
            <div className="evidence-content">
              <strong>{item.label}</strong>
              <small>{evidenceStrengthLabel(item.strength)}</small>
            </div>
            <span className={`evidence-badge badge-${item.strength}`}>
              {item.score >= 0 ? "+" : ""}{item.score}
            </span>
          </div>
        ))}
      </div>
      <p className="evidence-footnote">
        Dựa trên dữ liệu thực tế, không phải suy đoán của AI.
      </p>
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
    <div className="edit-form-v2">
      <label>
        <span>Action</span>
        <input className="input" value={title} maxLength={500} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        <span>Điều kiện hoàn thành</span>
        <textarea className="input" value={doneCondition} maxLength={1000} rows={3} onChange={(event) => setDoneCondition(event.target.value)} />
      </label>
      <label>
        <span>Ước lượng phút</span>
        <input
          className="input"
          type="number"
          min={1}
          max={480}
          value={estimatedMinutes}
          onChange={(event) => setEstimatedMinutes(event.target.value)}
        />
      </label>
      <div className="edit-actions">
        <button className="btn btn-primary" type="button" disabled={busy || title.trim().length === 0} onClick={submit}>
          Lưu chỉnh sửa
        </button>
        <button className="btn btn-secondary" type="button" disabled={busy} onClick={onCancel}>
          Hủy
        </button>
      </div>
    </div>
  );
}

function NoDirection({ view }: { view: Extract<NowView, { state: "no_direction" }> }) {
  return (
    <section className="empty-state-v2">
      <div className="empty-icon">🧭</div>
      <h2>Chưa có hướng đi</h2>
      <p>{view.message}</p>
      <div className="empty-actions">
        <a className="btn btn-primary" href="/clarity">
          Bắt đầu Clarity Reset
        </a>
        <a className="btn btn-secondary" href="/direction">
          Xác định hướng hiện tại
        </a>
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
    <section className="now-page-v2">
      <SeasonBanner view={view} />
      <section className="empty-state-v2">
        <div className="empty-icon">{resolved ? "✓" : "🎯"}</div>
        <h2>{resolved ? "Đã tôn trọng quyết định của bạn" : "Chưa có action sẵn sàng"}</h2>
        <p>{view.message}</p>
        {mutationError ? <div className="error-message-v2">{mutationError}</div> : null}
        <div className="empty-actions">
          {(resolved || view.reason === "recommendation_missing") ? (
            <button className="btn btn-primary" type="button" disabled={busy} onClick={onRefresh}>
              {busy ? "Đang tính lại…" : "Yêu cầu đề xuất lại"}
            </button>
          ) : null}
          <a className="btn btn-secondary" href="/execute">
            Xem vùng Execute
          </a>
        </div>
        {resolved ? (
          <p className="empty-note">
            LifeOS không tự đưa recommendation đã bác trở lại. Nút trên là một yêu cầu mới có chủ ý.
          </p>
        ) : null}
      </section>
    </section>
  );
}

function BlockedState({ view }: { view: Extract<NowView, { state: "blocked" }> }) {
  return (
    <section className="now-page-v2">
      <SeasonBanner view={view} />
      <section className="empty-state-v2 blocked">
        <div className="empty-icon">🚧</div>
        <h2>Đang bị chặn</h2>
        <p>{view.message}</p>
        <div className="blocked-count">{view.blockedActionCount} Action đang bị chặn</div>
        <p className="empty-note">
          NOW chỉ báo trạng thái thật. Việc gỡ blocker sẽ thuộc flow Execute tiếp theo.
        </p>
        <a className="btn btn-secondary" href="/execute">
          Xem Execute
        </a>
      </section>
    </section>
  );
}

function NowLoading() {
  return (
    <section className="now-page-v2 loading">
      <div className="loading-skeleton season-skeleton"></div>
      <div className="loading-skeleton card-skeleton"></div>
      <p className="loading-text">Đang tải...</p>
    </section>
  );
}

function confidenceLabel(value: string) {
  if (value === "direct") return "Trực tiếp";
  if (value === "strong_pattern") return "Pattern mạnh";
  if (value === "possible_pattern") return "Có thể";
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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(date);
}
