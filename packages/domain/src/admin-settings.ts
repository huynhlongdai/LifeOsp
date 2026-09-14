export const AI_PROVIDERS = ["openai", "anthropic"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const DEFAULT_AI_MODELS: Record<AiProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest"
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
    else return { status: "invalid", message: "Nhà cung cấp AI phải là openai hoặc anthropic." };
  }

  if ("aiModel" in input) {
    if (input.aiModel === null) update.aiModel = null;
    else if (typeof input.aiModel === "string") {
      const model = input.aiModel.trim();
      if (model.length === 0) update.aiModel = null;
      else if (model.length > 80 || !/^[A-Za-z0-9._:-]+$/.test(model)) {
        return { status: "invalid", message: "Tên model không hợp lệ." };
      } else update.aiModel = model;
    } else return { status: "invalid", message: "Tên model không hợp lệ." };
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

/** Shows only the last 4 characters of a key, never more. */
export function maskKey(key: string): string {
  const tail = key.slice(-4);
  return `••••${tail}`;
}

export function isAdminSettingsError(value: AdminSettingsUpdateInput | AdminSettingsParseError): value is AdminSettingsParseError {
  return "status" in value && value.status === "invalid";
}
