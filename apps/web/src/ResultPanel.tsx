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
      <section className="rounded-2xl p-4 mb-4" aria-live="polite" style={{ background: "var(--green-bg)", border: "1px solid var(--border)" }}>
        <p className="text-[10px] font-extrabold tracking-widest mb-1.5" style={{ color: "var(--green)" }}>KẾT QUẢ ĐÃ GHI</p>
        <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
          {OUTCOME_LABELS[recorded.outcome]}
          {recorded.focusMinutes === undefined ? null : <span style={{ fontWeight: 600 }}> · {recorded.focusMinutes} phút Focus</span>}
        </p>
        {recorded.note ? <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-2)" }}>{recorded.note}</p> : null}
      </section>
    );
  }

  return (
    <section className="rounded-2xl p-4 mb-4" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
      <p className="text-[10px] font-extrabold tracking-widest mb-3" style={{ color: "var(--text-3)", letterSpacing: "0.12em" }}>GHI KẾT QUẢ THỰC TẾ</p>
      <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Kết quả của Action">
        {OUTCOMES.map((value) => (
          <button
            key={value}
            type="button"
            className="text-xs font-bold px-3 py-2 rounded-full"
            style={
              value === outcome
                ? { background: "var(--primary-bg)", color: "var(--primary)", border: "1px solid var(--primary-border)" }
                : { background: "var(--bg)", color: "var(--text-2)", border: "1px solid var(--border)" }
            }
            aria-pressed={value === outcome}
            disabled={busy}
            onClick={() => setOutcome(value)}
          >
            {OUTCOME_LABELS[value]}
          </button>
        ))}
      </div>

      {reasonRequired ? (
        <label className="block mb-3">
          <span className="block text-[10px] font-extrabold tracking-widest mb-1.5" style={{ color: "var(--text-3)" }}>LÝ DO BỊ CHẶN (BẮT BUỘC)</span>
          <input
            type="text"
            value={reason}
            maxLength={2000}
            disabled={busy}
            onChange={(event) => setReason(event.target.value)}
            className="w-full px-3.5 py-3 rounded-2xl text-sm"
            style={FIELD_STYLE}
            placeholder="Vd: Đang chờ quyền truy cập API"
          />
        </label>
      ) : null}

      <label className="block mb-3">
        <span className="block text-[10px] font-extrabold tracking-widest mb-1.5" style={{ color: "var(--text-3)" }}>GHI CHÚ (TUỲ CHỌN)</span>
        <textarea
          value={note}
          rows={2}
          maxLength={2000}
          disabled={busy}
          onChange={(event) => setNote(event.target.value)}
          className="w-full px-3.5 py-3 rounded-2xl text-sm"
          style={FIELD_STYLE}
          placeholder="Chỉ ghi điều thực sự đã xảy ra."
        />
      </label>

      {focusSessionId ? (
        <label className="flex items-center gap-2.5 mb-3 text-xs" style={{ color: "var(--text-2)" }}>
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
        <p className="text-xs px-3.5 py-3 rounded-2xl mb-3" role="alert" style={{ color: "var(--red)", background: "var(--red-bg)", border: "1px solid var(--border)" }}>
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy || !canSubmit}
        onClick={() => void submit()}
        className="btn-primary-action w-full h-12 rounded-2xl font-display text-sm active:scale-[0.97] disabled:opacity-50"
      >
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

const FIELD_STYLE = {
  background: "var(--bg)",
  border: "1px solid var(--border-2)",
  color: "var(--text)"
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
