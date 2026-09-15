import { useEffect, useMemo, useState } from "react";
import type { CurrentDirectionView } from "@lifeos/domain";
import { ApiRequestError, createApiClient } from "./api";
import { PaperStack } from "./ui-states";

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
      <section className="state-message" role="status">
        <p className="eyebrow">Đang đọc</p>
        <h2>Đang đọc mùa hiện tại…</h2>
        <p>LifeOS chỉ hiển thị hướng bạn đã xác nhận, không dựng dữ liệu tạm.</p>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section className="state-message error-message" role="alert">
        <p className="eyebrow">Chưa sẵn sàng</p>
        <h2>Chưa tải được hướng hiện tại.</h2>
        <p>{state.message}</p>
      </section>
    );
  }

  if (state.kind === "empty") {
    return (
      <section className="empty-state direction-empty">
        <PaperStack />
        <p className="eyebrow notnow">Chưa có mùa hiện tại</p>
        <h2>Bạn chưa xác nhận một hướng để bảo vệ.</h2>
        <p>
          LifeOS không tự chọn hướng từ Brain Dump. Làm rõ giúp bạn nhìn ra điều đang quan trọng, cân nhắc, rồi tự xác nhận.
        </p>
        <a className="primary-button link-button" href="/clarity">Bắt đầu làm rõ</a>
      </section>
    );
  }

  const { direction, season } = state.current;
  return (
    <section className="direction-current" aria-labelledby="current-direction-title">
      <div className="hero-card direction-hero">
        <p className="eyebrow active">Đang theo</p>
        <h2 id="current-direction-title">{direction.title}</h2>
        {direction.description ? <p>{direction.description}</p> : null}
        <div className="direction-meta">
          <span>Đã xác nhận</span>
          {direction.confirmedAt ? <span>{formatDateTime(direction.confirmedAt)}</span> : null}
        </div>
      </div>

      <article className="current-season-card">
        <div>
          <p className="eyebrow accent">Mùa hiện tại</p>
          <h3>{season.title}</h3>
          <p>{season.purpose}</p>
        </div>
        <div className="season-facts">
          {season.primaryFocusText ? (
            <div>
              <span>Ưu tiên chính</span>
              <strong>{season.primaryFocusText}</strong>
            </div>
          ) : null}
          {season.startsOn ? (
            <div>
              <span>Bắt đầu</span>
              <strong className="num">{formatDate(season.startsOn)}</strong>
            </div>
          ) : null}
          {season.targetEndsOn ? (
            <div>
              <span>Mục tiêu kết</span>
              <strong className="num">{formatDate(season.targetEndsOn)}</strong>
            </div>
          ) : null}
        </div>
      </article>

      <div className="direction-principle-note">
        <strong>Một mùa đang chạy.</strong>
        <span>LifeOS sẽ không âm thầm thay nó bằng một hướng mới.</span>
      </div>
    </section>
  );
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(date);
}
