import { useState } from "react";
import type { CloseDayInput, DailyCloseView } from "@lifeos/domain";

interface DailyCloseProps {
  date: string;
  dailySummary?: DailyCloseView | null;
  onSubmit: (input: CloseDayInput) => Promise<void>;
  onCancel?: () => void;
}

export function DailyClose({ date, dailySummary, onSubmit, onCancel }: DailyCloseProps) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const input: CloseDayInput = { date };
      const trimmedNote = note.trim();
      if (trimmedNote) {
        input.note = trimmedNote;
      }
      await onSubmit(input);
    } catch (error) {
      console.error("Failed to submit daily close:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="daily-close">
      <h2>Đóng ngày</h2>
      <p className="daily-close-date">{formatDate(date)}</p>

      {dailySummary && (
        <div className="daily-summary">
          <h3>Tóm tắt hôm nay</h3>
          
          {(dailySummary.actionsCompleted > 0 || dailySummary.actionsPartial > 0 || 
            dailySummary.actionsPostponed > 0 || dailySummary.actionsBlocked > 0 || 
            dailySummary.actionsDropped > 0) && (
            <div className="summary-section">
              <h4>Actions</h4>
              <div className="summary-stats">
                {dailySummary.actionsCompleted > 0 && (
                  <div className="stat-item stat-completed">
                    <span className="stat-value">{dailySummary.actionsCompleted}</span>
                    <span className="stat-label">Hoàn thành</span>
                  </div>
                )}
                {dailySummary.actionsPartial > 0 && (
                  <div className="stat-item stat-partial">
                    <span className="stat-value">{dailySummary.actionsPartial}</span>
                    <span className="stat-label">Một phần</span>
                  </div>
                )}
                {dailySummary.actionsPostponed > 0 && (
                  <div className="stat-item stat-postponed">
                    <span className="stat-value">{dailySummary.actionsPostponed}</span>
                    <span className="stat-label">Trì hoãn</span>
                  </div>
                )}
                {dailySummary.actionsBlocked > 0 && (
                  <div className="stat-item stat-blocked">
                    <span className="stat-value">{dailySummary.actionsBlocked}</span>
                    <span className="stat-label">Bị chặn</span>
                  </div>
                )}
                {dailySummary.actionsDropped > 0 && (
                  <div className="stat-item stat-dropped">
                    <span className="stat-value">{dailySummary.actionsDropped}</span>
                    <span className="stat-label">Bỏ</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {(dailySummary.focusSessionsCompleted > 0 || dailySummary.focusSessionsInterrupted > 0 || 
            dailySummary.focusSessionsAbandoned > 0) && (
            <div className="summary-section">
              <h4>Focus Sessions</h4>
              <div className="summary-stats">
                {dailySummary.focusSessionsCompleted > 0 && (
                  <div className="stat-item stat-completed">
                    <span className="stat-value">{dailySummary.focusSessionsCompleted}</span>
                    <span className="stat-label">Hoàn thành</span>
                  </div>
                )}
                {dailySummary.focusSessionsInterrupted > 0 && (
                  <div className="stat-item stat-interrupted">
                    <span className="stat-value">{dailySummary.focusSessionsInterrupted}</span>
                    <span className="stat-label">Gián đoạn</span>
                  </div>
                )}
                {dailySummary.focusSessionsAbandoned > 0 && (
                  <div className="stat-item stat-abandoned">
                    <span className="stat-value">{dailySummary.focusSessionsAbandoned}</span>
                    <span className="stat-label">Bỏ dở</span>
                  </div>
                )}
                {dailySummary.totalFocusMinutes > 0 && (
                  <div className="stat-item stat-minutes">
                    <span className="stat-value">{dailySummary.totalFocusMinutes}</span>
                    <span className="stat-label">Phút focus</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {dailySummary.actionsCompleted === 0 && dailySummary.actionsPartial === 0 && 
           dailySummary.actionsPostponed === 0 && dailySummary.actionsBlocked === 0 && 
           dailySummary.actionsDropped === 0 && dailySummary.focusSessionsCompleted === 0 && 
           dailySummary.focusSessionsInterrupted === 0 && dailySummary.focusSessionsAbandoned === 0 && (
            <p className="empty-day-message">
              Hôm nay chưa có activity nào được ghi nhận.
            </p>
          )}
        </div>
      )}

      <div className="daily-close-form">
        <label htmlFor="daily-close-note">
          Ghi chú cuối ngày (tùy chọn)
        </label>
        <textarea
          id="daily-close-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Hôm nay thế nào? Có gì đáng chú ý?"
          maxLength={2000}
          disabled={isSubmitting}
        />
      </div>

      <div className="daily-close-actions">
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
          disabled={isSubmitting}
        >
          {isSubmitting ? "Đang lưu..." : "Đóng ngày"}
        </button>
      </div>

      <style>{`
        .daily-close {
          padding: 2rem;
          background: var(--surface-1);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          max-width: 600px;
          margin: 0 auto;
        }

        .daily-close h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.75rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .daily-close-date {
          margin: 0 0 2rem 0;
          font-size: 1rem;
          color: var(--text-secondary);
        }

        .daily-summary {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: var(--surface-2);
          border-radius: var(--radius-md);
        }

        .daily-summary h3 {
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .summary-section {
          margin-bottom: 1.5rem;
        }

        .summary-section:last-child {
          margin-bottom: 0;
        }

        .summary-section h4 {
          margin: 0 0 0.75rem 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 0.75rem;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1rem;
          background: var(--surface-1);
          border-radius: var(--radius-sm);
          border-left: 4px solid transparent;
        }

        .stat-completed {
          border-left-color: #10b981;
        }

        .stat-partial {
          border-left-color: #f59e0b;
        }

        .stat-postponed {
          border-left-color: #6366f1;
        }

        .stat-blocked {
          border-left-color: #ef4444;
        }

        .stat-dropped {
          border-left-color: #6b7280;
        }

        .stat-interrupted {
          border-left-color: #f59e0b;
        }

        .stat-abandoned {
          border-left-color: #6b7280;
        }

        .stat-minutes {
          border-left-color: #3b82f6;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-align: center;
        }

        .empty-day-message {
          margin: 0;
          padding: 1rem;
          text-align: center;
          color: var(--text-secondary);
          font-style: italic;
        }

        .daily-close-form {
          margin-bottom: 1.5rem;
        }

        .daily-close-form label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .daily-close-form textarea {
          width: 100%;
          min-height: 100px;
          padding: 0.75rem;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          font-family: inherit;
          font-size: 0.875rem;
          color: var(--text-primary);
          resize: vertical;
        }

        .daily-close-form textarea:focus {
          outline: none;
          border-color: var(--accent);
        }

        .daily-close-form textarea:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .daily-close-actions {
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
