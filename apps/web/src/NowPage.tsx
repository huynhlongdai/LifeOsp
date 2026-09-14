import { useCallback, useEffect, useMemo, useState } from "react";
import type { IncubatorItemView, NowView, ResolveNowRecommendationInput } from "@lifeos/domain";
import { createApiClient } from "./api";
import { createNowApiClient } from "./now-api";
import { FocusPanel } from "./FocusPanel";
import { ResultPanel } from "./ResultPanel";
import { ErrorState, type AsyncState } from "./ui-states";

export function NowPage({ apiUrl }: { apiUrl: string }) {
  const [state, setState] = useState<AsyncState<NowView>>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [activeFocusSessionId, setActiveFocusSessionId] = useState<string | null>(null);

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

  const handleActiveFocusChange = useCallback((focusSessionId: string | null) => {
    setActiveFocusSessionId(focusSessionId);
  }, []);

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

  const evidence = view.recommendation.evidence;

  return (
    <div className="pb-8 md:max-w-2xl" aria-live="polite">
      {/* Hero — ported from the Figma prototype (NowScreen) */}
      <div className="hero-now relative overflow-hidden" style={{ padding: "36px 20px" }}>
        <HeroDoodles />
        <div className="relative z-10 flex items-center justify-between mb-5">
          <p className="text-xs font-extrabold" style={{ color: "var(--text-3)", letterSpacing: "0.14em" }}>
            {todayLabel().toUpperCase()}
          </p>
          <SeasonBadge view={view} />
        </div>
        <h1
          className="relative z-10 mb-2 font-display"
          style={{ fontSize: "clamp(58px, 13vw, 78px)", lineHeight: 0.87, letterSpacing: "-0.01em", color: "var(--text)", textTransform: "uppercase" }}
        >
          NGAY<br />BÂY GIỜ.
        </h1>
        <p className="relative z-10 font-hand" style={{ fontSize: 21, fontWeight: 600, color: "var(--text-2)" }}>
          Chỉ một việc. Làm tốt nhất có thể.
        </p>
      </div>

      <div className="px-4 pt-5 md:px-6">
        <div className="card-gradient-border rounded-[26px] p-px mb-5" style={{ boxShadow: "var(--shadow-raise)" }}>
          <div className="rounded-[25px] overflow-hidden" style={{ background: "var(--card)" }}>
            <div className="px-5 pt-5 pb-4 flex items-start gap-4">
              <span
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #fde68a, #f59e0b)", boxShadow: "0 6px 24px rgba(245,158,11,0.32)" }}
                aria-hidden="true"
              >
                🚀
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-extrabold mb-1" style={{ color: "var(--text-3)", letterSpacing: "0.12em" }}>
                  {view.recommendation.status === "shown" ? "ĐỀ XUẤT AI" : view.recommendation.status === "accepted" ? "ĐÃ CHẤP NHẬN" : "BẠN ĐÃ CHỈNH"}
                </p>
                <h2 className="text-xl leading-snug font-display" style={{ color: "var(--text)", letterSpacing: "0.01em" }}>
                  {view.action.title}
                </h2>
                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={CHIP_PRIMARY}>
                    {view.season.title}
                  </span>
                  {view.action.estimatedMinutes ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full" style={CHIP_PRIMARY}>
                      <ClockIcon /> {view.action.estimatedMinutes} phút
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg" style={CHIP_MUTED}>
                    {confidenceLabel(view.recommendation.confidenceClass)}
                  </span>
                  {view.action.scheduledFor ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg" style={CHIP_MUTED}>
                      {formatDateTime(view.action.scheduledFor)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 space-y-3">
              {view.action.doneCondition ? (
                <div className="px-3.5 py-3.5 rounded-2xl" style={{ background: "rgba(22,163,74,0.07)", border: "1px solid rgba(22,163,74,0.16)" }}>
                  <p className="text-[9px] font-extrabold tracking-widest mb-1.5 flex items-center gap-1" style={{ color: "var(--green)" }}>
                    <CheckIcon /> THÀNH CÔNG KHI
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>{view.action.doneCondition}</p>
                </div>
              ) : null}

              <p className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>{view.recommendation.rationale}</p>

              {mutationError ? (
                <p className="text-xs px-3.5 py-3 rounded-2xl" role="alert" style={{ color: "var(--red)", background: "var(--red-bg)", border: "1px solid var(--border)" }}>
                  {mutationError}
                </p>
              ) : null}

              {editing ? (
                <EditActionForm
                  view={view}
                  busy={busy}
                  onCancel={() => setEditing(false)}
                  onSave={(input) => void resolve(view.recommendation.id, input)}
                />
              ) : (
                <>
                  {view.recommendation.status === "shown" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void resolve(view.recommendation.id, { resolution: "accepted" })}
                      className="btn-primary-action w-full h-14 rounded-2xl flex items-center justify-between px-5 active:scale-[0.97]"
                    >
                      <span className="text-[15px] font-display">Chấp nhận việc này</span>
                      <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent)" }}>
                        <ArrowIcon />
                      </span>
                    </button>
                  ) : (
                    <div className="px-4 py-3.5 rounded-2xl text-xs leading-relaxed" role="status" style={{ background: "var(--primary-bg)", border: "1px solid var(--primary-border)", color: "var(--primary)" }}>
                      {view.recommendation.status === "accepted"
                        ? "Đã chấp nhận. Action vẫn ở trạng thái ready cho tới khi bước Execute/Focus bắt đầu."
                        : "Bạn đã chỉnh Action này. Evidence bên dưới vẫn giải thích recommendation ban đầu."}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowWhy(true)}
                    className="w-full h-10 rounded-xl font-semibold text-sm"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-2)" }}
                  >
                    Tại sao việc này? →
                  </button>

                  <div className="flex gap-2">
                    <button type="button" disabled={busy} onClick={() => setEditing(true)} className="flex-1 h-10 rounded-xl font-semibold text-xs" style={SOFT_BUTTON}>
                      Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void resolve(view.recommendation.id, { resolution: "not_now" })}
                      className="flex-1 h-10 rounded-xl font-semibold text-xs"
                      style={SOFT_BUTTON}
                    >
                      Để sau
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void resolve(view.recommendation.id, { resolution: "wrong_assumption" })}
                      className="flex-1 h-10 rounded-xl font-semibold text-xs"
                      style={SOFT_BUTTON}
                    >
                      Giả định sai
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <FocusPanel
          apiUrl={apiUrl}
          recommendationId={view.recommendation.id}
          recommendationStatus={view.recommendation.status}
          onActiveFocusChange={handleActiveFocusChange}
        />

        <ResultPanel
          apiUrl={apiUrl}
          actionId={view.action.id}
          {...(activeFocusSessionId ? { focusSessionId: activeFocusSessionId } : {})}
          onRecorded={() => void refresh()}
        />

        <ParkedIdeas apiUrl={apiUrl} />

        <p className="text-[11px] leading-relaxed mt-4" style={{ color: "var(--text-3)" }}>
          NOW chỉ yêu cầu một quyết định. Không có backlog phụ và không có client-side ranking.
        </p>
      </div>

      {showWhy ? <WhySheet evidence={evidence} onClose={() => setShowWhy(false)} /> : null}
    </div>
  );
}

const CHIP_PRIMARY = {
  background: "var(--primary-bg)",
  color: "var(--primary)",
  border: "1px solid var(--primary-border)"
} as const;

const CHIP_MUTED = {
  background: "rgba(55,65,81,0.06)",
  color: "var(--text-2)",
  border: "1px solid var(--border)"
} as const;

const SOFT_BUTTON = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  color: "var(--text-2)"
} as const;

function HeroDoodles() {
  return (
    <>
      <svg className="absolute pointer-events-none" style={{ top: 14, left: 16, opacity: 0.18 }} width="36" height="28" viewBox="0 0 36 28" fill="none" aria-hidden="true">
        <path d="M2 26L9 6L18 15L27 6L34 26H2Z" stroke="var(--text)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <svg className="absolute pointer-events-none" style={{ top: 16, right: 20, opacity: 0.22 }} width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
        <path d="M17 2L20.5 12.5H32L22.5 19L26 29.5L17 23L8 29.5L11.5 19L2 12.5H13.5L17 2Z" stroke="var(--text)" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      <svg className="absolute pointer-events-none" style={{ bottom: 20, right: 28, opacity: 0.13 }} width="22" height="36" viewBox="0 0 22 36" fill="none" aria-hidden="true">
        <path d="M13 2L3 20H12L9 34L21 14H11L13 2Z" stroke="var(--text)" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    </>
  );
}

function SeasonBadge({ view }: { view: Extract<NowView, { state: "ready" }> }) {
  return (
    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "var(--green-bg)", border: "1.5px solid var(--border-2)" }}>
      <span className="rounded-full" style={{ width: 8, height: 8, background: "var(--green)" }} />
      <span className="text-[11px] font-extrabold" style={{ color: "var(--text)" }}>{view.season.primaryFocusText ?? view.season.title}</span>
    </span>
  );
}

function WhySheet({ evidence, onClose }: { evidence: Extract<NowView, { state: "ready" }>["recommendation"]["evidence"]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center" onClick={onClose} role="dialog" aria-label="Tại sao việc này?">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.48)", backdropFilter: "blur(8px)" }} />
      <div
        className="relative w-full md:max-w-md rounded-t-3xl md:rounded-3xl overflow-hidden"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-float)", border: "1px solid var(--border)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center pt-3.5 md:hidden">
          <span className="w-10 h-1 rounded-full" style={{ background: "var(--border-2)" }} />
        </div>
        <div className="px-5 pb-7 pt-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[9px] font-extrabold tracking-widest mb-0.5" style={{ color: "var(--text-3)" }}>EVIDENCE ĐÃ LƯU</p>
              <h3 className="text-xl font-display" style={{ color: "var(--text)" }}>Tại sao việc này?</h3>
            </div>
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-2)", color: "var(--text-2)" }} aria-label="Đóng">
              ✕
            </button>
          </div>
          <div className="space-y-2.5">
            {evidence.map((item) => (
              <div key={item.key} className="flex items-start gap-3 px-4 py-3.5 rounded-2xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <span className="text-[9px] font-extrabold px-2 py-1 rounded-lg mt-0.5 flex-shrink-0 tracking-wide" style={{ background: "var(--primary-bg)", color: "var(--primary)" }}>
                  {evidenceStrengthLabel(item.strength)}
                </span>
                <p className="text-sm leading-relaxed flex-1" style={{ color: "var(--text-2)" }}>{item.label}</p>
                <span className="text-xs font-bold" style={{ color: "var(--text-3)" }}>{item.score >= 0 ? "+" : ""}{item.score}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 px-4 py-3.5 rounded-2xl" style={{ background: "var(--primary-bg)", border: "1px solid var(--primary-border)" }}>
            <p className="text-xs leading-relaxed" style={{ color: "var(--primary)" }}>
              💡 Đây là score/evidence cấp sản phẩm đã lưu khi recommendation được tạo — không phải chain-of-thought ẩn của AI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.2" />
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="var(--accent-fg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function todayLabel() {
  return new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "numeric" }).format(new Date());
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

/**
 * "Đừng nghĩ bây giờ": the first few incubated items, so parked material is visible
 * without competing with the one Action NOW is asking about. Read-only on purpose.
 */
function ParkedIdeas({ apiUrl }: { apiUrl: string }) {
  const api = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [items, setItems] = useState<IncubatorItemView[] | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api
      .getInbox(controller.signal)
      .then((inbox) => {
        if (!inbox) return;
        setItems(inbox.incubated.slice(0, 3));
        setTotal(inbox.counts.incubated);
      })
      .catch(() => setItems(null));
    return () => controller.abort();
  }, [api]);

  if (!items || items.length === 0) return null;

  return (
    <section className="mt-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-extrabold tracking-widest" style={{ color: "var(--text-3)", letterSpacing: "0.12em" }}>
          ĐỪNG NGHĨ BÂY GIỜ · {total}
        </span>
        <a href="/incubator" className="text-xs font-bold" style={{ color: "var(--primary)", textDecoration: "none" }}>
          Xem tất cả →
        </a>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center gap-3.5 px-4 py-3.5"
            style={{ borderBottom: index < items.length - 1 ? "1px solid var(--border)" : "none" }}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--primary)" }} aria-hidden="true" />
            <span className="text-sm flex-1 font-medium truncate" style={{ color: "var(--text-2)" }}>{item.title}</span>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: "var(--bg-2)", color: "var(--text-3)" }}>
              {item.kind}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
