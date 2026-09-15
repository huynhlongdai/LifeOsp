import { useEffect, useMemo, useState } from "react";
import {
  describeStuckEvidence,
  GET_UNSTUCK_FRICTIONS,
  type GetUnstuckDiagnosisView,
  type GetUnstuckFriction,
  type StuckActionEvidence
} from "@lifeos/domain";
import { ApiRequestError, createApiClient } from "./api";
import { createGetUnstuckApiClient } from "./get-unstuck-api";
import { createResultApiClient } from "./result-api";
import { EmptyState, ErrorState, type AsyncState } from "./ui-states";

// Get Unstuck V0 (FIGMA_AI_DESIGN_BRIEF_V1 §17, PRODUCT_SURFACE_SPEC_V1 §12,
// Meeting #003 Pattern B). Evidence first, one question, one intervention.
// No advice before evidence, no multi-step coaching.

const FRICTION_COPY: Record<GetUnstuckFriction, string> = {
  unclear_first_step: "Chưa rõ bước đầu",
  too_large: "Quá lớn",
  blocked: "Đang bị chặn",
  insufficient_capacity: "Không đủ thời gian hoặc năng lượng",
  lower_priority: "Ưu tiên khác quan trọng hơn",
  no_longer_important: "Không còn quan trọng",
  other: "Khác"
};

type ExpandedState =
  | { stage: "friction" }
  | { stage: "resolving" }
  | { stage: "diagnosed"; diagnosis: GetUnstuckDiagnosisView }
  | { stage: "resolved"; message: string };

export function GetUnstuckPage({ apiUrl }: { apiUrl: string }) {
  const getUnstuckApi = useMemo(() => createGetUnstuckApiClient(apiUrl), [apiUrl]);
  const resultApi = useMemo(() => createResultApiClient(apiUrl), [apiUrl]);
  const sessionApi = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [state, setState] = useState<AsyncState<StuckActionEvidence[]>>({ kind: "loading" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ExpandedState>({ stage: "friction" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setState({ kind: "loading" });
        await sessionApi.bootstrapSession(controller.signal);
        const view = await getUnstuckApi.listCandidates(controller.signal);
        setState({ kind: "success", data: view.candidates });
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setState({ kind: "error", message: reason instanceof Error ? reason.message : "Không thể tải danh sách" });
      }
    };
    void load();
    return () => controller.abort();
  }, [getUnstuckApi, sessionApi]);

  const openCandidate = (actionId: string) => {
    setExpandedId((current) => (current === actionId ? null : actionId));
    setExpanded({ stage: "friction" });
    setError(null);
  };

  const resolveCandidate = (actionId: string, message: string) => {
    setState((current) =>
      current.kind === "success" ? { kind: "success", data: current.data.filter((item) => item.action.id !== actionId) } : current
    );
    setExpandedId(null);
    setExpanded({ stage: "resolved", message });
  };

  const submitFriction = async (actionId: string, friction: GetUnstuckFriction) => {
    setExpanded({ stage: "resolving" });
    setError(null);
    try {
      const diagnosis = await getUnstuckApi.diagnose(actionId, friction);
      setExpanded({ stage: "diagnosed", diagnosis });
    } catch (reason) {
      setError(diagnoseErrorMessage(reason));
      setExpanded({ stage: "friction" });
    }
  };

  if (state.kind === "loading") {
    return (
      <section className="get-unstuck-page" aria-busy="true">
        <div className="now-loading-strip" />
        <div className="now-loading-card"><span /><span /><span /></div>
      </section>
    );
  }
  if (state.kind === "error") return <ErrorState title="Chưa mở được Gỡ vướng">{state.message}</ErrorState>;

  const candidates = state.data;
  if (candidates.length === 0 && expandedId === null && expanded.stage !== "resolved") {
    return (
      <EmptyState label="Gỡ vướng" title="Không có việc nào đang kẹt." actions={<a className="text-button link-button" href="/">Về NOW</a>}>
        Khi một việc bị chặn, hoặc dịch chuyển nhiều lần, nó sẽ xuất hiện ở đây — cùng bằng chứng thật, không phải lời khuyên đoán mò.
      </EmptyState>
    );
  }

  return (
    <section className="get-unstuck-page">
      {expanded.stage === "resolved" ? (
        <div className="now-result-note" role="status">
          <span>{expanded.message}</span>
          <button className="text-button" type="button" onClick={() => setExpanded({ stage: "friction" })}>
            Đóng
          </button>
        </div>
      ) : null}

      {candidates.length === 0 ? (
        <p className="muted">Không còn việc nào đang kẹt trong danh sách này ngay bây giờ.</p>
      ) : (
        <ul className="get-unstuck-list">
          {candidates.map((evidence) => (
            <li key={evidence.action.id} className="sheet get-unstuck-card">
              <button
                className="get-unstuck-card-head"
                type="button"
                aria-expanded={expandedId === evidence.action.id}
                onClick={() => openCandidate(evidence.action.id)}
              >
                <div>
                  <b className="get-unstuck-title">{evidence.action.title}</b>
                  <p className="get-unstuck-evidence">{describeStuckEvidence(evidence)}</p>
                </div>
                <span className="get-unstuck-chevron" aria-hidden="true">{expandedId === evidence.action.id ? "–" : "+"}</span>
              </button>

              {expandedId === evidence.action.id ? (
                <div className="get-unstuck-body">
                  {expanded.stage === "friction" || expanded.stage === "resolving" ? (
                    <>
                      <p className="get-unstuck-question">Điều gì đang khiến việc này khó tiến lên?</p>
                      <div className="get-unstuck-frictions" role="radiogroup" aria-label="Chọn điều đang cản">
                        {GET_UNSTUCK_FRICTIONS.map((friction) => (
                          <button
                            key={friction}
                            type="button"
                            className="get-unstuck-friction"
                            disabled={expanded.stage === "resolving"}
                            onClick={() => void submitFriction(evidence.action.id, friction)}
                          >
                            {FRICTION_COPY[friction]}
                          </button>
                        ))}
                      </div>
                      {error ? <p className="now-inline-error" role="alert">{error}</p> : null}
                    </>
                  ) : null}

                  {expanded.stage === "diagnosed" ? (
                    <InterventionStep
                      diagnosis={expanded.diagnosis}
                      getUnstuckApi={getUnstuckApi}
                      resultApi={resultApi}
                      onResolved={(message) => resolveCandidate(evidence.action.id, message)}
                      onBack={() => setExpanded({ stage: "friction" })}
                    />
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function InterventionStep({
  diagnosis,
  getUnstuckApi,
  resultApi,
  onResolved,
  onBack
}: {
  diagnosis: GetUnstuckDiagnosisView;
  getUnstuckApi: ReturnType<typeof createGetUnstuckApiClient>;
  resultApi: ReturnType<typeof createResultApiClient>;
  onResolved: (message: string) => void;
  onBack: () => void;
}) {
  const { evidence, intervention, canRevive, canRecordResult } = diagnosis;
  const [title, setTitle] = useState(evidence.action.title);
  const [doneCondition, setDoneCondition] = useState(evidence.action.doneCondition ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(evidence.action.estimatedMinutes ? String(evidence.action.estimatedMinutes) : "15");
  const [blockedReason, setBlockedReason] = useState(evidence.action.blockedReason ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (intervention === "clarify" || intervention === "resize") {
    const applyEdit = async () => {
      setBusy(true);
      setError(null);
      try {
        await getUnstuckApi.applyEdit(evidence.action.id, {
          intervention,
          title: title.trim() || evidence.action.title,
          ...(doneCondition.trim() ? { doneCondition: doneCondition.trim() } : {}),
          ...(intervention === "resize" && estimatedMinutes.trim() ? { estimatedMinutes: Number(estimatedMinutes) } : {})
        });
        onResolved(
          intervention === "resize"
            ? "Đã lưu một bước nhỏ hơn để bắt đầu."
            : "Đã lưu lại rõ hơn khi nào việc này được xem là xong."
        );
      } catch (reason) {
        setError(interventionErrorMessage(reason));
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="get-unstuck-intervention">
        <p className="eyebrow accent">{intervention === "resize" ? "Bước nhỏ hơn" : "Làm rõ hơn"}</p>
        <label>
          <span>Việc</span>
          <input value={title} maxLength={500} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          <span>Xong khi</span>
          <textarea value={doneCondition} rows={2} maxLength={1000} onChange={(event) => setDoneCondition(event.target.value)} />
        </label>
        {intervention === "resize" ? (
          <label className="get-unstuck-minutes">
            <span>Ước lượng (phút)</span>
            <input type="number" min={1} max={480} value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(event.target.value)} />
          </label>
        ) : null}
        {error ? <p className="now-inline-error" role="alert">{error}</p> : null}
        <div className="get-unstuck-actions">
          <button className="primary-button" type="button" disabled={busy || title.trim().length === 0} onClick={() => void applyEdit()}>
            {busy ? "Đang lưu…" : "Dùng bản này"}
          </button>
          <button className="text-button" type="button" disabled={busy} onClick={onBack}>Chọn lại</button>
        </div>
      </div>
    );
  }

  if (canRevive) {
    const revive = async () => {
      setBusy(true);
      setError(null);
      try {
        await getUnstuckApi.revive(evidence.action.id);
        onResolved(
          intervention === "unblock"
            ? "Đã đưa việc này trở lại. Bạn quyết định khi nào bắt đầu lại."
            : "Đã đưa việc này trở lại. Bạn có thể đặt lại ưu tiên hoặc bỏ nó ở Execute."
        );
      } catch (reason) {
        setError(interventionErrorMessage(reason));
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="get-unstuck-intervention">
        <p className="eyebrow notnow">Hồi phục</p>
        <p>Việc này hiện đang {evidence.action.status === "blocked" ? "bị chặn" : "để sau"}. Đưa nó về sẵn sàng để có cơ hội mới.</p>
        {error ? <p className="now-inline-error" role="alert">{error}</p> : null}
        <div className="get-unstuck-actions">
          <button className="primary-button" type="button" disabled={busy} onClick={() => void revive()}>
            {busy ? "Đang hồi phục…" : "Hồi phục việc này"}
          </button>
          <button className="text-button" type="button" disabled={busy} onClick={onBack}>Chọn lại</button>
        </div>
      </div>
    );
  }

  if (canRecordResult) {
    const targetResult = intervention === "unblock" ? "blocked" : intervention === "pause_drop" ? "dropped" : "postponed";
    const submit = async () => {
      if (targetResult === "blocked" && blockedReason.trim().length === 0) return;
      setBusy(true);
      setError(null);
      try {
        await resultApi.recordResult(evidence.action.id, {
          result: targetResult,
          ...(targetResult === "blocked" ? { blockedReason: blockedReason.trim() } : {})
        });
        onResolved(
          targetResult === "blocked"
            ? "Đã ghi lại là đang bị chặn, kèm lý do."
            : targetResult === "dropped"
              ? "Đã bỏ việc này. Không cần lý do phải giữ mọi thứ."
              : "Đã để việc này sau, không có nợ quá hạn."
        );
      } catch (reason) {
        setError(interventionErrorMessage(reason));
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="get-unstuck-intervention">
        <p className="eyebrow caution">{targetResult === "blocked" ? "Ghi lại đang bị chặn" : targetResult === "dropped" ? "Bỏ việc này" : "Để sau"}</p>
        {targetResult === "blocked" ? (
          <label>
            <span>Điều gì đang chặn?</span>
            <input value={blockedReason} maxLength={1000} onChange={(event) => setBlockedReason(event.target.value)} />
          </label>
        ) : (
          <p>Việc này sẽ rời khỏi NOW cho tới khi bạn chủ động quay lại nó ở Execute.</p>
        )}
        {error ? <p className="now-inline-error" role="alert">{error}</p> : null}
        <div className="get-unstuck-actions">
          <button
            className="primary-button"
            type="button"
            disabled={busy || (targetResult === "blocked" && blockedReason.trim().length === 0)}
            onClick={() => void submit()}
          >
            {busy ? "Đang ghi…" : "Dùng bản này"}
          </button>
          <button className="text-button" type="button" disabled={busy} onClick={onBack}>Chọn lại</button>
        </div>
      </div>
    );
  }

  return <p className="muted">Việc này không còn ở trạng thái có thể xử lý tiếp ở đây.</p>;
}

function diagnoseErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang.";
    if (error.status === 404) return "Không tìm thấy việc này nữa.";
    if (error.status === 409) return "Việc này không còn dấu hiệu bị kẹt nữa.";
  }
  return "Chưa ghi nhận được lựa chọn của bạn. Thử lại.";
}

function interventionErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang.";
    if (error.status === 404) return "Không tìm thấy việc này nữa.";
    if (error.status === 409) return "Việc này đã đổi trạng thái ở nơi khác. Thử tải lại.";
  }
  return "Chưa lưu được. Nội dung vẫn còn ở đây — thử lại.";
}
