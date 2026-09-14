export const AI_PROVIDERS = ["openai", "anthropic", "custom"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const DEFAULT_AI_MODELS: Record<AiProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
  custom: ""
};

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  custom: "Tuỳ chỉnh (OpenAI-compatible)"
};

export type AdminStatsView = {
  captures: number;
  actionsTotal: number;
  actionsCompleted: number;
  focusSessions: number;
  focusMinutes: number;
  incubatorItems: number;
  dailyCloses: number;
  lastActivityAt: string | null;
};

export type AdminSettingsView = {
  aiProvider: AiProvider | null;
  aiModel: string | null;
  /** Base URL of a custom OpenAI-compatible provider, e.g. https://openrouter.ai/api/v1 */
  aiBaseUrl: string | null;
  /** True when a key is stored. The key itself is never returned. */
  aiKeySet: boolean;
  /** Last 4 characters of the stored key, e.g. "••••ab12". */
  aiKeyHint: string | null;
  /** False when the server has no encryption secret, so keys cannot be stored safely. */
  keyStorageReady: boolean;
  updatedAt: string;
  stats: AdminStatsView;
};

export type AdminSettingsUpdateInput = {
  aiProvider?: AiProvider | null;
  aiModel?: string | null;
  aiBaseUrl?: string | null;
  /** Plaintext key to store, or null to delete the stored key. Omitted = unchanged. */
  aiApiKey?: string | null;
};

export type AdminSettingsParseError = {
  status: "invalid";
  message: string;
};

function isProvider(value: unknown): value is AiProvider {
  return typeof value === "string" && (AI_PROVIDERS as readonly string[]).includes(value);
}

/**
 * Validates an admin settings update. Key shape is only checked loosely (length and
 * charset) — the real proof is a live call to the provider, never a guessed format.
 */
export function parseAdminSettingsUpdate(body: unknown): AdminSettingsUpdateInput | AdminSettingsParseError {
  if (typeof body !== "object" || body === null) return { status: "invalid", message: "Nội dung không hợp lệ." };
  const input = body as Record<string, unknown>;
  const update: AdminSettingsUpdateInput = {};

  if ("aiProvider" in input) {
    if (input.aiProvider === null) update.aiProvider = null;
    else if (isProvider(input.aiProvider)) update.aiProvider = input.aiProvider;
    else return { status: "invalid", message: "Nhà cung cấp AI phải là openai, anthropic hoặc custom." };
  }

  if ("aiModel" in input) {
    if (input.aiModel === null) update.aiModel = null;
    else if (typeof input.aiModel === "string") {
      const model = input.aiModel.trim();
      if (model.length === 0) update.aiModel = null;
      else if (model.length > 120 || !/^[A-Za-z0-9._:\/-]+$/.test(model)) {
        return { status: "invalid", message: "Tên model không hợp lệ." };
      } else update.aiModel = model;
    } else return { status: "invalid", message: "Tên model không hợp lệ." };
  }

  if ("aiBaseUrl" in input) {
    if (input.aiBaseUrl === null) update.aiBaseUrl = null;
    else if (typeof input.aiBaseUrl === "string") {
      const raw = input.aiBaseUrl.trim();
      if (raw.length === 0) update.aiBaseUrl = null;
      else {
        const parsed = parseBaseUrl(raw);
        if (!parsed) {
          return {
            status: "invalid",
            message: "Base URL phải là địa chỉ http(s) hợp lệ, ví dụ https://openrouter.ai/api/v1."
          };
        }
        update.aiBaseUrl = parsed;
      }
    } else return { status: "invalid", message: "Base URL không hợp lệ." };
  }

  if (update.aiProvider === "custom" && update.aiBaseUrl === null) {
    return { status: "invalid", message: "Provider tuỳ chỉnh cần một Base URL." };
  }

  if ("aiApiKey" in input) {
    if (input.aiApiKey === null) update.aiApiKey = null;
    else if (typeof input.aiApiKey === "string") {
      const key = input.aiApiKey.trim();
      if (key.length === 0) update.aiApiKey = null;
      else if (key.length < 20 || key.length > 300 || /\s/.test(key)) {
        return { status: "invalid", message: "API key trông không hợp lệ (quá ngắn hoặc có khoảng trắng)." };
      } else update.aiApiKey = key;
    } else return { status: "invalid", message: "API key không hợp lệ." };
  }

  if (Object.keys(update).length === 0) return { status: "invalid", message: "Không có thay đổi nào." };
  return update;
}

/**
 * Accepts only absolute http(s) URLs and strips a trailing slash so the caller can append
 * "/chat/completions" without guessing. Anything else is rejected rather than repaired.
 */
export function parseBaseUrl(value: string): string | null {
  if (/\s/.test(value) || value.length > 300) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.search !== "" || url.hash !== "") return null;
  const text = url.toString().replace(/\/+$/, "");
  return text.length > 0 ? text : null;
}

/** Shows only the last 4 characters of a key, never more. */
export function maskKey(key: string): string {
  const tail = key.slice(-4);
  return `••••${tail}`;
}

export function isAdminSettingsError(value: AdminSettingsUpdateInput | AdminSettingsParseError): value is AdminSettingsParseError {
  return "status" in value && value.status === "invalid";
}
