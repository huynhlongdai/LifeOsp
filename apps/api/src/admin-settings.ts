import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import {
  findOrCreateAppSettings,
  loadAdminStats,
  updateAppSettings,
  type AppSettingsRow,
  type DatabaseClient
} from "@lifeos/db";
import {
  isAdminSettingsError,
  maskKey,
  parseAdminSettingsUpdate,
  type AdminSettingsView,
  type AiProvider
} from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

type AdminErrorView = {
  error: "unavailable" | "unauthenticated" | "invalid_settings" | "key_storage_unavailable";
  message: string;
};

/**
 * Encryption for provider API keys. The secret comes from the server environment, so a
 * database dump alone never reveals a key. Without the secret the panel still works but
 * refuses to store keys instead of saving them in the clear.
 */
function secretKey(): Buffer | null {
  const secret = process.env.LIFEOS_SETTINGS_SECRET?.trim();
  if (!secret || secret.length < 16) return null;
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(payload: string, key: Buffer): string | null {
  const [ivRaw, tagRaw, dataRaw] = payload.split(".");
  if (!ivRaw || !tagRaw || !dataRaw) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivRaw, "base64"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataRaw, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Reads the stored provider key for server-side AI calls. Never send this to a client. */
export async function loadAiCredentials(
  database: DatabaseClient,
  userId: string
): Promise<{ provider: AiProvider; model: string | null; baseUrl: string | null; apiKey: string } | null> {
  const key = secretKey();
  if (!key) return null;
  const row = await findOrCreateAppSettings(database, userId);
  if (!row.aiProvider || !row.aiKeyCiphertext) return null;
  const apiKey = decryptSecret(row.aiKeyCiphertext, key);
  if (!apiKey) return null;
  return { provider: row.aiProvider as AiProvider, model: row.aiModel, baseUrl: row.aiBaseUrl, apiKey };
}

export function registerAdminSettingsRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.get("/v1/admin/settings", async (request, reply): Promise<AdminSettingsView | AdminErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "Admin settings storage is unavailable" };
    }
    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }
    const [row, stats] = await Promise.all([
      findOrCreateAppSettings(database, userId),
      loadAdminStats(database, userId)
    ]);
    return toView(row, stats);
  });

  app.put("/v1/admin/settings", async (request, reply): Promise<AdminSettingsView | AdminErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "Admin settings storage is unavailable" };
    }
    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }

    const parsed = parseAdminSettingsUpdate(request.body);
    if (isAdminSettingsError(parsed)) {
      reply.code(400);
      return { error: "invalid_settings", message: parsed.message };
    }

    const update: Parameters<typeof updateAppSettings>[2] = {};
    if (parsed.aiProvider !== undefined) update.aiProvider = parsed.aiProvider;
    if (parsed.aiModel !== undefined) update.aiModel = parsed.aiModel;
    if (parsed.aiBaseUrl !== undefined) update.aiBaseUrl = parsed.aiBaseUrl;

    if (parsed.aiApiKey !== undefined) {
      if (parsed.aiApiKey === null) {
        update.aiKeyCiphertext = null;
        update.aiKeyHint = null;
      } else {
        const key = secretKey();
        if (!key) {
          reply.code(503);
          return {
            error: "key_storage_unavailable",
            message: "Máy chủ chưa cấu hình LIFEOS_SETTINGS_SECRET nên chưa thể lưu API key an toàn."
          };
        }
        update.aiKeyCiphertext = encryptSecret(parsed.aiApiKey, key);
        update.aiKeyHint = maskKey(parsed.aiApiKey);
      }
    }

    const row = await updateAppSettings(database, userId, update);
    const stats = await loadAdminStats(database, userId);
    return toView(row, stats);
  });
}

function toView(row: AppSettingsRow, stats: AdminSettingsView["stats"]): AdminSettingsView {
  return {
    aiProvider: (row.aiProvider as AiProvider | null) ?? null,
    aiModel: row.aiModel,
    aiBaseUrl: row.aiBaseUrl,
    aiKeySet: Boolean(row.aiKeyCiphertext),
    aiKeyHint: row.aiKeyHint,
    keyStorageReady: secretKey() !== null,
    updatedAt: row.updatedAt.toISOString(),
    stats
  };
}
