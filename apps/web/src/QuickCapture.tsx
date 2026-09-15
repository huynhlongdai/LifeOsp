import { useEffect, useMemo, useRef, useState } from "react";
import type { CaptureView } from "@lifeos/domain";
import { ApiRequestError, createApiClient } from "./api";

// Global quick capture (PRODUCT_SURFACE_SPEC §1.3). Hard rule: never ask for a
// category before saving. The raw text is stored as an immutable Capture; the
// user may clarify it later via /clarity?capture=<id>.

type Phase = "closed" | "editing" | "saving" | "saved";

export function QuickCapture({ apiUrl }: { apiUrl: string }) {
  const api = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [phase, setPhase] = useState<Phase>("closed");
  const [text, setText] = useState("");
  const [saved, setSaved] = useState<CaptureView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (phase === "editing") textareaRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (phase === "closed") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && phase !== "saving") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const open = () => {
    setPhase("editing");
    setError(null);
  };

  const close = () => {
    setPhase("closed");
    setError(null);
    if (saved) {
      setText("");
      setSaved(null);
    }
  };

  const save = async () => {
    const rawText = text.trim();
    if (!rawText) return;
    setPhase("saving");
    setError(null);
    try {
      const session = await api.bootstrapSession();
      if (session.status !== "active") throw new Error("Không mở được phiên LifeOS để lưu.");
      const capture = await api.createCapture(rawText);
      setSaved(capture);
      setPhase("saved");
    } catch (reason) {
      setError(
        reason instanceof ApiRequestError && reason.status === 401
          ? "Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang."
          : reason instanceof Error
            ? reason.message
            : "Chưa lưu được. Nội dung vẫn còn trong ô này."
      );
      setPhase("editing");
    }
  };

  const another = () => {
    setText("");
    setSaved(null);
    setPhase("editing");
  };

  return (
    <>
      <button className="quick-capture-trigger" type="button" onClick={open} aria-haspopup="dialog" aria-expanded={phase !== "closed"}>
        <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>Ghi nhanh</span>
      </button>

      {phase !== "closed" ? (
        <div className="quick-capture-backdrop" onClick={phase === "saving" ? undefined : close}>
          <section
            className="quick-capture-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-capture-title"
            onClick={(event) => event.stopPropagation()}
          >
            {phase === "saved" && saved ? (
              <>
                <p className="eyebrow success">Đã lưu</p>
                <h2 id="quick-capture-title" className="display sm">Đã giữ lại rồi. Bạn không cần nhớ nữa.</h2>
                <blockquote className="quick-capture-echo">{saved.rawText}</blockquote>
                <p>Khi nào muốn, LifeOS sẽ giúp bạn sắp xếp nó. Không bắt buộc ngay.</p>
                <div className="quick-capture-actions">
                  <a className="primary-button link-button" href={`/clarity?capture=${encodeURIComponent(saved.id)}`}>
                    Làm rõ ngay
                  </a>
                  <button className="secondary-button" type="button" onClick={another}>Ghi thêm</button>
                  <button className="text-button" type="button" onClick={close}>Đóng</button>
                </div>
              </>
            ) : (
              <>
                <p className="eyebrow">Ghi nhanh</p>
                <h2 id="quick-capture-title" className="display sm">Ném hết ra ngoài.</h2>
                <p>Đừng sắp xếp. Đừng lọc. Cứ viết thật hết — LifeOS lưu nguyên văn trước, sắp xếp sau.</p>
                <textarea
                  ref={textareaRef}
                  className="quick-capture-input"
                  value={text}
                  rows={4}
                  maxLength={20_000}
                  placeholder="Vd: nhớ hỏi Minh về hợp đồng; ý tưởng podcast về lịch sử; mình đang tránh việc gì nhỉ…"
                  disabled={phase === "saving"}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void save();
                  }}
                />
                {error ? <p className="now-inline-error" role="alert">{error}</p> : null}
                <div className="quick-capture-actions">
                  <button className="primary-button" type="button" disabled={phase === "saving" || text.trim().length === 0} onClick={() => void save()}>
                    {phase === "saving" ? "Đang lưu…" : "Lưu lại"}
                  </button>
                  <button className="text-button" type="button" disabled={phase === "saving"} onClick={close}>Đóng</button>
                  <small className="quick-capture-hint">⌘/Ctrl + Enter để lưu</small>
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
