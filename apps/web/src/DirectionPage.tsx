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
      <section className="state-message" role="status">
        <p className="eyebrow">DIRECTION</p>
        <h2>Đang đọc Current Season...</h2>
        <p>LifeOS đang tải trạng thái đã xác nhận, không dựng dữ liệu tạm trên client.</p>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section className="state-message error-message" role="alert">
        <p className="eyebrow">DIRECTION</p>
        <h2>Chưa tải được Direction.</h2>
        <p>{state.message}</p>
      </section>
    );
  }

  if (state.kind === "empty") {
    return (
      <section className="hero-card direction-empty">
        <p className="eyebrow">NO CURRENT SEASON</p>
        <h2>Bạn chưa xác nhận một hướng hiện tại.</h2>
        <p>
          LifeOS không tự chọn Direction từ Brain Dump. Clarity Reset giúp bạn làm rõ, trade-off rồi tự xác nhận hướng muốn bảo vệ.
        </p>
        <a className="primary-button link-button" href="/clarity">Bắt đầu Clarity Reset</a>
      </section>
    );
  }

  const { direction, season } = state.current;
  return (
    <section className="direction-current" aria-labelledby="current-direction-title">
      <div className="hero-card direction-hero">
        <p className="eyebrow">CURRENT DIRECTION</p>
        <h2 id="current-direction-title">{direction.title}</h2>
        {direction.description ? <p>{direction.description}</p> : null}
        <div className="direction-meta">
          <span>Confirmed</span>
          {direction.confirmedAt ? <span>{formatDateTime(direction.confirmedAt)}</span> : null}
        </div>
      </div>

      <article className="current-season-card">
        <div>
          <p className="eyebrow">CURRENT SEASON</p>
          <h3>{season.title}</h3>
          <p>{season.purpose}</p>
        </div>
        <div className="season-facts">
          {season.primaryFocusText ? (
            <div>
              <span>PRIMARY FOCUS</span>
              <strong>{season.primaryFocusText}</strong>
            </div>
          ) : null}
          {season.startsOn ? (
            <div>
              <span>START</span>
              <strong>{formatDate(season.startsOn)}</strong>
            </div>
          ) : null}
          {season.targetEndsOn ? (
            <div>
              <span>TARGET END</span>
              <strong>{formatDate(season.targetEndsOn)}</strong>
            </div>
          ) : null}
        </div>
      </article>

      <div className="direction-principle-note">
        <strong>Một Current Season đang active.</strong>
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
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString("vi-VN");
}
