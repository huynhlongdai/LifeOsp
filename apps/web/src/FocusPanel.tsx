import { useEffect, useMemo, useState } from "react";
import type { FocusStateView } from "@lifeos/domain";
import { ApiRequestError } from "./api";
import { createFocusApiClient } from "./focus-api";

type FocusPanelProps = {
  apiUrl: string;
  recommendationId: string;
  recommendationStatus: "shown" | "accepted" | "edited";
};

type FocusPanelState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "loaded"; data: FocusStateView };

// B4 Focus V0 entry point. Only reads/writes FocusSession state via the
// dedicated Focus API; never touches Action completion or result semantics.
export function FocusPanel({ apiUrl, recommendationId, recommendationStatus }: FocusPanelProps) {
  const focusApi = useMemo(() => createFocusApiClient(apiUrl), [apiUrl]);
  const [state, setState] = useState<FocusPanelState>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [distractionText, setDistractionText] = useState("");
  const [distractionSaved, setDistractionSaved] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setState({ kind: "loading" });
        const data = await focusApi.getFocus(controller.signal);
        setState({ kind: "loaded", data });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ kind: "error", message: focusErrorMessage(error) });
      }
    };

    void load();
    return () => controller.abort();
  }, [focusApi]);

  const startFocus = async () => {
    try {
      setBusy(true);
      setActionError(null);
      const focus = await focusApi.startFocus(recommendationId);
      setState({ kind: "loaded", data: { state: "active", generatedAt: new Date().toISOString(), focus } });
    } catch (error) {
      setActionError(focusErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const endFocus = async (focusSessionId: string, outcome: "completed" | "interrupted" | "abandoned") => {
    try {
      setBusy(true);
      setActionError(null);
      const focus = await focusApi.endFocus(focusSessionId, outcome);
      setState({ kind: "loaded", data: { state: "recent", generatedAt: new Date().toISOString(), focus } });
      setDistractionText("");
      setDistractionSaved(false);
    } catch (error) {
      setActionError(focusErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const captureDistraction = async (focusSessionId: string) => {
    const rawText = distractionText.trim();
    if (!rawText) return;
    try {
      setBusy(true);
      setActionError(null);
      await focusApi.captureDistraction(focusSessionId, rawText);
      setDistractionText("");
      setDistractionSaved(true);
    } catch (error) {
      setActionError(focusErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (state.kind === "loading") {
    return (
      <section className="focus-panel" aria-busy="true" aria-live="polite">
        <p className="focus-panel-loading">Đang kiểm tra trạng thái Focus…</p>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section className="focus-panel focus-panel-error" role="alert">
        <p className="eyebrow">FOCUS KHÔNG SẴN SÀNG</p>
        <p>{state.message}</p>
      </section>
    );
  }

  const view = state.data;

  if (view.state === "active") {
    return (
      <section className="focus-panel focus-panel-active" aria-live="polite">
        <p className="eyebrow">ĐANG FOCUS</p>
        <h3>{view.focus.action.title}</h3>
        {view.focus.action.doneCondition ? (
          <p className="focus-done-condition">
            Khi nào xong: <strong>{view.focus.action.doneCondition}</strong>
          </p>
        ) : null}
        <div className="focus-meta-row">
          {view.focus.plannedMinutes ? <span>≈ {view.focus.plannedMinutes} phút</span> : null}
          <span>Bắt đầu: {formatDateTime(view.focus.startedAt)}</span>
        </div>

        {actionError ? (
          <p className="now-inline-error" role="alert">
            {actionError}
          </p>
        ) : null}

        <div className="focus-distraction-box">
          <label>
            <span>Ghi lại phân tâm (không đổi Action hiện tại)</span>
            <textarea
              value={distractionText}
              maxLength={2000}
              rows={2}
              onChange={(event) => {
                setDistractionText(event.target.value);
                setDistractionSaved(false);
              }}
              placeholder="Vd: Vừa nhớ ra phải trả lời một email…"
            />
          </label>
          <button
            className="secondary-button"
            type="button"
            disabled={busy || distractionText.trim().length === 0}
            onClick={() => void captureDistraction(view.focus.id)}
          >
            Ghi lại phân tâm
          </button>
          {distractionSaved ? (
            <span className="focus-distraction-saved" role="status">
              Đã lưu.
            </span>
          ) : null}
        </div>

        <div className="focus-end-actions">
          <span>Kết thúc Focus:</span>
          <button
            className="primary-button"
            type="button"
            disabled={busy}
            onClick={() => void endFocus(view.focus.id, "completed")}
          >
            Hoàn thành
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={() => void endFocus(view.focus.id, "interrupted")}
          >
            Bị gián đoạn
          </button>
          <button
            className="text-button"
            type="button"
            disabled={busy}
            onClick={() => void endFocus(view.focus.id, "abandoned")}
          >
            Bỏ dở
          </button>
        </div>
      </section>
    );
  }

  if (view.state === "recent") {
    return (
      <section className="focus-panel focus-panel-recent">
        <p className="eyebrow">FOCUS GẦN NHẤT</p>
        <h3>{view.focus.action.title}</h3>
        <div className="focus-meta-row">
          <span>{focusStatusLabel(view.focus.status)}</span>
          <span>Bắt đầu: {formatDateTime(view.focus.startedAt)}</span>
          {view.focus.endedAt ? <span>Kết thúc: {formatDateTime(view.focus.endedAt)}</span> : null}
        </div>
      </section>
    );
  }

  if (recommendationStatus !== "accepted" && recommendationStatus !== "edited") return null;

  return (
    <section className="focus-panel focus-panel-start">
      {actionError ? (
        <p className="now-inline-error" role="alert">
          {actionError}
        </p>
      ) : null}
      <button className="primary-button" type="button" disabled={busy} onClick={() => void startFocus()}>
        {busy ? "Đang bắt đầu…" : "Bắt đầu Focus"}
      </button>
    </section>
  );
}

function focusErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang.";
    if (error.status === 404) return "Không tìm thấy Focus session hoặc Action liên quan.";
    if (error.status === 409) {
      const code = isRecord(error.body) && typeof error.body.error === "string" ? error.body.error : undefined;
      if (code === "active_focus_exists") return "Bạn đang có một Focus session khác đang chạy.";
      if (code === "invalid_status") return "Trạng thái hiện tại không cho phép thao tác này.";
      if (code === "invalid_action") return "Action liên quan không hợp lệ cho Focus này.";
      return "Thao tác bị từ chối do xung đột trạng thái.";
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "Không thể cập nhật Focus";
}

function focusStatusLabel(status: string): string {
  if (status === "completed") return "Đã hoàn thành";
  if (status === "interrupted") return "Bị gián đoạn";
  if (status === "abandoned") return "Đã bỏ dở";
  return "Đang chạy";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
