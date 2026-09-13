import { useEffect, useMemo, useState } from "react";
import type { DailyCloseView, CloseDayInput, ActionResultView, FocusResultView } from "@lifeos/domain";
import { createApiClient } from "./api";
import { ResultApiClient } from "./api/results";
import { DailyClose } from "./components/DailyClose";

interface ReflectPageProps {
  apiUrl: string;
}

export function ReflectPage({ apiUrl }: ReflectPageProps) {
  const resultApiClient = useMemo(() => new ResultApiClient(apiUrl), [apiUrl]);
  const [todayClose, setTodayClose] = useState<DailyCloseView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDailyCloseForm, setShowDailyCloseForm] = useState(false);

  const today = new Date().toISOString().split("T")[0] || new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  useEffect(() => {
    loadTodayClose();
  }, [apiUrl, resultApiClient]);

  const loadTodayClose = async () => {
    try {
      setLoading(true);
      setError(null);
      const close = await resultApiClient.getDailyClose(today);
      setTodayClose(close);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load daily close");
    } finally {
      setLoading(false);
    }
  };

  const handleDailyCloseSubmit = async (input: CloseDayInput) => {
    try {
      await resultApiClient.recordDailyClose(input);
      setShowDailyCloseForm(false);
      await loadTodayClose();
    } catch (err) {
      console.error("Failed to submit daily close:", err);
      throw err;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="reflect-page">
        <div className="loading-state">Đang tải...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reflect-page">
        <div className="error-state">
          <h3>Lỗi</h3>
          <p>{error}</p>
          <button onClick={loadTodayClose}>Thử lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="reflect-page">
      <div className="page-header">
        <h2>Reflect</h2>
        <p className="page-description">Nhìn lại và đóng ngày của bạn</p>
      </div>

      {!todayClose && !showDailyCloseForm ? (
        <div className="daily-close-prompt">
          <div className="prompt-icon">🌙</div>
          <h3>Chưa đóng ngày hôm nay</h3>
          <p className="prompt-date">{formatDate(today)}</p>
          <p className="prompt-description">
            Dành vài phút để nhìn lại ngày hôm nay. Ghi nhận những gì đã hoàn thành
            và chuẩn bị cho ngày mai.
          </p>
          <button
            className="btn-primary"
            onClick={() => setShowDailyCloseForm(true)}
          >
            Đóng ngày hôm nay
          </button>
        </div>
      ) : todayClose && !showDailyCloseForm ? (
        <div className="daily-close-completed">
          <div className="completed-header">
            <div className="completed-icon">✓</div>
            <div>
              <h3>Đã đóng ngày</h3>
              <p className="completed-date">{formatDate(today)}</p>
            </div>
          </div>

          <div className="daily-close-summary">
            {todayClose.note && (
              <div className="summary-section">
                <h4>Ghi chú</h4>
                <p className="summary-note">{todayClose.note}</p>
              </div>
            )}

            <div className="summary-stats">
              {(todayClose.actionsCompleted > 0 || todayClose.actionsPartial > 0 || 
                todayClose.actionsPostponed > 0 || todayClose.actionsBlocked > 0 || 
                todayClose.actionsDropped > 0) && (
                <div className="stat-group">
                  <h4>Actions</h4>
                  <div className="stats-grid">
                    {todayClose.actionsCompleted > 0 && (
                      <div className="stat-item">
                        <div className="stat-value">{todayClose.actionsCompleted}</div>
                        <div className="stat-label">{getResultLabel("completed")}</div>
                      </div>
                    )}
                    {todayClose.actionsPartial > 0 && (
                      <div className="stat-item">
                        <div className="stat-value">{todayClose.actionsPartial}</div>
                        <div className="stat-label">{getResultLabel("partial")}</div>
                      </div>
                    )}
                    {todayClose.actionsPostponed > 0 && (
                      <div className="stat-item">
                        <div className="stat-value">{todayClose.actionsPostponed}</div>
                        <div className="stat-label">{getResultLabel("postponed")}</div>
                      </div>
                    )}
                    {todayClose.actionsBlocked > 0 && (
                      <div className="stat-item">
                        <div className="stat-value">{todayClose.actionsBlocked}</div>
                        <div className="stat-label">{getResultLabel("blocked")}</div>
                      </div>
                    )}
                    {todayClose.actionsDropped > 0 && (
                      <div className="stat-item">
                        <div className="stat-value">{todayClose.actionsDropped}</div>
                        <div className="stat-label">{getResultLabel("dropped")}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(todayClose.focusSessionsCompleted > 0 || todayClose.focusSessionsInterrupted > 0 || 
                todayClose.focusSessionsAbandoned > 0) && (
                <div className="stat-group">
                  <h4>Focus Sessions</h4>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <div className="stat-value">
                        {todayClose.focusSessionsCompleted + todayClose.focusSessionsInterrupted + todayClose.focusSessionsAbandoned}
                      </div>
                      <div className="stat-label">Sessions</div>
                    </div>
                    {todayClose.totalFocusMinutes > 0 && (
                      <div className="stat-item">
                        <div className="stat-value">{todayClose.totalFocusMinutes}</div>
                        <div className="stat-label">Phút</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="completed-footer">
            <p className="completion-time">
              Đóng lúc {new Date(todayClose.createdAt).toLocaleTimeString("vi-VN")}
            </p>
            <button
              className="btn-secondary"
              onClick={() => setShowDailyCloseForm(true)}
            >
              Chỉnh sửa ghi chú
            </button>
          </div>
        </div>
      ) : null}

      {showDailyCloseForm && (
        <div className="daily-close-form-container">
          <DailyClose
            date={today}
            dailySummary={todayClose}
            onSubmit={handleDailyCloseSubmit}
            onCancel={() => setShowDailyCloseForm(false)}
          />
        </div>
      )}

      <div className="reflect-tips">
        <h3>Mẹo Reflect</h3>
        <ul className="tips-list">
          <li>
            <strong>Đóng ngày đều đặn:</strong> Giúp bạn nhận ra tiến bộ và chuẩn bị
            tốt hơn cho ngày mai
          </li>
          <li>
            <strong>Ghi chú ngắn gọn:</strong> Không cần viết dài, vài câu là đủ
          </li>
          <li>
            <strong>Nhìn lại tuần:</strong> Cuối tuần, xem lại các daily closes để
            nhận ra patterns
          </li>
        </ul>
      </div>

      <style>{`
        .reflect-page {
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h2 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .page-description {
          margin: 0;
          font-size: 1rem;
          color: var(--text-secondary);
        }

        .loading-state,
        .error-state {
          text-align: center;
          padding: 3rem;
        }

        .error-state h3 {
          color: #ef4444;
          margin-bottom: 1rem;
        }

        .error-state button {
          margin-top: 1rem;
          padding: 0.75rem 1.5rem;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
        }

        .daily-close-prompt {
          text-align: center;
          padding: 3rem 2rem;
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
        }

        .prompt-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .daily-close-prompt h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .prompt-date {
          margin: 0 0 1rem 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .prompt-description {
          margin: 0 0 2rem 0;
          font-size: 1rem;
          color: var(--text-secondary);
          line-height: 1.6;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        .btn-primary {
          padding: 0.875rem 2rem;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .daily-close-completed {
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 2rem;
        }

        .completed-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .completed-icon {
          width: 48px;
          height: 48px;
          background: var(--success);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: bold;
        }

        .completed-header h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .completed-date {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .daily-close-summary {
          margin-bottom: 2rem;
        }

        .summary-section {
          margin-bottom: 1.5rem;
        }

        .summary-section h4 {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .summary-note {
          margin: 0;
          padding: 1rem;
          background: var(--surface-2);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          color: var(--text-primary);
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .summary-stats {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .stat-group h4 {
          margin: 0 0 0.75rem 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1rem;
        }

        .stat-item {
          text-align: center;
          padding: 1rem;
          background: var(--surface-2);
          border-radius: var(--radius-md);
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--accent);
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .completed-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border);
        }

        .completion-time {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-tertiary);
        }

        .btn-secondary {
          padding: 0.75rem 1.5rem;
          background: var(--surface-2);
          color: var(--text-primary);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: var(--surface-3);
        }

        .daily-close-form-container {
          margin-bottom: 2rem;
        }

        .reflect-tips {
          margin-top: 3rem;
          padding: 1.5rem;
          background: var(--surface-2);
          border-radius: var(--radius-lg);
        }

        .reflect-tips h3 {
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .tips-list {
          margin: 0;
          padding-left: 1.5rem;
        }

        .tips-list li {
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .tips-list li:last-child {
          margin-bottom: 0;
        }

        .tips-list strong {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}

function getResultLabel(type: string): string {
  const labels: Record<string, string> = {
    completed: "Hoàn thành",
    partial: "Một phần",
    postponed: "Trì hoãn",
    blocked: "Bị chặn",
    dropped: "Bỏ"
  };
  return labels[type] || type;
}
