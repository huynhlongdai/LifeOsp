import { useEffect, useMemo, useState } from "react";
import type { ActionView, RecordActionResultInput, ActionResultView } from "@lifeos/domain";
import { createApiClient } from "./api";
import { ResultApiClient } from "./api/results";
import { ActionResultSelector } from "./components/ActionResultSelector";

interface ExecutePageProps {
  apiUrl: string;
}

export function ExecutePage({ apiUrl }: ExecutePageProps) {
  const resultApiClient = useMemo(() => new ResultApiClient(apiUrl), [apiUrl]);
  const [actions, setActions] = useState<ActionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionView | null>(null);
  const [actionResults, setActionResults] = useState<Map<string, ActionResultView[]>>(new Map());

  useEffect(() => {
    loadActions();
  }, [apiUrl, resultApiClient]);

  const loadActions = async () => {
    try {
      setLoading(true);
      setError(null);
      const api = createApiClient(apiUrl);
      const allActions = await api.getActions();
      // Filter actions that are in progress or ready
      const activeActions = allActions.filter(
        (a: ActionView) => a.status === "ready" || a.status === "active" || a.status === "completed"
      );
      setActions(activeActions);

      // Load results for each action
      const resultsMap = new Map<string, ActionResultView[]>();
      for (const action of activeActions) {
        try {
          const results = await resultApiClient.getActionResults(action.id);
          resultsMap.set(action.id, results);
        } catch (err) {
          // Action might not have results yet
          resultsMap.set(action.id, []);
        }
      }
      setActionResults(resultsMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load actions");
    } finally {
      setLoading(false);
    }
  };

  const handleResultSubmit = async (result: RecordActionResultInput) => {
    try {
      if (!selectedAction) return;
      await resultApiClient.recordActionResult(selectedAction.id, result);
      setSelectedAction(null);
      await loadActions(); // Reload to show updated results
    } catch (err) {
      throw err;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
      ready: { label: "Sẵn sàng", color: "#3b82f6", bg: "#dbeafe" },
      in_progress: { label: "Đang làm", color: "#f59e0b", bg: "#fef3c7" },
      completed: { label: "Hoàn thành", color: "#10b981", bg: "#d1fae5" },
      blocked: { label: "Bị chặn", color: "#ef4444", bg: "#fee2e2" },
      postponed: { label: "Trì hoãn", color: "#6366f1", bg: "#e0e7ff" },
      dropped: { label: "Bỏ", color: "#6b7280", bg: "#f3f4f6" }
    };

    const config = statusConfig[status] || { label: status, color: "#6b7280", bg: "#f3f4f6" };

    return (
      <span
        className="status-badge"
        style={{ color: config.color, backgroundColor: config.bg }}
      >
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="execute-page">
        <div className="loading-state">Đang tải actions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="execute-page">
        <div className="error-state">
          <h3>Lỗi</h3>
          <p>{error}</p>
          <button onClick={loadActions}>Thử lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="execute-page">
      <div className="page-header">
        <h2>Execute</h2>
        <p className="page-description">Quản lý và ghi nhận kết quả các actions của bạn</p>
      </div>

      {actions.length === 0 ? (
        <div className="empty-state">
          <p>Chưa có action nào. Hãy bắt đầu từ NOW để tạo action đầu tiên!</p>
        </div>
      ) : (
        <div className="actions-list">
          {actions.map((action) => {
            const results = actionResults.get(action.id) || [];
            const hasResults = results.length > 0;

            return (
              <div key={action.id} className="action-card">
                <div className="action-header">
                  <div className="action-info">
                    <h3 className="action-title">{action.title}</h3>
                    {action.doneCondition && (
                      <p className="action-description">{action.doneCondition}</p>
                    )}
                  </div>
                  <div className="action-meta">
                    {getStatusBadge(action.status)}
                    {action.estimatedMinutes && (
                      <span className="action-time">
                        ~{action.estimatedMinutes} phút
                      </span>
                    )}
                  </div>
                </div>

                {hasResults && (
                  <div className="action-results-summary">
                    <h4>Kết quả gần nhất</h4>
                    <div className="results-list">
                      {results.slice(0, 3).map((result) => (
                        <div key={result.id} className="result-item">
                          <span className="result-type">{result.resultType}</span>
                          <span className="result-date">
                            {new Date(result.createdAt).toLocaleDateString("vi-VN")}
                          </span>
                          {result.note && (
                            <p className="result-note">{result.note}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="action-actions">
                  <button
                    className="btn-primary"
                    onClick={() => setSelectedAction(action)}
                  >
                    {hasResults ? "Ghi nhận kết quả mới" : "Ghi nhận kết quả"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedAction && (
        <div className="modal-overlay" onClick={() => setSelectedAction(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ghi nhận kết quả</h3>
              <p className="modal-action-title">{selectedAction.title}</p>
            </div>
            <ActionResultSelector
              actionId={selectedAction.id}
              onSubmit={handleResultSubmit}
              onCancel={() => setSelectedAction(null)}
            />
          </div>
        </div>
      )}

      <style>{`
        .execute-page {
          padding: 2rem;
          max-width: 1000px;
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
        .empty-state {
          text-align: center;
          padding: 3rem;
          color: var(--text-secondary);
        }

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

        .actions-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .action-card {
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          transition: all 0.2s;
        }

        .action-card:hover {
          border-color: var(--accent);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .action-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .action-info {
          flex: 1;
        }

        .action-title {
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .action-description {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .action-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .action-time {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .action-results-summary {
          margin: 1rem 0;
          padding: 1rem;
          background: var(--surface-2);
          border-radius: var(--radius-md);
        }

        .action-results-summary h4 {
          margin: 0 0 0.75rem 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .result-item {
          padding: 0.75rem;
          background: var(--surface-1);
          border-radius: var(--radius-sm);
          border-left: 3px solid var(--accent);
        }

        .result-type {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: var(--accent-light);
          color: var(--accent);
          border-radius: var(--radius-xs);
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
          margin-right: 0.5rem;
        }

        .result-date {
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }

        .result-note {
          margin: 0.5rem 0 0 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .action-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        .btn-primary {
          padding: 0.75rem 1.5rem;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
        }

        .modal-content {
          background: var(--surface-0);
          border-radius: var(--radius-lg);
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          padding: 1.5rem 1.5rem 0 1.5rem;
        }

        .modal-header h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .modal-action-title {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
