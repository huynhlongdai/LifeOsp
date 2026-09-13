import { useState } from "react";
import type { RecordActionResultInput, ActionResultType } from "@lifeos/domain";

interface ActionResultSelectorProps {
  actionId: string;
  onSubmit: (result: RecordActionResultInput) => Promise<void>;
  onCancel?: () => void;
}

const RESULT_OPTIONS: { value: ActionResultType; label: string; description: string; color: string }[] = [
  {
    value: "completed",
    label: "Hoàn thành",
    description: "Đã hoàn thành theo kế hoạch",
    color: "#10b981"
  },
  {
    value: "partial",
    label: "Một phần",
    description: "Hoàn thành một phần, còn lại sẽ làm sau",
    color: "#f59e0b"
  },
  {
    value: "postponed",
    label: "Trì hoãn",
    description: "Chưa làm, sẽ làm vào thời điểm khác",
    color: "#6366f1"
  },
  {
    value: "blocked",
    label: "Bị chặn",
    description: "Không thể hoàn thành do yếu tố bên ngoài",
    color: "#ef4444"
  },
  {
    value: "dropped",
    label: "Bỏ",
    description: "Quyết định không làm nữa",
    color: "#6b7280"
  }
];

export function ActionResultSelector({ actionId, onSubmit, onCancel }: ActionResultSelectorProps) {
  const [selectedType, setSelectedType] = useState<ActionResultType | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType) return;

    setIsSubmitting(true);
    try {
      const input: RecordActionResultInput = { resultType: selectedType };
      const trimmedNote = note.trim();
      if (trimmedNote) {
        input.note = trimmedNote;
      }
      await onSubmit(input);
    } catch (error) {
      console.error("Failed to submit result:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="action-result-selector">
      <h3>Kết quả thực hiện</h3>
      
      <div className="result-options">
        {RESULT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`result-option ${selectedType === option.value ? "selected" : ""}`}
            onClick={() => setSelectedType(option.value)}
            disabled={isSubmitting}
            style={{
              borderColor: selectedType === option.value ? option.color : undefined
            }}
          >
            <div className="result-option-header">
              <span
                className="result-option-indicator"
                style={{ backgroundColor: option.color }}
              />
              <span className="result-option-label">{option.label}</span>
            </div>
            <p className="result-option-description">{option.description}</p>
          </button>
        ))}
      </div>

      {selectedType && (
        <div className="result-note-section">
          <label htmlFor="result-note">
            Ghi chú (tùy chọn)
          </label>
          <textarea
            id="result-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Thêm ghi chú về kết quả..."
            maxLength={2000}
            disabled={isSubmitting}
          />
        </div>
      )}

      <div className="result-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Hủy
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!selectedType || isSubmitting}
        >
          {isSubmitting ? "Đang lưu..." : "Lưu kết quả"}
        </button>
      </div>

      <style>{`
        .action-result-selector {
          padding: 1.5rem;
          background: var(--surface-1);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
        }

        .action-result-selector h3 {
          margin: 0 0 1rem 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .result-options {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .result-option {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
          background: var(--surface-2);
          border: 2px solid var(--border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          font-family: inherit;
        }

        .result-option:hover:not(:disabled) {
          background: var(--surface-3);
        }

        .result-option.selected {
          background: var(--surface-2);
        }

        .result-option:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .result-option-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .result-option-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .result-option-label {
          font-weight: 600;
          color: var(--text-primary);
        }

        .result-option-description {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .result-note-section {
          margin-bottom: 1.5rem;
        }

        .result-note-section label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .result-note-section textarea {
          width: 100%;
          min-height: 80px;
          padding: 0.75rem;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          font-family: inherit;
          font-size: 0.875rem;
          color: var(--text-primary);
          resize: vertical;
        }

        .result-note-section textarea:focus {
          outline: none;
          border-color: var(--accent);
        }

        .result-note-section textarea:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .result-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .btn-secondary,
        .btn-primary {
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-family: inherit;
        }

        .btn-secondary {
          background: var(--surface-2);
          color: var(--text-primary);
          border: 1px solid var(--border);
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--surface-3);
        }

        .btn-primary {
          background: var(--accent);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--accent-hover);
        }

        .btn-secondary:disabled,
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
