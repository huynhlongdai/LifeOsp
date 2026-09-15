import { useEffect, useMemo, useState } from "react";
import type { CaptureKind, CaptureListView, CaptureProcessingStatus, CaptureView } from "@lifeos/domain";
import { createApiClient } from "./api";
import { createInboxApiClient } from "./inbox-api";
import { EmptyState, ErrorState, type AsyncState } from "./ui-states";

// Inbox (spec §3.1) — where quick captures land. Facts only, grouped by day.
// Opening a capture continues in Clarity (/clarity?capture=<id>); nothing here
// classifies, ranks, or nudges.

type Filter = "all" | "open" | "done";

export function InboxPage({ apiUrl }: { apiUrl: string }) {
  const inboxApi = useMemo(() => createInboxApiClient(apiUrl), [apiUrl]);
  const sessionApi = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [state, setState] = useState<AsyncState<CaptureListView>>({ kind: "loading" });
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setState({ kind: "loading" });
        await sessionApi.bootstrapSession(controller.signal);
        const view = await inboxApi.listCaptures(100, controller.signal);
        setState({ kind: "success", data: view });
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setState({ kind: "error", message: reason instanceof Error ? reason.message : "Không thể tải Inbox" });
      }
    };
    void load();
    return () => controller.abort();
  }, [inboxApi, sessionApi]);

  if (state.kind === "loading") {
    return (
      <section className="inbox-page" aria-busy="true">
        <div className="now-loading-strip" />
        <div className="now-loading-card"><span /><span /><span /></div>
      </section>
    );
  }
  if (state.kind === "error") return <ErrorState title="Inbox chưa sẵn sàng">{state.message}</ErrorState>;

  const items = state.data.items;
  if (items.length === 0) {
    return (
      <EmptyState label="Inbox" title="Chưa có gì được ghi lại." actions={<a className="text-button link-button" href="/">Về NOW</a>}>
        Mọi thứ bạn ghi nhanh sẽ hạ cánh ở đây, nguyên văn, chờ tới khi bạn muốn sắp xếp.
      </EmptyState>
    );
  }

  const openCount = items.filter((item) => isOpen(item.processingStatus)).length;
  const visible = items.filter((item) =>
    filter === "all" ? true : filter === "open" ? isOpen(item.processingStatus) : !isOpen(item.processingStatus)
  );
  const groups = groupByDay(visible);

  return (
    <section className="inbox-page">
      <header className="inbox-head">
        <p>
          {openCount > 0
            ? `${openCount} điều đang chờ bạn sắp xếp — không vội. Chúng không đi đâu cả.`
            : "Mọi thứ đã được xem qua. Không có gì đang chờ."}
        </p>
        <div className="inbox-filters" role="radiogroup" aria-label="Lọc">
          {(
            [
              { id: "all", label: "Tất cả", count: items.length },
              { id: "open", label: "Đang chờ", count: openCount },
              { id: "done", label: "Đã xem", count: items.length - openCount }
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={filter === option.id}
              className={filter === option.id ? "pill accent inbox-filter" : "pill inbox-filter"}
              onClick={() => setFilter(option.id)}
            >
              {option.label} <span className="num">{option.count}</span>
            </button>
          ))}
        </div>
      </header>

      {groups.map((group) => (
        <section key={group.label} className="inbox-group" aria-label={group.label}>
          <div className="section-head"><h3>{group.label}</h3><span className="muted num">{group.items.length}</span></div>
          <ul className="inbox-list">
            {group.items.map((item) => (
              <li key={item.id} className={`inbox-item ${isOpen(item.processingStatus) ? "open" : "done"}`}>
                <a className="inbox-item-link" href={`/clarity?capture=${encodeURIComponent(item.id)}`}>
                  <span className="inbox-item-mark" aria-hidden="true" />
                  <div className="inbox-item-body">
                    <p className="inbox-item-text">{excerpt(item.rawText)}</p>
                    <small>
                      {formatTime(item.createdAt)} · {kindLabel(item.kind)} · {statusLabel(item.processingStatus)}
                    </small>
                  </div>
                  <span className="inbox-item-cta">{isOpen(item.processingStatus) ? "Làm rõ" : "Xem"}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {state.data.total > items.length ? (
        <p className="muted inbox-footnote">Đang hiện {items.length} gần nhất trong {state.data.total}.</p>
      ) : null}
    </section>
  );
}

function isOpen(status: CaptureProcessingStatus): boolean {
  return status === "unprocessed" || status === "interpreted";
}

function groupByDay(items: CaptureView[]): Array<{ label: string; items: CaptureView[] }> {
  const today = new Date();
  const todayKey = dayKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = dayKey(yesterday);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const buckets: Record<string, CaptureView[]> = { "Hôm nay": [], "Hôm qua": [], "Tuần này": [], "Trước đó": [] };
  for (const item of items) {
    const created = new Date(item.createdAt);
    const key = dayKey(created);
    if (key === todayKey) buckets["Hôm nay"]?.push(item);
    else if (key === yesterdayKey) buckets["Hôm qua"]?.push(item);
    else if (created >= weekAgo) buckets["Tuần này"]?.push(item);
    else buckets["Trước đó"]?.push(item);
  }
  return Object.entries(buckets)
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, items: list }));
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function excerpt(text: string): string {
  const firstLine = text.split("\n").find((line) => line.trim().length > 0) ?? text;
  return firstLine.length > 160 ? `${firstLine.slice(0, 157).trimEnd()}…` : firstLine;
}

function kindLabel(kind: CaptureKind): string {
  if (kind === "distraction") return "phân tâm trong Focus";
  if (kind === "voice_transcript") return "ghi âm";
  if (kind === "quick_note") return "ghi nhanh";
  return "ghi lại";
}

function statusLabel(status: CaptureProcessingStatus): string {
  if (status === "unprocessed") return "chưa sắp xếp";
  if (status === "interpreted") return "đã sắp xếp, chờ bạn xem";
  if (status === "corrected") return "bạn đã chỉnh";
  if (status === "promoted") return "đã thành hướng";
  return "đã cất";
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { timeStyle: "short" }).format(date);
}
