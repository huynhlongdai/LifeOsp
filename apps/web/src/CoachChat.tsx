import { useMemo, useRef, useState } from "react";
import type { CoachChatMessage } from "@lifeos/domain";
import { ApiRequestError, createApiClient } from "./api";

const CARD = { background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" } as const;

/**
 * Chat with the coach. The answer comes from the provider configured in Admin and is grounded
 * in the user's stored numbers; when no key is configured the panel says so instead of
 * inventing a reply.
 */
export function CoachChat({ apiUrl }: { apiUrl: string }) {
  const api = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [messages, setMessages] = useState<CoachChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const send = async () => {
    const text = input.trim();
    if (text === "" || pending) return;
    const next: CoachChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setPending(true);
    setError(null);
    try {
      const answer = await api.sendCoachMessage(next);
      setMessages([...next, { role: "assistant", content: answer.reply }]);
    } catch (reason) {
      const message =
        reason instanceof ApiRequestError && typeof (reason.body as { message?: string })?.message === "string"
          ? (reason.body as { message: string }).message
          : reason instanceof Error
            ? reason.message
            : "Không gửi được tin nhắn.";
      setError(message);
    } finally {
      setPending(false);
      window.setTimeout(() => endRef.current?.scrollIntoView({ block: "end" }), 0);
    }
  };

  return (
    <div className="flex flex-col" style={{ minHeight: 380 }}>
      <div className="flex-1 space-y-3 mb-3">
        {messages.length === 0 ? (
          <div className="rounded-2xl p-4" style={CARD}>
            <p className="text-sm" style={{ color: "var(--text-2)" }}>
              Hỏi AI Coach về dữ liệu của bạn — ví dụ “tuần này tôi focus thế nào?”. Coach chỉ trả lời dựa trên số liệu
              bạn đã ghi nhận, không tự bịa con số.
            </p>
          </div>
        ) : null}

        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            {message.role === "assistant" ? (
              <span
                className="w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center mr-2 mt-0.5 text-[11px]"
                style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
                aria-hidden="true"
              >
                ★
              </span>
            ) : null}
            <div
              className="px-3.5 py-2.5 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap"
              style={{
                background: message.role === "user" ? "var(--primary)" : "var(--card)",
                color: message.role === "user" ? "var(--primary-fg)" : "var(--text)",
                border: message.role === "assistant" ? "1px solid var(--border)" : "none",
                borderRadius: message.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px"
              }}
            >
              {message.content}
            </div>
          </div>
        ))}

        {pending ? (
          <p className="text-xs" role="status" style={{ color: "var(--text-3)" }}>Coach đang trả lời…</p>
        ) : null}

        {error ? (
          <p className="text-xs px-3.5 py-3 rounded-2xl" role="alert" style={{ background: "var(--red-bg)", color: "var(--red)" }}>
            {error}
          </p>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void send();
          }}
          placeholder="Hỏi AI Coach..."
          aria-label="Hỏi AI Coach"
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--text)" }}
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={pending || input.trim() === ""}
          aria-label="Gửi"
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: input.trim() ? "var(--primary)" : "var(--bg-2)",
            color: input.trim() ? "var(--primary-fg)" : "var(--text-3)"
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
