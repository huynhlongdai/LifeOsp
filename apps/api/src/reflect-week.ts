import { findReflectWeek, type DatabaseClient } from "@lifeos/db";
import type { ReflectWeekView } from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

type ReflectWeekErrorView = { error: "unavailable" | "unauthenticated" | "invalid_offset"; message: string };

export function registerReflectWeekRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.get<{ Querystring: { tzOffsetMinutes?: string } }>(
    "/v1/reflect/week",
    async (request, reply): Promise<ReflectWeekView | ReflectWeekErrorView> => {
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

      const days = await findReflectWeek(database, userId, tzOffsetMinutes);
      return {
        tzOffsetMinutes,
        days,
        totals: {
          focusMinutes: days.reduce((sum, day) => sum + day.focusMinutes, 0),
          actionsCompleted: days.reduce((sum, day) => sum + day.actionsCompleted, 0),
          closedDays: days.filter((day) => day.closed).length
        }
      };
    }
  );
}
