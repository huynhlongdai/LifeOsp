import { useEffect, useMemo, useState } from "react";
import type { CurrentDirectionView } from "@lifeos/domain";
import { ApiRequestError, createApiClient } from "./api";

export function DirectionPage({ apiUrl }: { apiUrl: string }) {
  const api = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "empty" }
    | { kind: "ready"; current: CurrentDirectionView }
    | { kind: "error"; message: string }
  >({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });

    api
      .getCurrentDirection(controller.signal)
      .then((current) => setState(current ? { kind: "ready", current } : { kind: "empty" }))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (reason instanceof ApiRequestError && reason.status === 401) {
          setState({ kind: "empty" });
          return;
        }
        setState({ kind: "error", message: reason instanceof Error ? reason.message : "Không thể tải Direction." });
      });

    return () => controller.abort();
  }, [api]);

  if (state.kind === "loading") {
    return (
      <div className="px-5 pt-9" role="status">
        <p className="text-sm" style={{ color: "var(--text-3)" }}>Đang đọc Current Season…</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="px-5 pt-9">
        <div className="rounded-2xl p-4" style={{ background: "var(--red-bg)", border: "1px solid var(--border)" }} role="alert">
          <p className="text-[10px] font-extrabold tracking-widest mb-1" style={{ color: "var(--red)" }}>DIRECTION</p>
          <p className="text-sm" style={{ color: "var(--text-2)" }}>{state.message}</p>
        </div>
      </div>
    );
  }

  if (state.kind === "empty") {
    return (
      <div className="pb-8 md:max-w-2xl">
        <DirectionHero subtitle="Chưa có hướng nào được xác nhận" />
        <div className="px-4 md:px-6">
          <div className="rounded-3xl p-6" style={CARD}>
            <p className="text-[10px] font-extrabold tracking-widest mb-2" style={{ color: "var(--text-3)" }}>NO CURRENT SEASON</p>
            <h2 className="text-xl font-display mb-2" style={{ color: "var(--text)" }}>Bạn chưa xác nhận một hướng hiện tại.</h2>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-2)" }}>
              LifeOS không tự chọn Direction từ Brain Dump. Clarity Reset giúp bạn làm rõ, cân nhắc trade-off rồi tự xác nhận hướng muốn bảo vệ.
            </p>
            <a href="/clarity" className="btn-primary-action inline-flex items-center justify-center w-full h-12 rounded-2xl font-display text-sm" style={{ textDecoration: "none" }}>
              Bắt đầu Clarity Reset
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { direction, season } = state.current;
  const progress = seasonProgress(season.startsOn, season.targetEndsOn);

  return (
    <div className="pb-8 md:max-w-2xl" aria-labelledby="current-direction-title">
      <DirectionHero subtitle={direction.confirmedAt ? `Đã xác nhận ${formatDateTime(direction.confirmedAt)}` : "Đã xác nhận"} />

      <div className="px-4 md:px-6">
        <div className="rounded-3xl overflow-hidden mb-4" style={{ boxShadow: "var(--shadow-raise)" }}>
          <div className="px-5 pt-6 pb-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, var(--primary), var(--blue))" }}>
            <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)" }} />
            <div className="relative z-10">
              <p className="text-[10px] font-bold tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>SEASON HIỆN TẠI</p>
              <p className="text-xs font-semibold mb-3" style={{ color: "rgba(255,255,255,0.8)" }}>{season.title}</p>
              <h2 id="current-direction-title" className="text-2xl leading-snug font-display" style={{ color: "#fff" }}>{direction.title}</h2>
              {direction.description ? (
                <p className="text-sm mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.78)" }}>{direction.description}</p>
              ) : null}
            </div>
          </div>

          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 24px 24px" }}>
            <div className="px-5 pt-4">
              <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: "var(--text-3)" }}>MỤC ĐÍCH CỦA SEASON</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>{season.purpose}</p>
            </div>

            {season.primaryFocusText ? (
              <div className="px-5 pt-4">
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl" style={{ background: "var(--primary-bg)", border: "1px solid var(--primary-border)" }}>
                  <div>
                    <p className="text-[9px] font-bold tracking-widest" style={{ color: "var(--primary)" }}>PRIMARY FOCUS</p>
                    <p className="text-xs font-medium" style={{ color: "var(--text)" }}>{season.primaryFocusText}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {progress ? (
              <div className="px-5 pt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold tracking-widest" style={{ color: "var(--text-3)" }}>TIẾN ĐỘ SEASON</p>
                  <span className="text-xs font-semibold" style={{ color: "var(--text-2)" }}>
                    {formatDate(progress.startsOn)} → {formatDate(progress.targetEndsOn)}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-2)" }}>
                  <div className="h-full rounded-full" style={{ width: `${progress.percent}%`, background: "linear-gradient(90deg, var(--primary), var(--blue))" }} />
                </div>
                <p className="text-[11px] mt-1.5" style={{ color: "var(--text-3)" }}>
                  Tính từ ngày bắt đầu và ngày kết thúc dự kiến bạn đã xác nhận.
                </p>
              </div>
            ) : null}

            <div className="px-5 py-4">
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-3)" }}>
                Một Current Season đang active. LifeOS sẽ không âm thầm thay nó bằng một hướng mới.
              </p>
            </div>
          </div>
        </div>

        <a
          href="/clarity"
          className="flex items-center justify-center w-full h-11 rounded-2xl font-semibold text-sm"
          style={{ background: "var(--bg-2)", border: "1.5px solid var(--border)", color: "var(--text-2)", textDecoration: "none" }}
        >
          Chạy Clarity Reset để đổi hướng
        </a>
      </div>
    </div>
  );
}

const CARD = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-card)"
} as const;

function DirectionHero({ subtitle }: { subtitle: string }) {
  return (
    <div className="hero-execute relative overflow-hidden px-5 pt-9 pb-5 md:px-8">
      <svg className="absolute pointer-events-none" style={{ top: 14, right: 22, opacity: 0.18 }} width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <polygon points="16,3 28,27 16,22 4,27" stroke="var(--text)" strokeWidth="1.7" fill="none" strokeLinejoin="round" />
      </svg>
      <div className="relative z-10">
        <p className="text-[9px] font-extrabold tracking-widest mb-1.5" style={{ color: "var(--text-3)", letterSpacing: "0.14em" }}>DIRECTION</p>
        <h1 className="text-[48px] leading-none mb-1.5 font-display" style={{ color: "var(--text)", textTransform: "uppercase" }}>HƯỚNG ĐI</h1>
        <p className="font-hand" style={{ color: "var(--text-3)", fontSize: 17 }}>{subtitle}</p>
      </div>
    </div>
  );
}

function seasonProgress(startsOn?: string, targetEndsOn?: string) {
  if (!startsOn || !targetEndsOn) return null;
  const start = new Date(`${startsOn}T00:00:00Z`).getTime();
  const end = new Date(`${targetEndsOn}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  const percent = Math.min(100, Math.max(0, Math.round(((Date.now() - start) / (end - start)) * 100)));
  return { startsOn, targetEndsOn, percent };
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString("vi-VN");
}
