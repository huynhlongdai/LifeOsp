import { useMemo, useState } from "react";
import type { ActionResultOutcome, ActionResultView, RecordActionResultInput } from "@lifeos/domain";
import { ApiRequestError } from "./api";
import { createResultApiClient } from "./result-api";

type ResultPanelProps = {
  apiUrl: string;
  actionId: string;
  /** Active FocusSession for this Action, committed together only when the user chooses. */
  focusSessionId?: string;
  onRecorded?: (result: ActionResultView) => void;
};

const OUTCOME_LABELS: Record<ActionResultOutcome, string> = {
  completed: "Đã xong",
  partial: "Xong một phần",
  postponed: "Dời lại",
  blocked: "Bị chặn",
  dropped: "Bỏ"
};

const OUTCOMES: readonly ActionResultOutcome[] = ["completed", "partial", "postponed", "blocked", "dropped"];

/**
 * B5 Result V0. The user always states the result explicitly; LifeOS never
 * infers it and never adds mood/energy/friction fields the user did not enter.
 */
export function ResultPanel({ apiUrl, actionId, focusSessionId, onRecorded }: ResultPanelProps) {
  const resultApi = useMemo(() => createResultApiClient(apiUrl), [apiUrl]);
  const [outcome, setOutcome] = useState<ActionResultOutcome | null>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [commitFocus, setCommitFocus] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<ActionResultView | null>(null);

  const reasonRequired = outcome === "blocked";
  const canSubmit = outcome !== null && (!reasonRequired || reason.trim().length > 0);

  const submit = async () => {
    if (outcome === null) return;
    try {
      setBusy(true);
      setError(null);
      const input: RecordActionResultInput = {
        outcome,
        ...(note.trim().length > 0 ? { note: note.trim() } : {}),
        ...(reason.trim().length > 0 ? { reason: reason.trim() } : {}),
        ...(focusSessionId && commitFocus
          ? { focusSessionId: focusSessionId as NonNullable<RecordActionResultInput["focusSessionId"]> }
          : {})
      };
      const result = await resultApi.recordActionResult(actionId, input);
      setRecorded(result);
      onRecorded?.(result);
    } catch (caught) {
      setError(resultErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  if (recorded) {
    return (
      <section className="result-panel result-panel-recorded" aria-live="polite">
        <p className="eyebrow">KẾT QUẢ ĐÃ GHI</p>
        <p>
          <strong>{OUTCOME_LABELS[recorded.outcome]}</strong>
          {recorded.focusMinutes === undefined ? null : <span> · {recorded.focusMinutes} phút Focus</span>}
        </p>
        {recorded.note ? <p className="result-note">{recorded.note}</p> : null}
      </section>
    );
  }

  return (
    <section className="result-panel">
      <p className="eyebrow">GHI KẾT QUẢ THỰC TẾ</p>
      <div className="result-outcomes" role="group" aria-label="Kết quả của Action">
        {OUTCOMES.map((value) => (
          <button
            key={value}
            type="button"
            className={value === outcome ? "chip chip-selected" : "chip"}
            aria-pressed={value === outcome}
            disabled={busy}
            onClick={() => setOutcome(value)}
          >
            {OUTCOME_LABELS[value]}
          </button>
        ))}
      </div>

      {reasonRequired ? (
        <label className="result-field">
          <span>Lý do bị chặn (bắt buộc)</span>
          <input
            type="text"
            value={reason}
            maxLength={2000}
            disabled={busy}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Vd: Đang chờ quyền truy cập API"
          />
        </label>
      ) : null}

      <label className="result-field">
        <span>Ghi chú (tuỳ chọn)</span>
        <textarea
          value={note}
          rows={2}
          maxLength={2000}
          disabled={busy}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Chỉ ghi điều thực sự đã xảy ra."
        />
      </label>

      {focusSessionId ? (
        <label className="result-focus-toggle">
          <input
            type="checkbox"
            checked={commitFocus}
            disabled={busy}
            onChange={(event) => setCommitFocus(event.target.checked)}
          />
          <span>Kết thúc luôn Focus session đang chạy</span>
        </label>
      ) : null}

      {error ? (
        <p className="now-inline-error" role="alert">
          {error}
        </p>
      ) : null}

      <button className="primary-button" type="button" disabled={busy || !canSubmit} onClick={() => void submit()}>
        {busy ? "Đang ghi…" : "Ghi kết quả"}
      </button>
    </section>
  );
}

export function resultErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    const code = isRecord(error.body) && typeof error.body.error === "string" ? error.body.error : undefined;
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang.";
    if (error.status === 404) return "Không tìm thấy Action này.";
    if (code === "already_recorded") return "Action này đã có kết quả được ghi.";
    if (code === "invalid_status") return "Chỉ Action đang ở trạng thái sẵn sàng mới ghi được kết quả.";
    if (code === "invalid_focus") return "Focus session không hợp lệ cho Action này.";
    if (code === "reason_required") return "Kết quả bị chặn cần một lý do.";
    if (code === "already_closed") return "Ngày này đã được chốt.";
    return error.message;
  }
  return error instanceof Error ? error.message : "Không thể ghi kết quả";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
