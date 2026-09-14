import { useEffect, useMemo, useState } from "react";
import type { MeView } from "@lifeos/domain";
import { ApiRequestError, createApiClient } from "./api";

/**
 * ME mirrors what the user actually recorded. Every figure is a count of stored rows —
 * LifeOS does not estimate, project or score the person.
 */
export function MePage({ apiUrl }: { apiUrl: string }) {
  const api = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "ready"; me: MeView } | { kind: "empty" } | { kind: "error"; message: string }
  >({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });

    api
      .getMe(controller.signal)
      .then((me) => setState(me ? { kind: "ready", me } : { kind: "empty" }))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (reason instanceof ApiRequestError && reason.status === 401) {
          setState({ kind: "empty" });
          return;
        }
        setState({ kind: "error", message: reason instanceof Error ? reason.message : "Không thể tải hồ sơ." });
      });

    return () => controller.abort();
  }, [api]);

  if (state.kind === "loading") {
    return (
      <div className="px-5 pt-9" role="status">
        <p className="text-sm" style={{ color: "var(--text-3)" }}>Đang tải hồ sơ…</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="px-5 pt-9">
        <div className="rounded-2xl p-4" role="alert" style={{ background: "var(--red-bg)", border: "1px solid var(--border)" }}>
          <p className="text-[10px] font-extrabold tracking-widest mb-1" style={{ color: "var(--red)" }}>ME</p>
          <p className="text-sm" style={{ color: "var(--text-2)" }}>{state.message}</p>
        </div>
      </div>
    );
  }

  if (state.kind === "empty") {
    return (
      <div className="px-5 pt-9">
        <div className="rounded-2xl p-5" style={CARD}>
          <p className="text-sm" style={{ color: "var(--text-2)" }}>
            Chưa có phiên LifeOS nào trên thiết bị này. Hãy mở NOW để bắt đầu.
          </p>
        </div>
      </div>
    );
  }

  const { me } = state;
  const stats = [
    { label: "Chốt ngày liên tiếp", value: String(me.stats.dailyCloseStreak), unit: "ngày", color: "var(--amber)", emoji: "🔥" },
    { label: "Focus 7 ngày", value: (me.stats.focusMinutesLast7Days / 60).toFixed(1), unit: "giờ", color: "var(--primary)", emoji: "🧠" },
    { label: "Xong 7 ngày", value: String(me.stats.actionsCompletedLast7Days), unit: "action", color: "var(--green)", emoji: "✅" },
    { label: "Đang mở", value: String(me.stats.actionsOpen), unit: "action", color: "var(--blue)", emoji: "📋" }
  ];

  return (
    <div className="pb-8 md:max-w-2xl">
      <div className="relative px-5 pt-10 pb-6 md:px-8 overflow-hidden" style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 40% at 80% 0%, var(--primary-bg) 0%, transparent 70%)" }} />
        <div className="relative z-10 flex items-end gap-4">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl flex-shrink-0 font-display"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--blue))", boxShadow: "0 8px 24px rgba(0,0,0,0.25)", color: "var(--primary-fg)" }}
            aria-hidden="true"
          >
            L
          </div>
          <div className="pb-1 min-w-0">
            <h1 className="text-[28px] leading-tight font-display" style={{ color: "var(--text)" }}>Hồ sơ của bạn</h1>
            <p className="text-sm" style={{ color: "var(--text-3)" }}>Dùng LifeOS từ {formatDate(me.memberSince)}</p>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-4 gap-2 mt-5">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl p-3 text-center" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <p className="text-lg mb-0.5" aria-hidden="true">{stat.emoji}</p>
              <p className="text-base font-bold leading-none" style={{ color: stat.color }}>
                {stat.value}
                <span className="text-[10px] ml-0.5 font-semibold" style={{ color: "var(--text-3)" }}>{stat.unit}</span>
              </p>
              <p className="text-[9px] mt-0.5" style={{ color: "var(--text-3)" }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 md:px-8 space-y-3">
        <div className="rounded-2xl p-4" style={CARD}>
          <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: "var(--text-3)" }}>SEASON HIỆN TẠI</p>
          {me.season ? (
            <>
              <p className="text-base font-display mb-1" style={{ color: "var(--text)" }}>{me.season.title}</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>{me.season.purpose}</p>
              {me.directionTitle ? (
                <p className="text-xs mt-2" style={{ color: "var(--text-3)" }}>Hướng: {me.directionTitle}</p>
              ) : null}
            </>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-2)" }}>
              Chưa có Season nào đang chạy. Chạy Clarity Reset để xác nhận hướng đi.
            </p>
          )}
        </div>

        <div className="rounded-2xl p-4" style={CARD}>
          <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: "var(--text-3)" }}>DỮ LIỆU BẠN ĐÃ GHI</p>
          <ul className="space-y-2">
            <Fact label="Phiên Focus đã chạy" value={`${me.stats.focusSessionsTotal}`} />
            <Fact label="Capture đã ghi" value={`${me.stats.capturesTotal}`} />
            <Fact
              label="Lần chốt ngày gần nhất"
              value={me.stats.lastDailyCloseOn ? formatLocalDate(me.stats.lastDailyCloseOn) : "chưa có"}
            />
          </ul>
        </div>

        <div className="rounded-2xl p-4" style={{ background: "var(--primary-bg)", border: "1px solid var(--primary-border)" }}>
          <p className="text-[10px] font-bold tracking-widest mb-1.5" style={{ color: "var(--primary)" }}>NGUYÊN TẮC</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>
            Mọi con số ở đây đều đếm từ việc bạn đã thực sự ghi lại. LifeOS không chấm điểm bạn và không suy đoán
            thêm bất kỳ chỉ số nào.
          </p>
        </div>
      </div>
    </div>
  );
}

const CARD = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-card)"
} as const;

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-xs" style={{ color: "var(--text-2)" }}>{label}</span>
      <span className="text-xs font-bold" style={{ color: "var(--text)" }}>{value}</span>
    </li>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString("vi-VN");
}

function formatLocalDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}
