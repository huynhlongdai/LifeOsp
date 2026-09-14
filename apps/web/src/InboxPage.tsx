import { useEffect, useMemo, useState } from "react";
import type { InboxView } from "@lifeos/domain";
import { ApiRequestError, createApiClient } from "./api";

const KIND_LABELS: Record<string, string> = {
  idea: "Ý tưởng",
  project: "Dự án",
  direction: "Hướng đi",
  concern: "Nỗi lo",
  question: "Thắc mắc",
  other: "Khác"
};

/**
 * INBOX lists what the user parked: raw captures and incubated items. Read-only by
 * design — material leaves this screen only through Clarity Reset.
 */
export function InboxPage({ apiUrl }: { apiUrl: string }) {
  const api = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [tab, setTab] = useState<"captures" | "incubated">("captures");
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "ready"; inbox: InboxView } | { kind: "empty" } | { kind: "error"; message: string }
  >({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });

    api
      .getInbox(controller.signal)
      .then((inbox) => setState(inbox ? { kind: "ready", inbox } : { kind: "empty" }))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (reason instanceof ApiRequestError && reason.status === 401) {
          setState({ kind: "empty" });
          return;
        }
        setState({ kind: "error", message: reason instanceof Error ? reason.message : "Không thể tải hộp chờ." });
      });

    return () => controller.abort();
  }, [api]);

  if (state.kind === "loading") {
    return (
      <div className="px-5 pt-9" role="status">
        <p className="text-sm" style={{ color: "var(--text-3)" }}>Đang tải hộp chờ…</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="px-5 pt-9">
        <div className="rounded-2xl p-4" role="alert" style={{ background: "var(--red-bg)", border: "1px solid var(--border)" }}>
          <p className="text-[10px] font-extrabold tracking-widest mb-1" style={{ color: "var(--red)" }}>INBOX</p>
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
            Chưa có phiên LifeOS nào trên thiết bị này. Mở NOW để bắt đầu, rồi dùng Brain Dump để ghi.
          </p>
        </div>
      </div>
    );
  }

  const { inbox } = state;
  const items = tab === "captures" ? inbox.captures : inbox.incubated;

  return (
    <div className="pb-8 md:max-w-2xl">
      <div className="hero-execute relative overflow-hidden px-5 pt-9 pb-5 md:px-8">
        <p className="text-[9px] font-extrabold tracking-widest mb-1.5" style={{ color: "var(--text-3)", letterSpacing: "0.14em" }}>INBOX</p>
        <h1 className="text-[44px] leading-none font-display" style={{ color: "var(--text)", textTransform: "uppercase" }}>HỘP CHỜ</h1>
        <p className="font-hand mt-1" style={{ color: "var(--text-3)", fontSize: 17 }}>Những gì bạn đã ném ra khỏi đầu</p>
      </div>

      <div className="px-4 pt-4 md:px-8">
        <div className="flex gap-1 mb-3 p-1 rounded-xl" style={{ background: "var(--bg-2)", width: "fit-content" }}>
          {([
            { id: "captures" as const, label: `Capture (${inbox.counts.captures})` },
            { id: "incubated" as const, label: `Ấp ủ (${inbox.counts.incubated})` }
          ]).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                background: tab === id ? "var(--card)" : "transparent",
                color: tab === id ? "var(--text)" : "var(--text-3)",
                boxShadow: tab === id ? "var(--shadow-card)" : "none"
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl p-5" style={CARD}>
            <p className="text-sm" style={{ color: "var(--text-2)" }}>
              {tab === "captures"
                ? "Chưa có capture nào. Nhấn nút + hoặc ⌘K để mở Brain Dump."
                : "Chưa có gì đang ấp ủ. Những thứ bạn chọn “chưa phải bây giờ” trong Clarity Reset sẽ nằm ở đây."}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {tab === "captures"
              ? inbox.captures.map((capture) => (
                  <article key={capture.id} className="rounded-2xl p-4" style={CARD}>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text)" }}>{capture.rawText}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Chip text={formatDateTime(capture.createdAt)} />
                      <Chip text={capture.hasInterpretation ? "Đã phân tích" : "Chưa phân tích"} />
                      <Chip text={capture.processingStatus} />
                    </div>
                  </article>
                ))
              : inbox.incubated.map((item) => (
                  <article key={item.id} className="rounded-2xl p-4" style={CARD}>
                    <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{item.title}</p>
                    {item.notes ? (
                      <p className="text-xs mt-1" style={{ color: "var(--text-2)" }}>{item.notes}</p>
                    ) : null}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Chip text={KIND_LABELS[item.kind] ?? item.kind} />
                      {item.revisitOn ? <Chip text={`Xem lại ${formatLocalDate(item.revisitOn)}`} /> : null}
                      <Chip text={formatDateTime(item.createdAt)} />
                    </div>
                  </article>
                ))}
          </div>
        )}

        <p className="text-[11px] mt-4" style={{ color: "var(--text-3)" }}>
          Hộp chờ chỉ để đọc. Không có gì ở đây tự trở thành cam kết — Clarity Reset là nơi bạn quyết định.
        </p>
      </div>
    </div>
  );
}

const CARD = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-card)"
} as const;

function Chip({ text }: { text: string }) {
  return (
    <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: "var(--bg-2)", color: "var(--text-3)" }}>
      {text}
    </span>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString("vi-VN");
}

function formatLocalDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}
