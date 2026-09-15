import { useMemo, useState } from "react";
import { defaultFocusOutcomeForResult, type ActionResult, type ActionResultView, type FocusEndOutcome, type FocusSessionView, type RecordActionResultInput } from "@lifeos/domain";
import { ApiRequestError } from "./api";
import { createResultApiClient } from "./result-api";

type ResultPanelProps = {
  apiUrl: string;
  actionId: string;
  actionTitle: string;
  /** The FocusSession currently running on this Action, if any. Ending it is the user's explicit choice. */
  activeFocus: FocusSessionView | null;
  onRecorded: (view: ActionResultView) => void;
};

// B5 Result selector. Five outcomes, each with its own consequence copy.
// No result is framed as failure; dropping is a legitimate decision.
const OPTIONS: Array<{ result: ActionResult; label: string; consequence: string }> = [
  { result: "completed", label: "Xong", consequence: "Việc được ghi là xong. Lần mở tới, NOW sẽ tìm việc tiếp theo." },
  { result: "partial", label: "Tiến được một phần", consequence: "Phần đã làm được giữ lại. Bạn quyết định bước tiếp theo khi sẵn sàng." },
  { result: "postponed", label: "Để lúc khác", consequence: "Không có nợ quá hạn. Việc chỉ rời khỏi NOW cho tới khi bạn quay lại nó." },
  { result: "blocked", label: "Đang bị chặn", consequence: "Việc được đánh dấu chờ. Gỡ chặn sẽ là một bước riêng, không phải lỗi của bạn." },
  { result: "dropped", label: "Bỏ việc này", consequence: "Bỏ việc này có thể là một quyết định hợp lý nếu nó không còn đáng bảo vệ." }
];

const FOCUS_OUTCOMES: Array<{ value: FocusEndOutcome; label: string }> = [
  { value: "completed", label: "Focus hoàn thành" },
  { value: "interrupted", label: "Focus bị gián đoạn" },
  { value: "abandoned", label: "Focus bỏ dở" }
];

export function ResultPanel({ apiUrl, actionId, actionTitle, activeFocus, onRecorded }: ResultPanelProps) {
  const api = useMemo(() => createResultApiClient(apiUrl), [apiUrl]);
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<ActionResult | null>(null);
  const [note, setNote] = useState("");
  const [remainingText, setRemainingText] = useState("");
  const [blockedReason, setBlockedReason] = useState("");
  const [postponeUntil, setPostponeUntil] = useState("");
  const [focusOutcome, setFocusOutcome] = useState<FocusEndOutcome>("completed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = OPTIONS.find((option) => option.result === choice) ?? null;
  const canSubmit = selected !== null && (selected.result !== "blocked" || blockedReason.trim().length > 0);

  const pick = (result: ActionResult) => {
    setChoice(result);
    setError(null);
    setFocusOutcome(defaultFocusOutcomeForResult(result));
  };

  const submit = async () => {
    if (!selected) return;
    const input: RecordActionResultInput = {
      result: selected.result,
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(selected.result === "partial" && remainingText.trim() ? { remainingText: remainingText.trim() } : {}),
      ...(selected.result === "blocked" ? { blockedReason: blockedReason.trim() } : {}),
      ...(selected.result === "postponed" && postponeUntil ? { postponeUntil } : {}),
      ...(activeFocus ? { focusOutcome } : {})
    };
    try {
      setBusy(true);
      setError(null);
      const view = await api.recordResult(actionId, input);
      onRecorded(view);
    } catch (reason) {
      setError(resultErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <section className="result-panel result-panel-closed">
        <div>
          <strong>Việc này thế nào?</strong>
          <small>Ghi lại kết quả thật — không có kết quả nào là sai.</small>
        </div>
        <button className="secondary-button" type="button" onClick={() => setOpen(true)}>
          Ghi kết quả
        </button>
      </section>
    );
  }

  return (
    <section className="result-panel" aria-labelledby="result-panel-title">
      <div className="result-panel-head">
        <div>
          <p className="eyebrow">Kết quả</p>
          <h3 id="result-panel-title">{actionTitle}</h3>
        </div>
        <button className="text-button" type="button" disabled={busy} onClick={() => setOpen(false)}>
          Đóng
        </button>
      </div>

      <div className="result-options" role="radiogroup" aria-label="Kết quả của việc">
        {OPTIONS.map((option) => (
          <button
            key={option.result}
            type="button"
            role="radio"
            aria-checked={choice === option.result}
            className={choice === option.result ? `result-option selected ${option.result}` : "result-option"}
            disabled={busy}
            onClick={() => pick(option.result)}
          >
            <strong>{option.label}</strong>
            {choice === option.result ? <span>{option.consequence}</span> : null}
          </button>
        ))}
      </div>

      {selected ? (
        <div className="result-fields">
          {selected.result === "blocked" ? (
            <label>
              <span>Điều gì đang chặn?</span>
              <input
                value={blockedReason}
                maxLength={1000}
                placeholder="Vd: chờ tài khoản gửi mail"
                onChange={(event) => setBlockedReason(event.target.value)}
              />
            </label>
          ) : null}
          {selected.result === "partial" ? (
            <label>
              <span>Còn lại gì? (tuỳ chọn)</span>
              <input value={remainingText} maxLength={1000} onChange={(event) => setRemainingText(event.target.value)} />
            </label>
          ) : null}
          {selected.result === "postponed" ? (
            <label>
              <span>Quay lại vào (tuỳ chọn)</span>
              <input type="date" value={postponeUntil} onChange={(event) => setPostponeUntil(event.target.value)} />
            </label>
          ) : null}
          <label>
            <span>{noteLabel(selected.result)}</span>
            <textarea value={note} maxLength={1000} rows={2} onChange={(event) => setNote(event.target.value)} />
          </label>

          {activeFocus ? (
            <fieldset className="result-focus-choice">
              <legend>Focus đang chạy sẽ kết thúc cùng lúc</legend>
              {FOCUS_OUTCOMES.map((option) => (
                <label key={option.value} className="result-focus-option">
                  <input
                    type="radio"
                    name="focus-outcome"
                    value={option.value}
                    checked={focusOutcome === option.value}
                    onChange={() => setFocusOutcome(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>
          ) : null}

          {error ? <p className="now-inline-error" role="alert">{error}</p> : null}

          <div className="result-actions">
            <button className="primary-button" type="button" disabled={busy || !canSubmit} onClick={() => void submit()}>
              {busy ? "Đang ghi…" : `Ghi: ${selected.label}`}
            </button>
            <button className="text-button" type="button" disabled={busy} onClick={() => setChoice(null)}>
              Chọn lại
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function resultLabel(result: ActionResult): string {
  return OPTIONS.find((option) => option.result === result)?.label ?? result;
}

function noteLabel(result: ActionResult): string {
  if (result === "completed") return "Ghi chú (tuỳ chọn)";
  if (result === "partial") return "Điều gì đã dịch chuyển? (tuỳ chọn)";
  if (result === "postponed") return "Vì sao để lúc khác? (tuỳ chọn)";
  if (result === "blocked") return "Ghi chú thêm (tuỳ chọn)";
  return "Vì sao bỏ? (tuỳ chọn)";
}

function resultErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang.";
    if (error.status === 404) return "Không tìm thấy việc này nữa.";
    if (error.status === 409) {
      const code = isRecord(error.body) && typeof error.body.error === "string" ? error.body.error : undefined;
      if (code === "active_focus_exists") return "Focus đang chạy cho việc này — hãy chọn cách kết thúc Focus bên trên.";
      if (code === "invalid_status") return "Việc này đã có kết quả rồi.";
      if (code === "focus_not_active") return "Focus đã kết thúc trước đó. Thử ghi lại kết quả.";
      return "Thao tác bị từ chối do xung đột trạng thái.";
    }
    if (error.status === 400) return "Thiếu thông tin: với việc bị chặn cần nói rõ điều gì đang chặn.";
    return error.message;
  }
  return error instanceof Error ? error.message : "Không thể ghi kết quả";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
