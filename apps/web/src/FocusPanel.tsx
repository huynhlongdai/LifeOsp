import { useEffect, useMemo, useState } from "react";
import type { FocusStateView } from "@lifeos/domain";
import { ApiRequestError } from "./api";
import { createFocusApiClient } from "./focus-api";

type FocusPanelProps = {
  apiUrl: string;
  recommendationId: string;
  recommendationStatus: "shown" | "accepted" | "edited";
  /** Lets NOW know which FocusSession (if any) is running, so the Result step can end it explicitly. */
  onStateChange?: ((view: FocusStateView) => void) | undefined;
};

type FocusPanelState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "loaded"; data: FocusStateView };

// B4 Focus V0 entry point. Only reads/writes FocusSession state via the
// dedicated Focus API; never touches Action completion or result semantics.
export function FocusPanel({ apiUrl, recommendationId, recommendationStatus, onStateChange }: FocusPanelProps) {
  const focusApi = useMemo(() => createFocusApiClient(apiUrl), [apiUrl]);
  const [state, setState] = useState<FocusPanelState>({ kind: "loading" });

  useEffect(() => {
    if (state.kind === "loaded") onStateChange?.(state.data);
  }, [state, onStateChange]);
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
        <p className="eyebrow">Focus chưa sẵn sàng</p>
        <p>{state.message}</p>
      </section>
    );
  }

  const view = state.data;

  if (view.state === "active") {
    return (
      <section className="focus-active" aria-live="polite">
        <div className="focus-active-top">
          <span>Đang Focus · bắt đầu {formatTime(view.focus.startedAt)}</span>
          {view.focus.plannedMinutes ? <span className="num">{view.focus.plannedMinutes} phút dự kiến</span> : null}
        </div>

        <FocusRing startedAt={view.focus.startedAt} plannedMinutes={view.focus.plannedMinutes ?? null} />

        <h3>{view.focus.action.title}</h3>
        {view.focus.action.doneCondition ? (
          <p className="focus-done-condition">
            Xong khi: <strong>{view.focus.action.doneCondition}</strong>
          </p>
        ) : null}

        {actionError ? (
          <p className="now-inline-error" role="alert">
            {actionError}
          </p>
        ) : null}

        <div className="focus-distraction-box">
          <label>
            <span className="sr-only">Ghi lại phân tâm (không đổi việc hiện tại)</span>
            <textarea
              value={distractionText}
              maxLength={2000}
              rows={1}
              onChange={(event) => {
                setDistractionText(event.target.value);
                setDistractionSaved(false);
              }}
              placeholder="Vừa nghĩ ra gì? Ghi lại rồi quay về…"
            />
          </label>
          {distractionSaved ? (
            <span className="focus-distraction-saved" role="status">
              Đã lưu
            </span>
          ) : null}
          <button
            className="secondary-button"
            type="button"
            disabled={busy || distractionText.trim().length === 0}
            onClick={() => void captureDistraction(view.focus.id)}
          >
            Ghi lại
          </button>
        </div>

        <div className="focus-end-actions">
          <span>Kết thúc Focus không đánh dấu việc là xong.</span>
          <button
            className="primary-button"
            type="button"
            disabled={busy}
            onClick={() => void endFocus(view.focus.id, "completed")}
          >
            Hoàn thành Focus
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
        <p className="eyebrow reflect">Focus gần nhất</p>
        <h3>{view.focus.action.title}</h3>
        <div className="focus-meta-row">
          <span>{focusStatusLabel(view.focus.status)}</span>
          <span>Bắt đầu {formatDateTime(view.focus.startedAt)}</span>
          {view.focus.endedAt ? <span>Kết thúc {formatDateTime(view.focus.endedAt)}</span> : null}
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
      <div className="focus-start-copy">
        <strong>Sẵn sàng khi bạn sẵn sàng.</strong>
        <small>Focus ẩn mọi thứ khác và chỉ giữ việc này trước mặt bạn.</small>
      </div>
      <button className="primary-button" type="button" disabled={busy} onClick={() => void startFocus()}>
        {busy ? "Đang bắt đầu…" : "Bắt đầu Focus"}
      </button>
    </section>
  );
}

const RING_RADIUS = 106;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Quiet elapsed/remaining ring. Optional timer only — never creates pressure. */
function FocusRing({ startedAt, plannedMinutes }: { startedAt: string; plannedMinutes: number | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const startedMs = new Date(startedAt).getTime();
  const elapsedSeconds = Number.isNaN(startedMs) ? 0 : Math.max(0, Math.floor((now - startedMs) / 1000));
  const plannedSeconds = plannedMinutes ? plannedMinutes * 60 : null;
  const remainingSeconds = plannedSeconds === null ? null : Math.max(0, plannedSeconds - elapsedSeconds);
  const progress = plannedSeconds ? Math.min(1, elapsedSeconds / plannedSeconds) : 0;
  const shown = remainingSeconds ?? elapsedSeconds;

  return (
    <div className="focus-ring" role="timer" aria-live="off">
      <svg viewBox="0 0 232 232" aria-hidden="true">
        <circle className="track" cx="116" cy="116" r={RING_RADIUS} />
        <circle
          className="bar"
          cx="116"
          cy="116"
          r={RING_RADIUS}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
        />
      </svg>
      <div className="focus-ring-inner">
        <div className="focus-clock num">
          {pad(Math.floor(shown / 60))}:<span>{pad(shown % 60)}</span>
        </div>
        <div className="focus-clock-sub">{remainingSeconds === null ? "đã trôi qua" : remainingSeconds === 0 ? "hết thời gian dự kiến" : "còn lại"}</div>
      </div>
    </div>
  );
}

function pad(value: number) {
  return value < 10 ? `0${value}` : String(value);
}

function focusErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang.";
    if (error.status === 404) return "Không tìm thấy Focus session hoặc việc liên quan.";
    if (error.status === 409) {
      const code = isRecord(error.body) && typeof error.body.error === "string" ? error.body.error : undefined;
      if (code === "active_focus_exists") return "Bạn đang có một Focus khác đang chạy.";
      if (code === "invalid_status") return "Trạng thái hiện tại không cho phép thao tác này.";
      if (code === "invalid_action") return "Việc liên quan không hợp lệ cho Focus này.";
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

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { timeStyle: "short" }).format(date);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
