import { findOrCreatePreferences, parseWorkDays, updatePreferences, type DatabaseClient, type UserPreferencesRow } from "@lifeos/db";
import { parseUserPreferencesUpdate, type UserPreferencesView } from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

type PreferencesErrorView = {
  error: "unavailable" | "unauthenticated" | "invalid_preferences";
  message: string;
};

export function registerPreferencesRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.get("/v1/me/preferences", async (request, reply): Promise<UserPreferencesView | PreferencesErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "Preferences storage is unavailable" };
    }
    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }
    return toView(await findOrCreatePreferences(database, userId));
  });

  app.patch("/v1/me/preferences", async (request, reply): Promise<UserPreferencesView | PreferencesErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "Preferences storage is unavailable" };
    }
    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }

    const update = parseUserPreferencesUpdate(request.body);
    if (!update) {
      reply.code(400);
      return { error: "invalid_preferences", message: "Preferences do not match the LifeOS contract" };
    }

    const result = await updatePreferences(database, userId, update);
    if ("status" in result) {
      reply.code(400);
      return { error: "invalid_preferences", message: "Giờ bắt đầu phải sớm hơn giờ kết thúc" };
    }
    return toView(result);
  });
}

function toView(row: UserPreferencesRow): UserPreferencesView {
  return {
    timezone: row.timezone,
    workStartMinute: row.workStartMinute,
    workEndMinute: row.workEndMinute,
    workDays: parseWorkDays(row.workDays),
    focusMinutes: row.focusMinutes,
    breakMinutes: row.breakMinutes,
    aiSuggestsActions: row.aiSuggestsActions,
    aiDailySummary: row.aiDailySummary,
    updatedAt: row.updatedAt.toISOString()
  };
}
