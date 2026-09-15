import { useEffect, useMemo, useState } from "react";
import { EDIT_DIRECTION_MAX_DESCRIPTION, EDIT_DIRECTION_MAX_TITLE, type CurrentDirectionView, type DirectionView } from "@lifeos/domain";
import { ApiRequestError, createApiClient, type ApiClient } from "./api";
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
  const setCurrent = (current: CurrentDirectionView) => setState({ kind: "ready", current });

  return (
    <section className="direction-current" aria-labelledby="current-direction-title">
      <div className="hero-card direction-hero">
        <p className="eyebrow active">Đang theo</p>
        <DirectionHeader api={api} direction={direction} onSaved={(updatedDirection) => setCurrent({ direction: updatedDirection, season })} />
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

function DirectionHeader({
  api,
  direction,
  onSaved
}: {
  api: ApiClient;
  direction: DirectionView;
  onSaved: (direction: DirectionView) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(direction.title);
  const [description, setDescription] = useState(direction.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <div className="direction-header-view">
        <h2 id="current-direction-title">{direction.title}</h2>
        {direction.description ? <p>{direction.description}</p> : null}
        <button
          type="button"
          className="text-button link-button"
          onClick={() => {
            setTitle(direction.title);
            setDescription(direction.description ?? "");
            setError(null);
            setEditing(true);
          }}
        >
          Sửa Direction
        </button>
      </div>
    );
  }

  const save = async () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      setError("Tên hướng không được để trống.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await api.editDirection({ title: trimmedTitle, description: description.trim() });
      onSaved(updated.direction);
      setEditing(false);
    } catch (reason) {
      setError(editDirectionErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="direction-header-edit">
      <label>
        <span>Tên hướng</span>
        <input value={title} maxLength={EDIT_DIRECTION_MAX_TITLE} onChange={(event) => setTitle(event.target.value)} disabled={busy} />
      </label>
      <label>
        <span>Vì sao hướng này quan trọng</span>
        <textarea
          value={description}
          rows={3}
          maxLength={EDIT_DIRECTION_MAX_DESCRIPTION}
          onChange={(event) => setDescription(event.target.value)}
          disabled={busy}
        />
      </label>
      {error ? <p className="now-inline-error" role="alert">{error}</p> : null}
      <div className="direction-header-edit-actions">
        <button type="button" className="primary-button" onClick={() => void save()} disabled={busy || title.trim().length === 0}>
          {busy ? "Đang lưu…" : "Lưu"}
        </button>
        <button type="button" className="text-button link-button" onClick={() => setEditing(false)} disabled={busy}>
          Huỷ
        </button>
      </div>
    </div>
  );
}

function editDirectionErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang.";
    if (error.status === 404) return "Không tìm thấy hướng đang hoạt động nữa.";
    if (error.status === 400) return "Tên hướng cần 1-200 ký tự; mô tả tối đa 2000 ký tự.";
  }
  return "Chưa lưu được thay đổi. Thử lại.";
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
