import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createApiClient } from "./api";

const MAX_LENGTH = 2000;

const TAG_SUGGESTIONS = ["💡 Ý tưởng", "📁 Dự án", "🎯 Mục tiêu", "😰 Nỗi lo", "💼 Công việc", "❓ Thắc mắc"];

/**
 * Brain Dump writes straight to /v1/captures. It never interprets, sorts or promotes
 * the text — Clarity Reset stays the only place where a capture becomes a commitment.
 * Only the written mode from the prototype is shipped; voice and file capture have no
 * backend yet and are not faked in the UI.
 */
export function BrainDumpSheet({ apiUrl, onClose }: { apiUrl: string; onClose: () => void }) {
  const [text, setText] = useState("");
  const [state, setState] = useState<{ kind: "editing" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string }>({
    kind: "editing"
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const save = async () => {
    const rawText = text.trim();
    if (rawText.length === 0 || state.kind === "saving") return;
    setState({ kind: "saving" });
    try {
      await createApiClient(apiUrl).createCapture(rawText);
      setState({ kind: "saved" });
      window.setTimeout(onClose, 1200);
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "Không lưu được capture." });
    }
  };

  const appendTag = (tag: string) => {
    const clean = tag.replace(/^[^\p{L}]+/u, "").trim();
    setText((value) => (value ? `${value}\n${clean}: ` : `${clean}: `));
    textareaRef.current?.focus();
  };

  const percent = Math.min(100, (text.length / MAX_LENGTH) * 100);

  const sheet = (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center" role="dialog" aria-label="Brain Dump">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }} onClick={onClose} />

      <div
        className="relative w-full flex flex-col braindump-sheet"
        style={{
          background: "var(--surface)",
          borderRadius: "28px 28px 0 0",
          maxHeight: "94vh",
          border: "1px solid var(--border)",
          borderBottom: "none",
          boxShadow: "var(--shadow-float)"
        }}
      >
        <style>{`
          @media (min-width: 768px) {
            .braindump-sheet {
              border-radius: 28px !important;
              max-width: 540px !important;
              max-height: 90vh !important;
              border-bottom: 1px solid var(--border) !important;
            }
          }
        `}</style>

        <div className="flex justify-center pt-3.5 flex-shrink-0 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--border-2)" }} />
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-6 md:px-6">
          <div className="flex items-center justify-between pt-4 pb-3">
            <button type="button" onClick={onClose} aria-label="Đóng Brain Dump" className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-2)", color: "var(--text-2)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
            <span className="text-sm font-bold" style={{ color: "var(--text)" }}>Brain Dump</span>
            <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
              <circle cx="16" cy="16" r="12" fill="none" stroke="var(--border)" strokeWidth="2.5" />
              <circle
                cx="16"
                cy="16"
                r="12"
                fill="none"
                stroke={text.length > 1800 ? "var(--red)" : "var(--primary)"}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${(percent / 100) * 75.4} 75.4`}
                style={{ transform: "rotate(-90deg)", transformOrigin: "16px 16px", transition: "stroke-dasharray 0.3s" }}
              />
            </svg>
          </div>

          <div className="mb-5">
            <h2 className="text-[24px] leading-snug mb-1 font-display" style={{ color: "var(--text)" }}>Ném hết ra ngoài.</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
              Đừng sắp xếp, đừng lọc. Cứ viết hết — LifeOS chỉ lưu nguyên văn, không tự diễn giải hay biến nó thành cam kết.
            </p>
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            maxLength={MAX_LENGTH}
            onChange={(event) => {
              setText(event.target.value);
              if (state.kind === "error") setState({ kind: "editing" });
            }}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void save();
            }}
            rows={8}
            aria-label="Nội dung Brain Dump"
            className="w-full rounded-2xl p-4 text-sm outline-none resize-none"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
            placeholder="Đang có gì trong đầu?"
          />

          <div className="flex gap-1.5 flex-wrap mt-3">
            {TAG_SUGGESTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => appendTag(tag)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl"
                style={{ background: "var(--bg-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
              >
                {tag}
              </button>
            ))}
          </div>

          {state.kind === "error" ? (
            <p className="text-xs mt-3 px-3.5 py-3 rounded-2xl" role="alert" style={{ background: "var(--red-bg)", color: "var(--red)" }}>
              {state.message}
            </p>
          ) : null}

          {state.kind === "saved" ? (
            <p className="text-xs mt-3 px-3.5 py-3 rounded-2xl" role="status" style={{ background: "var(--green-bg)", color: "var(--green)" }}>
              Đã lưu vào hộp chờ. Không có gì bị kích hoạt tự động.{" "}
              <a href="/inbox" style={{ color: "var(--green)", textDecoration: "underline" }}>Xem hộp chờ</a>
            </p>
          ) : null}

          <button
            type="button"
            disabled={text.trim().length === 0 || state.kind === "saving" || state.kind === "saved"}
            onClick={() => void save()}
            className="btn-primary-action w-full h-12 rounded-2xl mt-4 font-display text-sm"
            style={{ opacity: text.trim().length === 0 ? 0.5 : 1 }}
          >
            {state.kind === "saving" ? "Đang lưu…" : "Lưu capture"}
          </button>
          <p className="text-[11px] text-center mt-2" style={{ color: "var(--text-3)" }}>
            ⌘/Ctrl + Enter để lưu nhanh · Esc để đóng
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}

/** Floating capture button, available from every screen like in the prototype. */
export function BrainDumpButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Mở Brain Dump"
      className="fixed rounded-full flex items-center justify-center"
      style={{
        right: 18,
        bottom: 86,
        width: 56,
        height: 56,
        background: "var(--primary)",
        color: "var(--primary-fg)",
        boxShadow: "var(--shadow-float)",
        zIndex: 40
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </button>
  );
}
