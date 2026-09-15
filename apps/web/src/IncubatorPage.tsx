import { useEffect, useMemo, useState } from "react";
import type { IncubatorItemView, IncubatorKind, IncubatorListView } from "@lifeos/domain";
import { createApiClient } from "./api";
import { createInboxApiClient } from "./inbox-api";
import { ShieldIcon } from "./icons";
import { EmptyState, ErrorState, type AsyncState } from "./ui-states";

// Incubator / Not Now (spec §16.1) — the safe place. Copy per Addendum V1:
// "Được giữ lại. Bạn không cần nghĩ về điều này lúc này." Read-only in V0;
// promoting an item back into a Season stays an intentional Clarity step.

const KIND_ORDER: IncubatorKind[] = ["project_candidate", "idea", "someday", "reference"];

const KIND_COPY: Record<IncubatorKind, { label: string; hint: string; tone: string }> = {
  project_candidate: { label: "Có thể thành dự án", hint: "Đủ lớn để một ngày trở thành hướng đi — không phải hôm nay.", tone: "active" },
  idea: { label: "Ý tưởng", hint: "Những tia sáng bạn không muốn mất. Chúng chờ được, không cần nuôi.", tone: "reflect" },
  someday: { label: "Một ngày nào đó", hint: "Không có hạn. Không có nợ. Chỉ là chưa phải lúc.", tone: "notnow" },
  reference: { label: "Để tra lại", hint: "Tài liệu, đường dẫn, điều đáng nhớ.", tone: "maintain" }
};

export function IncubatorPage({ apiUrl }: { apiUrl: string }) {
  const inboxApi = useMemo(() => createInboxApiClient(apiUrl), [apiUrl]);
  const sessionApi = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [state, setState] = useState<AsyncState<IncubatorListView>>({ kind: "loading" });
  const [filter, setFilter] = useState<IncubatorKind | "all">("all");

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setState({ kind: "loading" });
        await sessionApi.bootstrapSession(controller.signal);
        const view = await inboxApi.listIncubator(controller.signal);
        setState({ kind: "success", data: view });
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setState({ kind: "error", message: reason instanceof Error ? reason.message : "Không thể tải phần đang giữ lại" });
      }
    };
    void load();
    return () => controller.abort();
  }, [inboxApi, sessionApi]);

  if (state.kind === "loading") {
    return (
      <section className="incubator-page" aria-busy="true">
        <div className="now-loading-strip" />
        <div className="now-loading-card"><span /><span /><span /></div>
      </section>
    );
  }
  if (state.kind === "error") return <ErrorState title="Chưa mở được phần đang giữ lại">{state.message}</ErrorState>;

  const { items, counts } = state.data;
  if (items.length === 0) {
    return (
      <EmptyState
        label="Được giữ lại"
        title="Chưa có gì được để sau."
        actions={<a className="text-button link-button" href="/clarity">Làm rõ để chọn điều đáng giữ lại</a>}
      >
        Khi bạn cân nhắc hướng đi và chọn "Để sau" cho một điều gì đó, nó sẽ nằm ở đây — an toàn, không đòi hỏi.
      </EmptyState>
    );
  }

  const visible = filter === "all" ? items : items.filter((item) => item.kind === filter);
  const kindsPresent = KIND_ORDER.filter((kind) => counts[kind] > 0);

  return (
    <section className="incubator-page">
      <div className="now-protect incubator-intro">
        <ShieldIcon />
        <span>
          <strong>{items.length} điều đang được giữ lại.</strong> Bạn không cần nghĩ về chúng lúc này. Chúng không mất đi, và không có gì quá hạn ở đây.
        </span>
      </div>

      <div className="incubator-lanes" role="radiogroup" aria-label="Nhóm">
        <button type="button" role="radio" aria-checked={filter === "all"} className={filter === "all" ? "incubator-lane selected" : "incubator-lane"} onClick={() => setFilter("all")}>
          <b className="num">{items.length}</b>
          <span>Tất cả</span>
        </button>
        {kindsPresent.map((kind) => (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={filter === kind}
            className={`incubator-lane ${KIND_COPY[kind].tone}${filter === kind ? " selected" : ""}`}
            onClick={() => setFilter(filter === kind ? "all" : kind)}
          >
            <b className="num">{counts[kind]}</b>
            <span>{KIND_COPY[kind].label}</span>
          </button>
        ))}
      </div>

      {filter !== "all" ? <p className="muted incubator-hint">{KIND_COPY[filter].hint}</p> : null}

      <ul className="incubator-list">
        {visible.map((item) => (
          <IncubatorCard key={item.id} item={item} />
        ))}
      </ul>

      <p className="muted incubator-footnote">
        Đưa một điều ở đây trở lại làm hướng đi là một quyết định có chủ ý — bắt đầu bằng <a href="/clarity">Làm rõ</a>, không phải một nút bấm.
      </p>
    </section>
  );
}

function IncubatorCard({ item }: { item: IncubatorItemView }) {
  const copy = KIND_COPY[item.kind];
  return (
    <li className={`sheet tint incubator-card ${copy.tone}`}>
      <div className="incubator-card-head">
        <span className={`pill ${copy.tone}`}>{copy.label}</span>
        <small className="num">Giữ từ {formatDate(item.createdAt)}</small>
      </div>
      <b className="incubator-card-title">{item.title}</b>
      {item.notes ? <p>{item.notes}</p> : null}
      <div className="incubator-card-foot">
        {item.revisitOn ? <small>Bạn từng hẹn xem lại: {formatDate(item.revisitOn)}</small> : null}
        {item.sourceCaptureId ? (
          <a className="text-button link-button incubator-card-link" href={`/clarity?capture=${encodeURIComponent(item.sourceCaptureId)}`}>
            Xem lại Brain Dump gốc
          </a>
        ) : null}
      </div>
    </li>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(date);
}
