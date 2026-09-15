import { completeWeeklyReset, readWeeklyReset, type DatabaseClient } from "@lifeos/db";
import { isValidLocalDate, isValidUtcOffsetMinutes, type WeeklyResetView } from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

export type WeeklyResetErrorView = {
  error: "unavailable" | "unauthenticated" | "invalid_request";
  message: string;
};

export type WeeklyResetCompletedView = { status: "completed"; completedAt: string };

// Weekly Reset (spec §13). V0 ships the chapters derivable from data
// already recorded (Reality, Movement, Next Week context) plus an explicit
// completion action; Pattern Candidates/Adjustment are named as not yet
// available (see packages/domain/src/weekly-reset.ts).
export function registerWeeklyResetRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.get<{ Querystring: { weekStart?: string; offsetMinutes?: string } }>(
    "/v1/weekly-reset",
    async (request, reply): Promise<WeeklyResetView | WeeklyResetErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Weekly Reset storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const weekStart = request.query.weekStart;
      const offsetMinutes = Number(request.query.offsetMinutes);
      if (!weekStart || !isValidLocalDate(weekStart) || !Number.isInteger(offsetMinutes) || !isValidUtcOffsetMinutes(offsetMinutes)) {
        reply.code(400);
        return { error: "invalid_request", message: "weekStart (YYYY-MM-DD) and offsetMinutes (getTimezoneOffset semantics) are required" };
      }

      const outcome = await readWeeklyReset(database, userId, weekStart, offsetMinutes, new Date());
      if (outcome.status === "invalid_range") {
        reply.code(400);
        return { error: "invalid_request", message: "weekStart/offsetMinutes did not resolve to a valid week range" };
      }
      return outcome.view;
    }
  );

  app.post<{ Body: { weekStart?: string; offsetMinutes?: number } }>(
    "/v1/weekly-reset/complete",
    async (request, reply): Promise<WeeklyResetCompletedView | WeeklyResetErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Weekly Reset storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const { weekStart, offsetMinutes } = request.body ?? {};
      if (!weekStart || !isValidLocalDate(weekStart) || typeof offsetMinutes !== "number" || !isValidUtcOffsetMinutes(offsetMinutes)) {
        reply.code(400);
        return { error: "invalid_request", message: "weekStart (YYYY-MM-DD) and offsetMinutes are required" };
      }

      const outcome = await completeWeeklyReset(database, userId, { weekStart, offsetMinutes }, new Date());
      if (outcome.status === "invalid_range") {
        reply.code(400);
        return { error: "invalid_request", message: "weekStart/offsetMinutes did not resolve to a valid week range" };
      }
      reply.code(201);
      return { status: "completed", completedAt: outcome.completedAt };
    }
  );
}
