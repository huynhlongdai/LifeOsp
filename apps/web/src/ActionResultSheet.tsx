import { useState } from "react";
import { ACTION_RESULT_OUTCOMES, type ActionResultOutcome, type ActionView } from "@lifeos/domain";
import { createResultApiClient } from "./result-api";
import { resultErrorMessage } from "./ResultPanel";

const OUTCOME_LABELS: Record<ActionResultOutcome, string> = {
  completed: "Xong",
  partial: "Làm một phần",
  postponed: "Hoãn lại",
  blocked: "Bị chặn",
  dropped: "Bỏ"
};

/**
 * Recording a result is a user statement, never an automatic state flip: the board only
 * opens this sheet and sends exactly what the user picked to POST /v1/actions/:id/result.
 */
export function ActionResultSheet({
  action,
  apiUrl,
  onClose,
  onRecorded
}: {
  action: ActionView;
  apiUrl: string;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const [outcome, setOutcome] = useState<ActionResultOutcome>("completed");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasonRequired = outcome === "blocked";

  async function save() {
    if (busy) return;
    if (reasonRequired && reason.trim().length === 0) {
      setError("Kết quả “Bị chặn” cần một lý do cụ thể.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createResultApiClient(apiUrl).recordActionResult(action.id, {
        outcome,
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(reasonRequired ? { reason: reason.trim() } : {})
      });
      onRecorded();
      onClose();
    } catch (reasonValue: unknown) {
      setError(resultErrorMessage(reasonValue));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(15, 23, 32, 0.45)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Ghi kết quả Action"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-5"
        style={{ background: "var(--card)", boxShadow: "var(--shadow-lg)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-[10px] font-extrabold tracking-widest" style={{ color: "var(--text-3)" }}>GHI KẾT QUẢ</p>
        <h2 className="text-base font-bold mt-1 mb-1" style={{ color: "var(--text)" }}>{action.title}</h2>
        {action.doneCondition ? (
          <p className="text-xs mb-3" style={{ color: "var(--text-3)" }}>Điều kiện xong: {action.doneCondition}</p>
        ) : null}

        <div className="flex flex-wrap gap-2 my-3">
          {ACTION_RESULT_OUTCOMES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={outcome === value}
              onClick={() => setOutcome(value)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: outcome === value ? "var(--primary)" : "var(--bg-2)",
                color: outcome === value ? "#fff" : "var(--text-2)"
              }}
            >
              {OUTCOME_LABELS[value]}
            </button>
          ))}
        </div>

        {reasonRequired ? (
          <label className="block mb-2">
            <span className="text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>Điều gì đang chặn?</span>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl text-sm"
              style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </label>
        ) : null}

        <label className="block">
          <span className="text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>Ghi chú (tuỳ chọn)</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="w-full mt-1 px-3 py-2 rounded-xl text-sm"
            style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)", resize: "none" }}
          />
        </label>

        {error ? (
          <p className="text-xs mt-2" role="alert" style={{ color: "var(--red)" }}>{error}</p>
        ) : null}

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-2xl text-sm font-semibold"
            style={{ background: "var(--bg-2)", color: "var(--text-2)" }}
          >
            Huỷ
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="flex-1 h-11 rounded-2xl text-sm font-bold disabled:opacity-50"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            {busy ? "Đang ghi…" : "Lưu kết quả"}
          </button>
        </div>
        <p className="text-[10px] mt-3" style={{ color: "var(--text-3)" }}>
          LifeOS chỉ lưu đúng điều bạn chọn. Không có kết quả nào được suy đoán thay bạn.
        </p>
      </div>
    </div>
  );
}
