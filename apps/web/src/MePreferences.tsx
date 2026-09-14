import { useEffect, useMemo, useState } from "react";
import type { UpdateUserPreferencesInput, UserPreferencesView } from "@lifeos/domain";
import { createApiClient } from "./api";

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const TIMEZONES = ["Asia/Ho_Chi_Minh", "Asia/Bangkok", "Asia/Singapore", "Asia/Tokyo", "Europe/Berlin", "UTC"];

/**
 * Settings the user owns. Every change is an explicit save to /v1/me/preferences; the
 * screen never writes silently and shows the stored value after each save.
 */
export function MePreferences({ apiUrl, tab }: { apiUrl: string; tab: "prefs" | "ai" }) {
  const api = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [preferences, setPreferences] = useState<UserPreferencesView | null>(null);
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string }>({
    kind: "idle"
  });

  useEffect(() => {
    const controller = new AbortController();
    api
      .getPreferences(controller.signal)
      .then(setPreferences)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setStatus({ kind: "error", message: reason instanceof Error ? reason.message : "Không tải được tuỳ chỉnh." });
      });
    return () => controller.abort();
  }, [api]);

  const save = async (update: UpdateUserPreferencesInput) => {
    setStatus({ kind: "saving" });
    try {
      const saved = await api.updatePreferences(update);
      setPreferences(saved);
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Không lưu được tuỳ chỉnh." });
    }
  };

  if (!preferences) {
    return (
      <div className="rounded-2xl p-5" style={CARD} role="status">
        <p className="text-sm" style={{ color: "var(--text-3)" }}>
          {status.kind === "error" ? status.message : "Đang tải tuỳ chỉnh…"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tab === "prefs" ? (
        <>
          <Row icon="🌏" label="Múi giờ">
            <select
              value={preferences.timezone}
              onChange={(event) => void save({ timezone: event.target.value })}
              aria-label="Múi giờ"
              className="text-xs font-semibold rounded-lg px-2 py-1.5"
              style={{ background: "var(--bg-2)", color: "var(--text)", border: "1px solid var(--border)" }}
            >
              {[...new Set([preferences.timezone, ...TIMEZONES])].map((zone) => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </Row>

          <Row icon="🕗" label="Giờ làm việc">
            <div className="flex items-center gap-1.5">
              <TimeInput value={preferences.workStartMinute} onChange={(minute) => void save({ workStartMinute: minute })} label="Giờ bắt đầu" />
              <span className="text-xs" style={{ color: "var(--text-3)" }}>–</span>
              <TimeInput value={preferences.workEndMinute} onChange={(minute) => void save({ workEndMinute: minute })} label="Giờ kết thúc" />
            </div>
          </Row>

          <div className="rounded-2xl p-4" style={CARD}>
            <p className="text-[10px] font-bold tracking-widest mb-2.5" style={{ color: "var(--text-3)" }}>📅 NGÀY LÀM VIỆC</p>
            <div className="flex gap-1.5 flex-wrap">
              {DAY_LABELS.map((label, day) => {
                const active = preferences.workDays.includes(day);
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      void save({
                        workDays: active ? preferences.workDays.filter((value) => value !== day) : [...preferences.workDays, day]
                      })
                    }
                    className="w-10 h-9 rounded-xl text-xs font-bold"
                    style={{
                      background: active ? "var(--primary)" : "var(--bg-2)",
                      color: active ? "var(--primary-fg)" : "var(--text-3)",
                      border: `1px solid ${active ? "transparent" : "var(--border)"}`
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <Row icon="🎯" label="Nhịp tập trung">
            <div className="flex items-center gap-1.5">
              <NumberInput value={preferences.focusMinutes} min={5} max={240} label="Số phút focus" onChange={(value) => void save({ focusMinutes: value })} />
              <span className="text-xs" style={{ color: "var(--text-3)" }}>ph +</span>
              <NumberInput value={preferences.breakMinutes} min={0} max={120} label="Số phút nghỉ" onChange={(value) => void save({ breakMinutes: value })} />
              <span className="text-xs" style={{ color: "var(--text-3)" }}>ph nghỉ</span>
            </div>
          </Row>
        </>
      ) : (
        <>
          <Toggle
            label="AI được đề xuất Action"
            description="Khi tắt, LifeOS chỉ hiện những việc do bạn tự tạo."
            checked={preferences.aiSuggestsActions}
            onChange={(checked) => void save({ aiSuggestsActions: checked })}
          />
          <Toggle
            label="Tóm tắt cuối ngày"
            description="Tóm tắt dựa trên dữ liệu bạn đã ghi trong ngày."
            checked={preferences.aiDailySummary}
            onChange={(checked) => void save({ aiDailySummary: checked })}
          />
          <div className="rounded-2xl p-4" style={{ background: "var(--primary-bg)", border: "1px solid var(--primary-border)" }}>
            <p className="text-[10px] font-bold tracking-widest mb-1.5" style={{ color: "var(--primary)" }}>GIỚI HẠN CỦA AI</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>
              Dù bật hết, AI vẫn chỉ được đề xuất. Direction, Season và việc hoàn thành một Action luôn cần bạn xác nhận.
            </p>
          </div>
        </>
      )}

      <p className="text-[11px]" role="status" style={{ color: status.kind === "error" ? "var(--red)" : "var(--text-3)" }}>
        {status.kind === "saving"
          ? "Đang lưu…"
          : status.kind === "saved"
            ? `Đã lưu lúc ${new Date(preferences.updatedAt).toLocaleTimeString("vi-VN")}`
            : status.kind === "error"
              ? status.message
              : "Mọi thay đổi được lưu ngay khi bạn chọn."}
      </p>
    </div>
  );
}

const CARD = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-card)"
} as const;

function Row({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 flex items-center justify-between gap-3" style={CARD}>
      <span className="text-xs font-semibold flex items-center gap-2" style={{ color: "var(--text-2)" }}>
        <span aria-hidden="true">{icon}</span>
        {label}
      </span>
      {children}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-2xl p-4 flex items-start justify-between gap-3" style={CARD}>
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="flex-shrink-0 rounded-full"
        style={{ width: 46, height: 26, background: checked ? "var(--primary)" : "var(--bg-2)", border: "1px solid var(--border)", position: "relative" }}
      >
        <span
          className="rounded-full"
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 22 : 2,
            width: 20,
            height: 20,
            background: "var(--card)",
            transition: "left 0.15s",
            boxShadow: "var(--shadow-card)"
          }}
        />
      </button>
    </div>
  );
}

function TimeInput({ value, onChange, label }: { value: number; onChange: (minute: number) => void; label: string }) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return (
    <input
      type="time"
      aria-label={label}
      value={`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`}
      onChange={(event) => {
        const [hourPart, minutePart] = event.target.value.split(":");
        const nextHours = Number.parseInt(hourPart ?? "", 10);
        const nextMinutes = Number.parseInt(minutePart ?? "", 10);
        if (Number.isNaN(nextHours) || Number.isNaN(nextMinutes)) return;
        onChange(nextHours * 60 + nextMinutes);
      }}
      className="text-xs font-semibold rounded-lg px-2 py-1.5"
      style={{ background: "var(--bg-2)", color: "var(--text)", border: "1px solid var(--border)" }}
    />
  );
}

function NumberInput({
  value,
  min,
  max,
  label,
  onChange
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      aria-label={label}
      value={value}
      onChange={(event) => {
        const next = Number.parseInt(event.target.value, 10);
        if (Number.isNaN(next) || next < min || next > max) return;
        onChange(next);
      }}
      className="text-xs font-semibold rounded-lg px-2 py-1.5 w-16"
      style={{ background: "var(--bg-2)", color: "var(--text)", border: "1px solid var(--border)" }}
    />
  );
}
