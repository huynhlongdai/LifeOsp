import { useEffect, useMemo, useState } from "react";
import type { IncubatorItemView, InboxView } from "@lifeos/domain";
import { ApiRequestError, createApiClient } from "./api";

type KindId = IncubatorItemView["kind"];

const KIND_CONFIG: Record<KindId, { label: string; desc: string; bg: string; color: string; dot: string }> = {
  idea: { label: "Ý tưởng", desc: "Đang ấp ủ, có tiềm năng", bg: "var(--amber-bg)", color: "var(--amber)", dot: "var(--amber)" },
  project_candidate: { label: "Dự án tiềm năng", desc: "Có thể thành Project", bg: "var(--primary-bg)", color: "var(--primary)", dot: "var(--primary)" },
  someday: { label: "Someday", desc: "Khi có thời gian", bg: "var(--blue-bg)", color: "var(--blue)", dot: "var(--blue)" },
  reference: { label: "Tham khảo", desc: "Tư liệu để dành", bg: "var(--bg-2)", color: "var(--text-2)", dot: "var(--text-3)" }
};

const KIND_ORDER: KindId[] = ["idea", "project_candidate", "someday", "reference"];

/**
 * INCUBATOR lists what the user consciously parked in Clarity Reset. Nothing here is
 * activated automatically; "Kích hoạt" sends the user back to Clarity Reset, which is
 * the only path that can turn parked material into a commitment.
 */
export function IncubatorPage({ apiUrl }: { apiUrl: string }) {
  const api = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [filter, setFilter] = useState<KindId | "all">("all");
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "ready"; items: IncubatorItemView[] } | { kind: "empty" } | { kind: "error"; message: string }
  >({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });

    api
      .getInbox(controller.signal)
      .then((inbox: InboxView | null) => setState(inbox ? { kind: "ready", items: inbox.incubated } : { kind: "empty" }))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (reason instanceof ApiRequestError && reason.status === 401) {
          setState({ kind: "empty" });
          return;
        }
        setState({ kind: "error", message: reason instanceof Error ? reason.message : "Không thể tải Incubator." });
      });

    return () => controller.abort();
  }, [api]);

  if (state.kind === "loading") {
    return (
      <div className="px-5 pt-9" role="status">
        <p className="text-sm" style={{ color: "var(--text-3)" }}>Đang tải những gì bạn đang ấp ủ…</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="px-5 pt-9">
        <div className="rounded-2xl p-4" role="alert" style={{ background: "var(--red-bg)", border: "1px solid var(--border)" }}>
          <p className="text-[10px] font-extrabold tracking-widest mb-1" style={{ color: "var(--red)" }}>INCUBATOR</p>
          <p className="text-sm" style={{ color: "var(--text-2)" }}>{state.message}</p>
        </div>
      </div>
    );
  }

  const items = state.kind === "ready" ? state.items : [];
  const filtered = filter === "all" ? items : items.filter((item) => item.kind === filter);

  return (
    <div className="px-4 pt-5 pb-8 md:px-8 md:pt-8 md:max-w-3xl">
      <div className="mb-2">
        <p className="text-[10px] font-bold tracking-widest mb-1" style={{ color: "var(--text-3)" }}>INCUBATOR</p>
        <h1 className="text-[30px] leading-none font-display" style={{ color: "var(--text)" }}>Đang ấp ủ</h1>
      </div>
      <p className="text-sm mb-5" style={{ color: "var(--text-2)" }}>
        Những thứ bạn không muốn quên nhưng chưa đến lúc hành động. Không phải thất bại — chỉ là chưa phải bây giờ.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {KIND_ORDER.map((kind) => {
          const config = KIND_CONFIG[kind];
          const count = items.filter((item) => item.kind === kind).length;
          const active = filter === kind;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => setFilter(active ? "all" : kind)}
              aria-pressed={active}
              className="rounded-xl p-3 text-left transition-all"
              style={{ background: active ? config.bg : "var(--bg-2)", border: `1px solid ${active ? config.color : "var(--border)"}` }}
            >
              <p className="text-lg font-bold" style={{ color: config.color }}>{count}</p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: active ? config.color : "var(--text-2)" }}>{config.label}</p>
              <p className="text-[10px] mt-0.5 hidden md:block" style={{ color: "var(--text-3)" }}>{config.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="space-y-2.5">
        {filtered.map((item) => {
          const config = KIND_CONFIG[item.kind] ?? KIND_CONFIG.idea;
          return (
            <article
              key={item.id}
              className="rounded-2xl p-4"
              style={{ background: "linear-gradient(160deg, var(--card), var(--bg-2))", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: config.dot }} aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{item.title}</p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: config.bg, color: config.color }}>
                        {config.label}
                      </span>
                    </div>
                    {item.notes ? (
                      <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--text-2)" }}>{item.notes}</p>
                    ) : null}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[10px]" style={{ color: "var(--text-3)" }}>Thêm {formatDateTime(item.createdAt)}</span>
                      {item.revisitOn ? (
                        <span className="text-[10px]" style={{ color: "var(--text-3)" }}>Xem lại {formatLocalDate(item.revisitOn)}</span>
                      ) : null}
                      {item.sourceCaptureId ? (
                        <span className="text-[10px]" style={{ color: "var(--text-3)" }}>từ một capture</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <a
                  href="/clarity"
                  className="flex-shrink-0 h-8 px-3 rounded-lg text-xs font-semibold flex items-center"
                  style={{ background: "var(--primary-bg)", color: "var(--primary)", border: "1px solid var(--primary-border)", textDecoration: "none" }}
                >
                  Kích hoạt
                </a>
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl p-10 flex flex-col items-center gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <span className="text-3xl" aria-hidden="true">💡</span>
          <p className="text-sm font-medium text-center" style={{ color: "var(--text-2)" }}>
            {items.length === 0
              ? "Chưa có gì đang ấp ủ. Những thứ bạn chọn “chưa phải bây giờ” trong Clarity Reset sẽ nằm ở đây."
              : "Không có mục nào trong danh mục này."}
          </p>
        </div>
      ) : null}

      <div className="mt-4 px-4 py-3 rounded-xl" style={{ background: "var(--primary-bg)", border: "1px solid var(--primary-border)" }}>
        <p className="text-xs leading-relaxed" style={{ color: "var(--primary)" }}>
          Không có gì ở đây tự kích hoạt. Khi bạn muốn đưa một mục trở lại, hãy chạy Clarity Reset và tự xác nhận.
        </p>
      </div>
    </div>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString("vi-VN");
}

function formatLocalDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}
