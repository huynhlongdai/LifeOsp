import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createApiClient } from "./api";

const MAX_LENGTH = 2000;

const TAG_SUGGESTIONS = ["💡 Ý tưởng", "📁 Dự án", "🎯 Mục tiêu", "😰 Nỗi lo", "💼 Công việc", "❓ Thắc mắc"];

/**
 * Brain Dump writes straight to /v1/captures. It never interprets, sorts or promotes
 * the text — Clarity Reset stays the only place where a capture becomes a commitment.
 * All three prototype modes work: typing, dictation through the browser speech API
 * (the transcript lands in the same text) and text files read in the browser. PDFs and
 * images are refused with a clear message instead of pretending to be understood.
 */
type InputMode = "write" | "speak" | "file";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>; resultIndex: number }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function createRecognition(): SpeechRecognitionLike | null {
  const globalWindow = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Recognition = globalWindow.SpeechRecognition ?? globalWindow.webkitSpeechRecognition;
  return Recognition ? new Recognition() : null;
}

const TEXT_FILE_PATTERN = /\.(txt|md|markdown|csv|json|log)$/i;

export function BrainDumpSheet({ apiUrl, onClose }: { apiUrl: string; onClose: () => void }) {
  const [mode, setMode] = useState<InputMode>("write");
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [text, setText] = useState("");
  const [state, setState] = useState<{ kind: "editing" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string }>({
    kind: "editing"
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "write") textareaRef.current?.focus();
  }, [mode]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

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

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = createRecognition();
    if (!recognition) {
      setNotice("Trình duyệt này không hỗ trợ nhận giọng nói. Bạn gõ ở tab Viết nhé.");
      return;
    }
    recognition.lang = "vi-VN";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const alternative = result?.[0];
        if (result?.isFinal && alternative) transcript += `${alternative.transcript} `;
      }
      if (transcript.trim().length === 0) return;
      setText((value) => `${value}${value && !value.endsWith("\n") ? " " : ""}${transcript.trim()}`.slice(0, MAX_LENGTH));
    };
    recognition.onerror = (event) => {
      setNotice(
        event.error === "not-allowed"
          ? "Chưa được cấp quyền micro. Cho phép micro rồi thử lại."
          : "Không nhận được giọng nói. Bạn thử lại hoặc gõ ở tab Viết."
      );
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setNotice(null);
    recognition.start();
    setListening(true);
  };

  const readFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const readable: string[] = [];
    const skipped: string[] = [];
    for (const file of Array.from(files)) {
      if (!TEXT_FILE_PATTERN.test(file.name)) {
        skipped.push(file.name);
        continue;
      }
      const content = await file.text();
      readable.push(`--- ${file.name} ---\n${content.trim()}`);
    }
    if (readable.length > 0) {
      setText((value) => `${value ? `${value}\n\n` : ""}${readable.join("\n\n")}`.slice(0, MAX_LENGTH));
      setMode("write");
    }
    setNotice(
      skipped.length > 0
        ? `Chưa đọc được: ${skipped.join(", ")}. Hiện chỉ đọc tệp văn bản (.txt, .md, .csv, .json, .log) — PDF và ảnh cần backend trích xuất, LifeOS chưa có.`
        : null
    );
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

          <div className="flex gap-1.5 mb-4 p-1.5 rounded-2xl" style={{ background: "var(--bg-2)" }} role="tablist" aria-label="Cách ghi">
            {([
              { id: "write" as InputMode, label: "Viết", icon: "✏️" },
              { id: "speak" as InputMode, label: "Nói", icon: "🎙" },
              { id: "file" as InputMode, label: "Tệp", icon: "📎" }
            ]).map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => {
                  setMode(id);
                  setNotice(null);
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
                style={{
                  background: mode === id ? "var(--card)" : "transparent",
                  color: mode === id ? "var(--text)" : "var(--text-3)",
                  boxShadow: mode === id ? "var(--shadow-card)" : "none"
                }}
              >
                <span className="text-base" aria-hidden="true">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {mode === "write" ? (
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
              className="w-full rounded-2xl p-4 text-sm outline-none resize-none leading-relaxed"
              style={{
                background: "var(--bg)",
                border: `1.5px solid ${text.length > 0 ? "var(--primary-border)" : "var(--border)"}`,
                color: "var(--text)",
                minHeight: 180
              }}
              placeholder={"Tôi muốn kiếm thêm thu nhập online...\nTôi đang lo về dự án X...\nÝ tưởng app mới..."}
            />
          ) : null}

          {mode === "speak" ? (
            <div
              className="rounded-2xl flex flex-col items-center justify-center gap-4 p-5"
              style={{ minHeight: 180, background: "var(--bg)", border: "1.5px solid var(--border)" }}
            >
              <button
                type="button"
                onClick={toggleListening}
                aria-label={listening ? "Dừng ghi giọng nói" : "Bắt đầu ghi giọng nói"}
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: listening ? "linear-gradient(135deg, #dc2626, #9b1c1c)" : "var(--primary)",
                  boxShadow: listening ? "0 0 0 12px rgba(220,38,38,0.15)" : "0 4px 24px rgba(0,0,0,0.30)"
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2a3 3 0 013 3v7a3 3 0 01-6 0V5a3 3 0 013-3z" fill="white" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3M8 22h8" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                </svg>
              </button>
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {listening ? "Đang nghe…" : "Nhấn để nói"}
              </p>
              <p className="text-xs text-center px-4" style={{ color: "var(--text-3)" }}>
                Giọng nói được chuyển thành chữ ngay trên máy bạn, rồi lưu như một capture bình thường.
              </p>
              {text.trim().length > 0 ? (
                <p className="text-xs w-full rounded-xl p-3 whitespace-pre-wrap" style={{ background: "var(--bg-2)", color: "var(--text-2)" }}>
                  {text}
                </p>
              ) : null}
            </div>
          ) : null}

          {mode === "file" ? (
            <div
              className="rounded-2xl flex flex-col items-center justify-center gap-3 p-5"
              style={{ minHeight: 180, background: "var(--bg)", border: "2px dashed var(--border-2)" }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void readFiles(event.dataTransfer.files);
              }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--primary-bg)" }} aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M12 16V4m-4 8l4-4 4 4" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 20h16" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Kéo thả tệp vào đây</p>
              <p className="text-xs text-center" style={{ color: "var(--text-3)" }}>
                Tệp văn bản (.txt, .md, .csv, .json, .log) — nội dung được đọc vào ô Viết để bạn xem lại trước khi lưu.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.md,.markdown,.csv,.json,.log,text/plain"
                className="sr-only"
                aria-label="Chọn tệp"
                onChange={(event) => void readFiles(event.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold px-4 py-2 rounded-xl"
                style={{ background: "var(--primary-bg)", color: "var(--primary)" }}
              >
                Chọn tệp
              </button>
            </div>
          ) : null}

          {notice ? (
            <p className="text-xs mt-3 px-3.5 py-3 rounded-2xl" role="status" style={{ background: "var(--amber-bg)", color: "var(--amber)" }}>
              {notice}
            </p>
          ) : null}

          <p className="text-[10px] font-bold tracking-widest mt-4 mb-2" style={{ color: "var(--text-3)" }}>GỢI Ý TAG NHANH</p>
          <div className="flex gap-1.5 flex-wrap">
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
