import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import type { CaptureInputKind, CaptureView } from "@lifeos/domain";
import { ApiRequestError, createApiClient } from "./api";

// Global quick capture (PRODUCT_SURFACE_SPEC §1.3). Hard rule: never ask for a
// category before saving. Three ways in — write, speak, file — all end as one
// immutable Capture with raw text; the user may clarify later via
// /clarity?capture=<id>. Mode tabs follow the Figma Make Brain Dump modal
// (K3/K7 in FIGMA_MAKE_RECONCILIATION_V1); tag suggestions were dropped on purpose.

type Phase = "closed" | "editing" | "saving" | "saved";
type Mode = "write" | "speak" | "file";

const MAX_CHARS = 20_000;
const TEXT_FILE_PATTERN = /\.(txt|md|markdown|text|csv|json|log)$/i;

// Minimal typing for the Web Speech API (not in lib.dom for every TS config).
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function speechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function QuickCapture({ apiUrl }: { apiUrl: string }) {
  const api = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [phase, setPhase] = useState<Phase>("closed");
  const [mode, setMode] = useState<Mode>("write");
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [spokeAny, setSpokeAny] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [saved, setSaved] = useState<CaptureView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechSupported = useMemo(() => speechRecognitionCtor() !== null, []);

  useEffect(() => {
    if (phase === "editing" && mode === "write") textareaRef.current?.focus();
  }, [phase, mode]);

  useEffect(() => {
    if (phase === "closed") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && phase !== "saving") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  useEffect(() => () => stopListening(), []);

  const open = () => {
    setPhase("editing");
    setError(null);
    setNotice(null);
  };

  const reset = () => {
    setText("");
    setInterim("");
    setSaved(null);
    setSpokeAny(false);
    setFileName(null);
    setNotice(null);
    setMode("write");
  };

  const close = () => {
    stopListening();
    setPhase("closed");
    setError(null);
    if (saved) reset();
  };

  const appendText = (chunk: string) => {
    setText((current) => {
      const joined = current.trim().length === 0 ? chunk : `${current.replace(/\s+$/, "")}\n${chunk}`;
      return joined.slice(0, MAX_CHARS);
    });
  };

  // ---- Speak ----
  const startListening = () => {
    const Ctor = speechRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = "vi-VN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript ?? "";
        if (!transcript) continue;
        if (result?.isFinal) {
          appendText(transcript.trim());
          setSpokeAny(true);
        } else {
          interimText += transcript;
        }
      }
      setInterim(interimText);
    };
    recognition.onerror = (event) => {
      setListening(false);
      setInterim("");
      const code = event.error ?? "";
      setError(
        code === "not-allowed" || code === "service-not-allowed"
          ? "Trình duyệt chưa cho phép dùng micro. Bật quyền micro rồi thử lại, hoặc chuyển sang Viết."
          : code === "no-speech"
            ? "Tôi chưa nghe được gì. Thử nói lại gần micro hơn."
            : "Nhận giọng nói bị gián đoạn. Những gì đã nghe vẫn còn trong ô bên dưới."
      );
    };
    recognition.onend = () => {
      setListening(false);
      setInterim("");
    };
    recognitionRef.current = recognition;
    setError(null);
    setListening(true);
    recognition.start();
  };

  function stopListening() {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
    }
    setListening(false);
    setInterim("");
  }

  // ---- File ----
  const readFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    const accepted = list.filter((file) => TEXT_FILE_PATTERN.test(file.name) || file.type.startsWith("text/"));
    const rejected = list.filter((file) => !accepted.includes(file));
    if (rejected.length > 0) {
      setNotice(
        `Bước này tôi chỉ đọc được tệp văn bản (.txt, .md, .csv…). ${rejected.map((f) => f.name).join(", ")} sẽ cần bước đọc PDF/ảnh/ghi âm ở phiên bản sau.`
      );
    }
    for (const file of accepted) {
      const reader = new FileReader();
      reader.onload = () => {
        const content = typeof reader.result === "string" ? reader.result.trim() : "";
        if (!content) return;
        appendText(content);
        setFileName((current) => (current ? `${current}, ${file.name}` : file.name));
        setMode("write");
      };
      reader.onerror = () => setError(`Không đọc được ${file.name}. Thử mở tệp và dán nội dung vào ô Viết.`);
      reader.readAsText(file);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    readFiles(event.dataTransfer.files);
  };

  // ---- Save ----
  const save = async () => {
    const rawText = text.trim();
    if (!rawText) return;
    stopListening();
    setPhase("saving");
    setError(null);
    try {
      const session = await api.bootstrapSession();
      if (session.status !== "active") throw new Error("Không mở được phiên LifeOS để lưu.");
      const kind: CaptureInputKind = spokeAny ? "voice_transcript" : "quick_note";
      const capture = await api.createCapture(rawText, kind);
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
    reset();
    setPhase("editing");
  };

  const busy = phase === "saving";

  return (
    <>
      <button className="quick-capture-trigger" type="button" onClick={open} aria-haspopup="dialog" aria-expanded={phase !== "closed"}>
        <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>Ghi nhanh</span>
      </button>

      {phase !== "closed" ? (
        <div className="quick-capture-backdrop" onClick={busy ? undefined : close}>
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
                <p>
                  {saved.kind === "voice_transcript" ? "Tôi đã ghi lại lời bạn nói, nguyên văn. " : ""}
                  Khi nào muốn, LifeOS sẽ giúp bạn sắp xếp nó. Không bắt buộc ngay.
                </p>
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

                <div className="quick-capture-modes" role="tablist" aria-label="Cách ghi">
                  {(
                    [
                      { id: "write", label: "Viết", icon: "M4 20h4l10-10-4-4L4 16z M13 7l4 4" },
                      { id: "speak", label: "Nói", icon: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z M6 11a6 6 0 0 0 12 0 M12 17v4" },
                      { id: "file", label: "Tệp", icon: "M12 16V5 M8 9l4-4 4 4 M5 19h14" }
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={mode === tab.id}
                      className={mode === tab.id ? "quick-capture-mode selected" : "quick-capture-mode"}
                      disabled={busy}
                      onClick={() => {
                        if (tab.id !== "speak") stopListening();
                        setMode(tab.id);
                      }}
                    >
                      <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={tab.icon} /></svg>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {mode === "write" ? (
                  <textarea
                    ref={textareaRef}
                    className="quick-capture-input"
                    value={text}
                    rows={5}
                    maxLength={MAX_CHARS}
                    placeholder="Vd: nhớ hỏi Minh về hợp đồng; ý tưởng podcast về lịch sử; mình đang tránh việc gì nhỉ…"
                    disabled={busy}
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={(event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void save();
                    }}
                  />
                ) : null}

                {mode === "speak" ? (
                  <div className={listening ? "quick-capture-speak listening" : "quick-capture-speak"}>
                    {speechSupported ? (
                      <>
                        <button
                          type="button"
                          className="quick-capture-mic"
                          aria-pressed={listening}
                          aria-label={listening ? "Dừng nghe" : "Bắt đầu nói"}
                          disabled={busy}
                          onClick={() => (listening ? stopListening() : startListening())}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" />
                            <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" />
                          </svg>
                        </button>
                        <strong>{listening ? "Đang nghe…" : text.trim() ? "Nhấn để nói tiếp" : "Nhấn để nói"}</strong>
                        <small>Nói tự nhiên, tiếng Việt. Tôi ghi lại nguyên lời, không tóm tắt.</small>
                        {interim ? <p className="quick-capture-interim">{interim}</p> : null}
                        {text.trim() ? <blockquote className="quick-capture-echo">{text}</blockquote> : null}
                      </>
                    ) : (
                      <>
                        <strong>Trình duyệt này chưa nhận được giọng nói.</strong>
                        <small>Bạn có thể dùng ghi âm của máy rồi dán nội dung vào ô Viết — hoặc mở bằng Chrome/Safari.</small>
                        <button className="secondary-button" type="button" onClick={() => setMode("write")}>Chuyển sang Viết</button>
                      </>
                    )}
                  </div>
                ) : null}

                {mode === "file" ? (
                  <div
                    className={dragging ? "quick-capture-drop dragging" : "quick-capture-drop"}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                  >
                    <strong>Kéo tệp vào đây, hoặc chọn tệp.</strong>
                    <small>Tệp văn bản (.txt, .md, .csv…) sẽ được đọc nguyên văn vào Ghi nhanh. PDF, ảnh, ghi âm: bước sau.</small>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.markdown,.text,.csv,.json,.log,text/*"
                      multiple
                      hidden
                      onChange={(event) => {
                        if (event.target.files) readFiles(event.target.files);
                        event.target.value = "";
                      }}
                    />
                    <button className="secondary-button" type="button" disabled={busy} onClick={() => fileInputRef.current?.click()}>
                      Chọn tệp
                    </button>
                    {fileName ? <p className="quick-capture-filename">Đã đọc: {fileName}</p> : null}
                    {text.trim() ? <blockquote className="quick-capture-echo">{text}</blockquote> : null}
                  </div>
                ) : null}

                {notice ? <p className="quick-capture-notice">{notice}</p> : null}
                {error ? <p className="now-inline-error" role="alert">{error}</p> : null}

                <div className="quick-capture-actions">
                  <button className="primary-button" type="button" disabled={busy || text.trim().length === 0} onClick={() => void save()}>
                    {busy ? "Đang lưu…" : "Lưu lại"}
                  </button>
                  <button className="text-button" type="button" disabled={busy} onClick={close}>Đóng</button>
                  <small className="quick-capture-hint">
                    {mode === "write" ? "⌘/Ctrl + Enter để lưu" : `${text.trim().length} ký tự sẵn sàng lưu`}
                  </small>
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
