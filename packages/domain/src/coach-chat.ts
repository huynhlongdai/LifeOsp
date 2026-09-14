export type CoachChatMessage = { role: "user" | "assistant"; content: string };

export type CoachChatRequest = { messages: CoachChatMessage[] };

export type CoachChatReply = { reply: string; provider: string; model: string };

export type CoachChatError = { kind: "invalid_chat_request"; message: string };

const MAX_MESSAGES = 20;
const MAX_LENGTH = 2000;

export function isCoachChatError(value: CoachChatRequest | CoachChatError): value is CoachChatError {
  return "kind" in value && value.kind === "invalid_chat_request";
}

/**
 * Accepts a short conversation. The last message must come from the user so the model always
 * answers a real question instead of continuing its own text.
 */
export function parseCoachChatRequest(input: unknown): CoachChatRequest | CoachChatError {
  if (typeof input !== "object" || input === null) {
    return { kind: "invalid_chat_request", message: "Nội dung gửi lên không hợp lệ." };
  }
  const raw = (input as { messages?: unknown }).messages;
  if (!Array.isArray(raw) || raw.length === 0) {
    return { kind: "invalid_chat_request", message: "Cần ít nhất một tin nhắn." };
  }
  if (raw.length > MAX_MESSAGES) {
    return { kind: "invalid_chat_request", message: `Tối đa ${MAX_MESSAGES} tin nhắn mỗi lần gửi.` };
  }

  const messages: CoachChatMessage[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) {
      return { kind: "invalid_chat_request", message: "Tin nhắn không hợp lệ." };
    }
    const role = (entry as { role?: unknown }).role;
    const content = (entry as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") {
      return { kind: "invalid_chat_request", message: "Vai trò tin nhắn phải là user hoặc assistant." };
    }
    if (typeof content !== "string" || content.trim() === "") {
      return { kind: "invalid_chat_request", message: "Tin nhắn không được để trống." };
    }
    if (content.length > MAX_LENGTH) {
      return { kind: "invalid_chat_request", message: `Tin nhắn tối đa ${MAX_LENGTH} ký tự.` };
    }
    messages.push({ role, content: content.trim() });
  }

  if (messages[messages.length - 1]?.role !== "user") {
    return { kind: "invalid_chat_request", message: "Tin nhắn cuối cùng phải là của người dùng." };
  }

  return { messages };
}
