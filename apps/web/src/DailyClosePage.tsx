import { useEffect, useMemo, useState } from "react";
import type { CloseDayInput, DailyCloseFrictionCode, DailyCloseSummary, DailyCloseView } from "@lifeos/domain";
import { ApiRequestError, createApiClient } from "./api";
import { createDailyCloseApiClient, localDayContext } from "./daily-close-api";
import { resultLabel } from "./ResultPanel";
import { ErrorState, PaperStack, type AsyncState } from "./ui-states";

// B5 Daily Close — a ≤60s ritual, one question per screen, facts first,
// every input optional, ending in one narrative sentence (Meeting #020 W2).

type Step = "facts" | "progress" | "friction" | "closed";

const FRICTION_OPTIONS: Array<{ code: DailyCloseFrictionCode; label: string }> = [
  { code: "none", label: "Không có gì cản" },
  { code: "unclear", label: "Chưa rõ phải làm gì" },
  { code: "too_big", label: "Việc quá lớn" },
  { code: "low_energy", label: "Ít năng lượng" },
  { code: "interrupted", label: "Bị gián đoạn" },
  { code: "waiting_on_others", label: "Chờ người khác" },
  { code: "new_idea_pulled", label: "Ý mới kéo đi" },
  { code: "other", label: "Khác" }
];

export function DailyClosePage({ apiUrl }: { apiUrl: string }) {
  const dailyCloseApi = useMemo(() => createDailyCloseApiClient(apiUrl), [apiUrl]);
  const sessionApi = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const day = useMemo(() => localDayContext(), []);

  const [state, setState] = useState<AsyncState<DailyCloseView>>({ kind: "loading" });
  const [step, setStep] = useState<Step>("facts");
  const [progressText, setProgressText] = useState("");
  const [frictionCode, setFrictionCode] = useState<DailyCloseFrictionCode | null>(null);
  const [frictionNote, setFrictionNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setState({ kind: "loading" });
        await sessionApi.bootstrapSession(controller.signal);
        const view = await dailyCloseApi.getDailyClose(day.date, day.offsetMinutes, controller.signal);
        setState({ kind: "success", data: view });
        if (view.close) setStep("closed");
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setState({ kind: "error", message: reason instanceof Error ? reason.message : "Không thể tải Khép ngày" });
      }
    };
    void load();
    return () => controller.abort();
  }, [dailyCloseApi, sessionApi, day]);

  const close = async () => {
    const input: CloseDayInput = {
      date: day.date,
      offsetMinutes: day.offsetMinutes,
      ...(progressText.trim() ? { meaningfulProgressText: progressText.trim() } : {}),
      ...(frictionCode ? { frictionCode } : {}),
      ...(frictionNote.trim() ? { frictionNote: frictionNote.trim() } : {})
    };
    try {
      setBusy(true);
      setError(null);
      const view = await dailyCloseApi.closeDay(input);
      setState({ kind: "success", data: view });
      setStep("closed");
    } catch (reason) {
      setError(closeErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  if (state.kind === "loading") {
    return (
      <section className="close-page" aria-busy="true">
        <div className="now-loading-strip" />
        <div className="now-loading-card"><span /><span /><span /></div>
      </section>
    );
  }
  if (state.kind === "error") return <ErrorState title="Khép ngày chưa sẵn sàng">{state.message}</ErrorState>;

  const view = state.data;
  const { summary } = view;
  const nothingRecorded = summary.resultItems.length === 0 && summary.focusSessions.count === 0 && summary.distractionsCaptured === 0;

  if (step === "closed" && view.close) {
    return (
      <section className="close-page">
        <article className="sheet close-sheet close-done">
          <p className="eyebrow reflect">Đã khép ngày · {formatDate(view.date)}</p>
          <h2 className="display sm">{describeDay(summary)}</h2>
          {view.close.meaningfulProgressText ? (
            <p className="close-echo">
              Điều đáng kể hôm nay, theo lời bạn: <strong>{view.close.meaningfulProgressText}</strong>
            </p>
          ) : null}
          {view.close.frictionCode && view.close.frictionCode !== "none" ? (
            <p className="close-echo">Điều đã cản bạn: <strong>{frictionLabel(view.close.frictionCode)}</strong>{view.close.frictionNote ? ` — ${view.close.frictionNote}` : ""}</p>
          ) : null}
          <p className="muted">Ngày mai không có nợ. Việc chưa xong vẫn được giữ, không đòi bạn điều gì.</p>
          <div className="close-actions">
            <a className="primary-button link-button" href="/">Về NOW</a>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setProgressText(view.close?.meaningfulProgressText ?? "");
                setFrictionCode(view.close?.frictionCode ?? null);
                setFrictionNote(view.close?.frictionNote ?? "");
                setStep("facts");
              }}
            >
              Chỉnh lại
            </button>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="close-page" aria-live="polite">
      <ol className="close-steps" aria-label="Các bước khép ngày">
        {(["facts", "progress", "friction"] as const).map((name, index) => (
          <li key={name} className={step === name ? "current" : index < ["facts", "progress", "friction"].indexOf(step) ? "done" : ""} />
        ))}
      </ol>

      {step === "facts" ? (
        <article className="sheet close-sheet">
          <p className="eyebrow reflect">Hôm nay đã xảy ra</p>
          {nothingRecorded ? (
            <>
              <PaperStack />
              <h2 className="display sm">Hôm nay chưa có gì được ghi lại.</h2>
              <p>Không sao. Bạn vẫn có thể khép ngày — hoặc chỉ đóng app.</p>
            </>
          ) : (
            <>
              <div className="close-facts">
                <FactCell value={summary.results.completed} label="việc xong" />
                <FactCell value={summary.focusSessions.totalMinutes} label="phút Focus" suffix="′" />
                <FactCell value={summary.results.partial + summary.results.postponed + summary.results.blocked} label="việc được giữ lại" />
              </div>
              {summary.resultItems.length > 0 ? (
                <ul className="close-list">
                  {summary.resultItems.map((item) => (
                    <li key={`${item.actionId}-${item.recordedAt}`} className={`close-item ${item.result}`}>
                      <span className="close-item-mark" aria-hidden="true" />
                      <div>
                        <b>{item.title}</b>
                        <small>{resultLabel(item.result)} · {formatTime(item.recordedAt)}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="muted close-footnote">{factFootnote(summary)}</p>
            </>
          )}
          <div className="close-actions">
            <button className="primary-button" type="button" onClick={() => setStep("progress")}>Tiếp</button>
            <button className="text-button" type="button" disabled={busy} onClick={() => void close()}>
              Khép ngày luôn
            </button>
          </div>
        </article>
      ) : null}

      {step === "progress" ? (
        <article className="sheet close-sheet">
          <p className="eyebrow reflect">Một câu hỏi, tuỳ chọn</p>
          <h2 className="display sm">Điều gì đáng kể hôm nay?</h2>
          <p>Không cần dài. Một dòng là đủ — hoặc để trống.</p>
          <textarea
            className="close-input"
            value={progressText}
            maxLength={1000}
            rows={3}
            placeholder="Vd: bắt đầu được việc mình né cả tuần"
            onChange={(event) => setProgressText(event.target.value)}
          />
          <div className="close-actions">
            <button className="primary-button" type="button" onClick={() => setStep("friction")}>Tiếp</button>
            <button className="text-button" type="button" onClick={() => { setProgressText(""); setStep("friction"); }}>Bỏ qua</button>
          </div>
        </article>
      ) : null}

      {step === "friction" ? (
        <article className="sheet close-sheet">
          <p className="eyebrow reflect">Câu cuối, tuỳ chọn</p>
          <h2 className="display sm">Có gì cản bạn hôm nay không?</h2>
          <div className="close-chips" role="radiogroup" aria-label="Điều gì đã cản">
            {FRICTION_OPTIONS.map((option) => (
              <button
                key={option.code}
                type="button"
                role="radio"
                aria-checked={frictionCode === option.code}
                className={frictionCode === option.code ? "close-chip selected" : "close-chip"}
                onClick={() => setFrictionCode(frictionCode === option.code ? null : option.code)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {frictionCode && frictionCode !== "none" ? (
            <input
              className="close-input"
              value={frictionNote}
              maxLength={1000}
              placeholder="Nói thêm một chút, nếu muốn"
              onChange={(event) => setFrictionNote(event.target.value)}
            />
          ) : null}
          {error ? <p className="now-inline-error" role="alert">{error}</p> : null}
          <div className="close-actions">
            <button className="primary-button" type="button" disabled={busy} onClick={() => void close()}>
              {busy ? "Đang khép…" : "Khép ngày"}
            </button>
            <button className="text-button" type="button" disabled={busy} onClick={() => setStep("progress")}>Quay lại</button>
          </div>
        </article>
      ) : null}

      <p className="muted close-weekly-reset-link">
        Muốn nhìn lại cả tuần? <a className="text-button link-button" href="/weekly-reset">Mở Weekly Reset</a>
      </p>
    </section>
  );
}

function FactCell({ value, label, suffix = "" }: { value: number; label: string; suffix?: string }) {
  return (
    <div className="close-fact">
      <b className="num">{value}{suffix}</b>
      <small>{label}</small>
    </div>
  );
}

/** One factual sentence. Never a score, never a judgement. */
export function describeDay(summary: DailyCloseSummary): string {
  const parts: string[] = [];
  if (summary.results.completed > 0) parts.push(`hoàn thành ${summary.results.completed} việc`);
  if (summary.results.partial > 0) parts.push(`tiến thêm ở ${summary.results.partial} việc`);
  if (summary.focusSessions.totalMinutes > 0) parts.push(`tập trung ${summary.focusSessions.totalMinutes} phút`);
  const kept = summary.results.postponed + summary.results.blocked + summary.intentionalDecisions;
  if (kept > 0) parts.push(`giữ lại ${kept} việc cho lúc khác`);
  if (summary.results.dropped > 0) parts.push(`buông ${summary.results.dropped} việc không còn đáng bảo vệ`);
  if (parts.length === 0) return "Hôm nay bạn đã có mặt. Thế là đủ để khép ngày.";
  const last = parts.pop();
  const body = parts.length > 0 ? `${parts.join(", ")} và ${last}` : String(last);
  return `Hôm nay bạn đã ${body}.`;
}

function factFootnote(summary: DailyCloseSummary): string {
  const bits: string[] = [];
  if (summary.distractionsCaptured > 0) bits.push(`${summary.distractionsCaptured} phân tâm đã được ghi lại thay vì kéo bạn đi`);
  if (summary.intentionalDecisions > 0) bits.push(`${summary.intentionalDecisions} gợi ý bạn đã chủ động để sau`);
  if (summary.results.dropped > 0) bits.push(`${summary.results.dropped} việc bạn quyết định buông`);
  return bits.length > 0 ? bits.join(" · ") : "Chỉ những gì đã thật sự xảy ra.";
}

function frictionLabel(code: DailyCloseFrictionCode): string {
  return FRICTION_OPTIONS.find((option) => option.code === code)?.label ?? code;
}

function closeErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang.";
    return error.message;
  }
  return error instanceof Error ? error.message : "Không thể khép ngày";
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { timeStyle: "short" }).format(date);
}
