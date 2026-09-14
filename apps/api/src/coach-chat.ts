import { findCoachFacts, findOrCreatePreferences, parseWorkDays, type DatabaseClient } from "@lifeos/db";
import {
  computeLifeScore,
  parseCoachChatRequest,
  isCoachChatError,
  DEFAULT_AI_MODELS,
  type CoachChatReply
} from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";
import { loadAiCredentials } from "./admin-settings.js";

type ChatErrorView = {
  error: "unavailable" | "unauthenticated" | "invalid_request" | "ai_not_configured" | "ai_failed";
  message: string;
};

/**
 * The coach chat only ever sees numbers that were actually stored for this user. The prompt
 * forbids inventing figures, so an answer either cites the recorded evidence or says the data
 * is missing — the same rule the rest of LifeOS follows.
 */
function buildSystemPrompt(evidence: string): string {
  return [
    "Bạn là AI Coach của LifeOS, trả lời bằng tiếng Việt, ngắn gọn và thực tế.",
    "Chỉ dùng số liệu trong phần DỮ LIỆU dưới đây. Tuyệt đối không bịa thêm con số, ngày tháng hay sự kiện.",
    "Nếu dữ liệu không đủ để trả lời, hãy nói thẳng là chưa đủ dữ liệu và gợi ý người dùng cần ghi nhận gì.",
    "Bạn có thể đề xuất, nhưng không được coi bất cứ việc gì là đã cam kết — người dùng mới là người quyết định.",
    "",
    "DỮ LIỆU:",
    evidence
  ].join("\n");
}

/**
 * One call shape for OpenAI and for any OpenAI-compatible endpoint the user configures
 * (OpenRouter, Groq, Together, a local Ollama/vLLM). Only the base URL changes.
 */
async function callOpenAiCompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 500,
      messages: [{ role: "system", content: system }, ...messages]
    })
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 200);
    throw new Error(`Nhà cung cấp trả về ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Nhà cung cấp không trả về nội dung");
  return text;
}

async function callAnthropic(
  apiKey: string,
  model: string,
  system: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({ model, max_tokens: 500, temperature: 0.3, system, messages })
  });
  if (!response.ok) throw new Error(`Anthropic trả về ${response.status}`);
  const body = (await response.json()) as { content?: { text?: string }[] };
  const text = body.content?.map((part) => part.text ?? "").join("").trim();
  if (!text) throw new Error("Anthropic không trả về nội dung");
  return text;
}

export function registerCoachChatRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.post("/v1/coach/chat", async (request, reply): Promise<CoachChatReply | ChatErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "Coach storage is unavailable" };
    }

    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }

    const parsed = parseCoachChatRequest(request.body);
    if (isCoachChatError(parsed)) {
      reply.code(400);
      return { error: "invalid_request", message: parsed.message };
    }

    const credentials = await loadAiCredentials(database, userId);
    if (!credentials) {
      reply.code(409);
      return {
        error: "ai_not_configured",
        message: "Chưa có API key AI. Vào Admin → Cài đặt AI để thêm key rồi thử lại."
      };
    }

    const [facts, preferences] = await Promise.all([
      findCoachFacts(database, userId),
      findOrCreatePreferences(database, userId)
    ]);
    const lifeScore = computeLifeScore({
      actionsCompletedLast7Days: facts.actionsCompletedLast7Days,
      actionsPartialLast7Days: facts.actionsPartialLast7Days,
      actionsPostponedLast7Days: facts.actionsPostponedLast7Days,
      focusMinutesLast7Days: facts.focusMinutesLast7Days,
      focusMinutesGoalPerDay: preferences.focusMinutes * 3,
      outcomeActionsTotal: facts.outcomeActionsTotal,
      outcomeActionsCompleted: facts.outcomeActionsCompleted,
      dailyClosesLast7Days: facts.dailyClosesLast7Days
    });

    const evidence = [
      `- Action 7 ngày: xong ${facts.actionsCompletedLast7Days}, một phần ${facts.actionsPartialLast7Days}, hoãn ${facts.actionsPostponedLast7Days}`,
      `- Focus 7 ngày: ${facts.focusMinutesLast7Days} phút / ${facts.focusSessionsLast7Days} phiên, bị ngắt ${facts.interruptedSessionsLast7Days}`,
      `- Chốt ngày 7 ngày: ${facts.dailyClosesLast7Days}`,
      `- Outcome: ${facts.outcomeActionsCompleted}/${facts.outcomeActionsTotal} action đã xong`,
      facts.bestFocusHour === null ? "- Khung giờ focus tốt nhất: chưa đủ dữ liệu" : `- Khung giờ focus tốt nhất: ${facts.bestFocusHour}h`,
      lifeScore.score === null ? "- Điểm cuộc sống: chưa đủ dữ liệu" : `- Điểm cuộc sống: ${lifeScore.score}/100`,
      `- Giờ làm việc: ${parseWorkDays(preferences.workDays).length} ngày/tuần, mục tiêu focus ${preferences.focusMinutes} phút/phiên`
    ].join("\n");

    const model = credentials.model ?? DEFAULT_AI_MODELS[credentials.provider];
    if (!model) {
      reply.code(409);
      return {
        error: "ai_not_configured",
        message: "Provider tuỳ chỉnh cần tên model. Vào Admin → Cài đặt AI để điền model rồi thử lại."
      };
    }
    if (credentials.provider === "custom" && !credentials.baseUrl) {
      reply.code(409);
      return {
        error: "ai_not_configured",
        message: "Provider tuỳ chỉnh cần Base URL. Vào Admin → Cài đặt AI để điền rồi thử lại."
      };
    }
    const system = buildSystemPrompt(evidence);

    try {
      const text =
        credentials.provider === "anthropic"
          ? await callAnthropic(credentials.apiKey, model, system, parsed.messages)
          : await callOpenAiCompatible(
              credentials.provider === "custom" ? credentials.baseUrl! : "https://api.openai.com/v1",
              credentials.apiKey,
              model,
              system,
              parsed.messages
            );
      return { reply: text, provider: credentials.provider, model };
    } catch (error) {
      request.log.error({ err: error }, "coach chat failed");
      reply.code(502);
      return {
        error: "ai_failed",
        message: error instanceof Error ? error.message : "Không gọi được nhà cung cấp AI."
      };
    }
  });
}
