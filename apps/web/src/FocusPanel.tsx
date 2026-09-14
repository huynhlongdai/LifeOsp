import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { FocusStateView } from "@lifeos/domain";
import { ApiRequestError } from "./api";
import { createFocusApiClient } from "./focus-api";
import { SessionChecklist } from "./SessionChecklist";

type FocusPanelProps = {
  apiUrl: string;
  recommendationId: string;
  recommendationStatus: "shown" | "accepted" | "edited";
  /** Lets NOW commit the running FocusSession together with the B5 Action result. */
  onActiveFocusChange?: (focusSessionId: string | null) => void;
};

type FocusPanelState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "loaded"; data: FocusStateView };

// B4 Focus V0 entry point. Only reads/writes FocusSession state via the
// dedicated Focus API; never touches Action completion or result semantics.
export function FocusPanel({ apiUrl, recommendationId, recommendationStatus, onActiveFocusChange }: FocusPanelProps) {
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
        onActiveFocusChange?.(data.state === "active" ? data.focus.id : null);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ kind: "error", message: focusErrorMessage(error) });
      }
    };

    void load();
    return () => controller.abort();
  }, [focusApi, onActiveFocusChange]);

  const startFocus = async () => {
    try {
      setBusy(true);
      setActionError(null);
      const focus = await focusApi.startFocus(recommendationId);
      setState({ kind: "loaded", data: { state: "active", generatedAt: new Date().toISOString(), focus } });
      onActiveFocusChange?.(focus.id);
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
      onActiveFocusChange?.(null);
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
      <section className="rounded-2xl p-4 mb-4" aria-busy="true" aria-live="polite" style={CARD}>
        <p className="text-sm" style={{ color: "var(--text-3)" }}>Đang kiểm tra trạng thái Focus…</p>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section className="rounded-2xl p-4 mb-4" role="alert" style={{ background: "var(--red-bg)", border: "1px solid var(--border)" }}>
        <p className="text-[10px] font-extrabold tracking-widest mb-1" style={{ color: "var(--red)" }}>FOCUS KHÔNG SẴN SÀNG</p>
        <p className="text-sm" style={{ color: "var(--text-2)" }}>{state.message}</p>
      </section>
    );
  }

  const view = state.data;

  if (view.state === "active") {
    return (
      <FocusOverlay
        apiUrl={apiUrl}
        focus={view.focus}
        busy={busy}
        actionError={actionError}
        distractionText={distractionText}
        distractionSaved={distractionSaved}
        onDistractionChange={(value) => {
          setDistractionText(value);
          setDistractionSaved(false);
        }}
        onCaptureDistraction={() => void captureDistraction(view.focus.id)}
        onEnd={(outcome) => void endFocus(view.focus.id, outcome)}
      />
    );
  }

  if (view.state === "recent") {
    return (
      <section className="rounded-2xl p-4 mb-4" style={CARD}>
        <p className="text-[10px] font-extrabold tracking-widest mb-1.5" style={{ color: "var(--text-3)" }}>FOCUS GẦN NHẤT</p>
        <p className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>{view.focus.action.title}</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: "var(--bg)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
            {focusStatusLabel(view.focus.status)}
          </span>
          <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: "var(--bg)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
            {formatDateTime(view.focus.startedAt)}
          </span>
        </div>
      </section>
    );
  }

  if (recommendationStatus !== "accepted" && recommendationStatus !== "edited") return null;

  return (
    <section className="mb-4">
      {actionError ? (
        <p className="text-xs px-3.5 py-3 rounded-2xl mb-2" role="alert" style={{ color: "var(--red)", background: "var(--red-bg)", border: "1px solid var(--border)" }}>
          {actionError}
        </p>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void startFocus()}
        className="btn-primary-action w-full h-14 rounded-2xl flex items-center justify-between px-5 active:scale-[0.97]"
      >
        <span className="text-[15px] font-display">{busy ? "Đang bắt đầu…" : "Bắt đầu Focus Session"}</span>
        <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="var(--accent-fg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
    </section>
  );
}

const CARD = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-card)"
} as const;

type ActiveFocus = Extract<FocusStateView, { state: "active" }>["focus"];

/**
 * Full-screen Focus session, ported from the prototype FocusScreen. The ring
 * shows elapsed time against the planned minutes stored with the session; the
 * timer is presentation only and never ends the session or the Action by itself.
 */
function FocusOverlay({
  apiUrl,
  focus,
  busy,
  actionError,
  distractionText,
  distractionSaved,
  onDistractionChange,
  onCaptureDistraction,
  onEnd
}: {
  apiUrl: string;
  focus: ActiveFocus;
  busy: boolean;
  actionError: string | null;
  distractionText: string;
  distractionSaved: boolean;
  onDistractionChange: (value: string) => void;
  onCaptureDistraction: () => void;
  onEnd: (outcome: "completed" | "interrupted" | "abandoned") => void;
}) {
  const [showContext, setShowContext] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(() => elapsedSince(focus.startedAt));

  useEffect(() => {
    setElapsedSeconds(elapsedSince(focus.startedAt));
    const id = setInterval(() => setElapsedSeconds(elapsedSince(focus.startedAt)), 1000);
    return () => clearInterval(id);
  }, [focus.startedAt]);

  const plannedMinutes = focus.plannedMinutes ?? 45;
  const totalSeconds = plannedMinutes * 60;
  const remaining = Math.max(0, totalSeconds - elapsedSeconds);
  const progress = Math.min(100, (elapsedSeconds / totalSeconds) * 100);

  const overlay = (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "#06090e" }} role="dialog" aria-label="Focus session">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 50% 30% at 50% 55%, rgba(109,79,187,0.22) 0%, transparent 70%)" }}
      />
      <div className="relative z-10 flex flex-col max-w-[420px] mx-auto px-5 pb-10">
        <div className="pt-10 pb-4 flex items-center justify-between">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.25)" }}>
            <span className="rounded-full" style={{ width: 6, height: 6, background: "#4ade80" }} />
            <span className="text-[11px] font-bold" style={{ color: "#4ade80" }}>FOCUS</span>
          </span>
          <button
            type="button"
            onClick={() => setShowContext((value) => !value)}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}
            aria-label="Ngữ cảnh Action"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
              <path d="M12 8v4M12 16h.01" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="text-center mb-2">
          <p className="text-xs font-bold tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>ĐANG LÀM</p>
          <h2 className="text-xl leading-snug px-4 font-display" style={{ color: "#fff" }}>{focus.action.title}</h2>
        </div>

        <div className="flex flex-col items-center justify-center my-2">
          <div className="relative">
            <TimerRing progress={progress} size={220} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[48px] font-bold leading-none" style={{ color: "#fff", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em" }}>
                {formatClock(remaining)}
              </span>
              <p className="text-xs mt-1 font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>
                {remaining === 0 ? "ĐÃ QUA THỜI LƯỢNG DỰ KIẾN" : "PHÚT CÒN LẠI"}
              </p>
            </div>
          </div>
        </div>

        {showContext && focus.action.doneCondition ? (
          <div className="rounded-2xl p-4 mb-3" style={{ background: "rgba(10,14,28,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>THÀNH CÔNG KHI</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>{focus.action.doneCondition}</p>
          </div>
        ) : null}

        {showContext ? (
          <SessionChecklist apiUrl={apiUrl} actionId={focus.action.id} tone="dark" />
        ) : null}

        {actionError ? (
          <p className="text-xs px-3.5 py-3 rounded-2xl mb-2" role="alert" style={{ background: "rgba(224,56,56,0.15)", color: "#ffb4b4" }}>
            {actionError}
          </p>
        ) : null}

        <div className="mb-2">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span aria-hidden="true">💭</span>
            <input
              value={distractionText}
              maxLength={2000}
              onChange={(event) => onDistractionChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onCaptureDistraction();
              }}
              placeholder="Ý tưởng xẹt qua? Capture ngay…"
              aria-label="Ghi lại phân tâm"
              className="flex-1 bg-transparent text-xs outline-none"
              style={{ color: "rgba(255,255,255,0.75)" }}
            />
            {distractionText.trim().length > 0 ? (
              <button
                type="button"
                disabled={busy}
                onClick={onCaptureDistraction}
                className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0"
                style={{ background: "rgba(139,127,248,0.25)", color: "#c8bbff" }}
              >
                Lưu
              </button>
            ) : null}
          </div>
          {distractionSaved ? (
            <p className="text-[11px] mt-1.5" role="status" style={{ color: "#9b8ff8" }}>
              Đã capture. Action hiện tại không đổi.
            </p>
          ) : null}
        </div>

        <div className="pt-6 grid gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onEnd("completed")}
            className="h-12 rounded-2xl font-bold text-sm"
            style={{ background: "#fff", color: "#06090e" }}
          >
            Kết thúc — hoàn thành
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onEnd("interrupted")}
              className="flex-1 h-11 rounded-2xl font-semibold text-xs"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              Bị gián đoạn
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onEnd("abandoned")}
              className="flex-1 h-11 rounded-2xl font-semibold text-xs"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              Bỏ dở
            </button>
          </div>
          <p className="text-[11px] text-center mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            Kết thúc Focus không tự hoàn thành Action — bạn ghi kết quả ở bước sau.
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

function TimerRing({ progress, size }: { progress: number; size: number }) {
  const center = size / 2;
  const radius = size / 2 - 14;
  const circumference = 2 * Math.PI * radius;
  const dash = (progress / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="url(#focusGrad)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference - dash}`}
        style={{ transform: "rotate(-90deg)", transformOrigin: `${center}px ${center}px`, transition: "stroke-dasharray 1s linear" }}
      />
      <defs>
        <linearGradient id="focusGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="50%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function elapsedSince(startedAt: string): number {
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.floor((Date.now() - started) / 1000));
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
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
