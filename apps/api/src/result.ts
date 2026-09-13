import type { FastifyInstance } from "fastify";
import type { DatabaseClient } from "@lifeos/db";
import {
  recordActionResult,
  recordFocusResult,
  recordDailyClose,
  getDailyClose,
  getActionResults,
  getFocusResults,
  type ActionResultInput,
  type FocusResultInput,
  type DailyCloseInput
} from "@lifeos/db";
import { resolveActorUserId } from "./identity.js";
import type { ActionResultView, DailyCloseView, FocusResultView } from "@lifeos/domain";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NOTE_LENGTH = 2_000;

type ResultErrorView = {
  error:
    | "unavailable"
    | "unauthenticated"
    | "not_found"
    | "invalid_input"
    | "invalid_status"
    | "conflict";
  message: string;
};

export function registerResultRoutes(
  app: FastifyInstance,
  database: DatabaseClient | null
): void {
  app.post<{ Params: { actionId: string } }>(
    "/v1/actions/:actionId/results",
    async (request, reply): Promise<ActionResultView | ResultErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Result storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const { actionId } = request.params;
      if (!UUID_PATTERN.test(actionId)) {
        reply.code(400);
        return { error: "invalid_input", message: "actionId must be a UUID" };
      }

      const input = parseActionResultInput(request.body);
      if (!input) {
        reply.code(400);
        return { error: "invalid_input", message: "Result input does not match contract" };
      }

      try {
        const result = await recordActionResult(database, userId, {
          actionId,
          resultType: input.resultType,
          ...(input.note === undefined ? {} : { note: input.note })
        });
        reply.code(201);
        return result as ActionResultView;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("not found")) {
            reply.code(404);
            return { error: "not_found", message: error.message };
          }
          if (error.message.includes("cannot be recorded")) {
            reply.code(409);
            return { error: "invalid_status", message: error.message };
          }
        }
        request.log.error(error);
        reply.code(500);
        return { error: "invalid_input", message: "Failed to record action result" };
      }
    }
  );

  app.get<{ Params: { actionId: string } }>(
    "/v1/actions/:actionId/results",
    async (request, reply) => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Result storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const { actionId } = request.params;
      if (!UUID_PATTERN.test(actionId)) {
        reply.code(400);
        return { error: "invalid_input", message: "actionId must be a UUID" };
      }

      const results = await getActionResults(database, userId, actionId);
      return results;
    }
  );

  app.post<{ Params: { focusSessionId: string } }>(
    "/v1/focus-sessions/:focusSessionId/results",
    async (request, reply): Promise<FocusResultView | ResultErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Result storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const { focusSessionId } = request.params;
      if (!UUID_PATTERN.test(focusSessionId)) {
        reply.code(400);
        return { error: "invalid_input", message: "focusSessionId must be a UUID" };
      }

      const input = parseFocusResultInput(request.body);
      if (!input) {
        reply.code(400);
        return { error: "invalid_input", message: "Result input does not match contract" };
      }

      try {
        const result = await recordFocusResult(database, userId, {
          focusSessionId,
          resultType: input.resultType,
          ...(input.actualMinutes === undefined ? {} : { actualMinutes: input.actualMinutes }),
          ...(input.note === undefined ? {} : { note: input.note })
        });
        reply.code(201);
        return result as FocusResultView;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("not found")) {
            reply.code(404);
            return { error: "not_found", message: error.message };
          }
          if (error.message.includes("must be ended")) {
            reply.code(400);
            return { error: "invalid_status", message: error.message };
          }
          if (error.message.includes("must match") || error.message.includes("already been recorded")) {
            reply.code(409);
            return { error: "conflict", message: error.message };
          }
        }
        request.log.error(error);
        reply.code(500);
        return { error: "invalid_input", message: "Failed to record focus result" };
      }
    }
  );

  app.get<{ Params: { focusSessionId: string } }>(
    "/v1/focus-sessions/:focusSessionId/results",
    async (request, reply) => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Result storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const { focusSessionId } = request.params;
      if (!UUID_PATTERN.test(focusSessionId)) {
        reply.code(400);
        return { error: "invalid_input", message: "focusSessionId must be a UUID" };
      }

      const results = await getFocusResults(database, userId, focusSessionId);
      return results;
    }
  );

  app.post(
    "/v1/daily-closes",
    async (request, reply): Promise<DailyCloseView | ResultErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Result storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const input = parseDailyCloseInput(request.body);
      if (!input) {
        reply.code(400);
        return { error: "invalid_input", message: "Daily close input does not match contract" };
      }

      try {
        const dailyClose = await recordDailyClose(database, userId, {
          date: input.date,
          ...(input.note === undefined ? {} : { note: input.note })
        });
        reply.code(201);
        return dailyClose as DailyCloseView;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("unique constraint") || error.message.includes("duplicate")) {
            reply.code(409);
            return { error: "conflict", message: "Daily close already exists for this date" };
          }
        }
        request.log.error(error);
        reply.code(500);
        return { error: "invalid_input", message: "Failed to record daily close" };
      }
    }
  );

  app.get<{ Params: { date: string } }>(
    "/v1/daily-closes/:date",
    async (request, reply) => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Result storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const { date } = request.params;
      if (!isLocalDate(date)) {
        reply.code(400);
        return { error: "invalid_input", message: "date must be in YYYY-MM-DD format" };
      }

      const dailyClose = await getDailyClose(database, userId, date);
      if (!dailyClose) {
        reply.code(404);
        return { error: "not_found", message: "Daily close not found for this date" };
      }
      return dailyClose;
    }
  );
}

function parseActionResultInput(value: unknown): ActionResultInput | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => !["resultType", "note"].includes(key))) return null;

  const validTypes = ["completed", "partial", "postponed", "blocked", "dropped"];
  if (typeof value.resultType !== "string" || !validTypes.includes(value.resultType)) return null;
  if (value.note !== undefined && !isNote(value.note)) return null;

  return {
    actionId: "", // Will be set from params
    resultType: value.resultType as ActionResultInput["resultType"],
    ...(value.note === undefined ? {} : { note: value.note })
  };
}

function parseFocusResultInput(value: unknown): FocusResultInput | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => !["resultType", "actualMinutes", "note"].includes(key))) return null;

  const validTypes = ["completed", "interrupted", "abandoned"];
  if (typeof value.resultType !== "string" || !validTypes.includes(value.resultType)) return null;
  if (value.actualMinutes !== undefined && !isActualMinutes(value.actualMinutes)) return null;
  if (value.note !== undefined && !isNote(value.note)) return null;

  return {
    focusSessionId: "", // Will be set from params
    resultType: value.resultType as FocusResultInput["resultType"],
    ...(value.actualMinutes === undefined ? {} : { actualMinutes: value.actualMinutes }),
    ...(value.note === undefined ? {} : { note: value.note })
  };
}

function parseDailyCloseInput(value: unknown): DailyCloseInput | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => !["date", "note"].includes(key))) return null;

  if (typeof value.date !== "string" || !isLocalDate(value.date)) return null;
  if (value.note !== undefined && !isNote(value.note)) return null;

  return {
    date: value.date,
    ...(value.note === undefined ? {} : { note: value.note })
  };
}

function isNote(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= MAX_NOTE_LENGTH;
}

function isActualMinutes(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 1440;
}

function isLocalDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year!, month! - 1, day!));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month! - 1 && parsed.getUTCDate() === day;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
