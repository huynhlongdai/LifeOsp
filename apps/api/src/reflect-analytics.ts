import { findOrCreatePreferences, findReflectAnalytics, type DatabaseClient } from "@lifeos/db";
import { buildReflectAnalytics, type ReflectAnalyticsView } from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

type ReflectAnalyticsErrorView = { error: "unavailable" | "unauthenticated" | "invalid_offset"; message: string };

export function registerReflectAnalyticsRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.get<{ Querystring: { tzOffsetMinutes?: string } }>(
    "/v1/reflect/analytics",
    async (request, reply): Promise<ReflectAnalyticsView | ReflectAnalyticsErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Reflect storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const raw = request.query.tzOffsetMinutes;
      const tzOffsetMinutes = raw === undefined ? 0 : Number.parseInt(raw, 10);
      if (!Number.isInteger(tzOffsetMinutes) || tzOffsetMinutes < -840 || tzOffsetMinutes > 840) {
        reply.code(400);
        return { error: "invalid_offset", message: "tzOffsetMinutes must be between -840 and 840" };
      }

      const [facts, preferences] = await Promise.all([
        findReflectAnalytics(database, userId, tzOffsetMinutes),
        findOrCreatePreferences(database, userId)
      ]);

      return buildReflectAnalytics({
        tzOffsetMinutes,
        ...facts,
        preferences: {
          workStartMinute: preferences.workStartMinute,
          workEndMinute: preferences.workEndMinute,
          focusMinutes: preferences.focusMinutes
        }
      });
    }
  );
}
