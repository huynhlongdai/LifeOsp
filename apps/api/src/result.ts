import { closeDay, readDailyClose, recordActionResult, type DatabaseClient } from "@lifeos/db";
import {
  ACTION_RESULTS,
  ACTION_RESULT_TEXT_MAX_LENGTH,
  DAILY_CLOSE_FRICTION_CODES,
  DAILY_CLOSE_TEXT_MAX_LENGTH,
  FOCUS_END_OUTCOMES,
  isValidLocalDate,
  isValidUtcOffsetMinutes,
  type ActionResultView,
  type CloseDayInput,
  type DailyCloseView,
  type RecordActionResultInput
} from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ResultErrorView = {
  error:
    | "unavailable"
    | "unauthenticated"
    | "invalid_request"
    | "not_found"
    | "invalid_status"
    | "active_focus_exists"
    | "focus_not_active";
  message: string;
  currentStatus?: string;
  focusSessionId?: string;
};

// B5 — Action result + Daily Close. Result recording is the only path that
// moves an Action out of ready/active; Daily Close reads facts and stores
// optional user input for one local date.
export function registerResultRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.post<{ Params: { actionId: string } }>(
    "/v1/actions/:actionId/result",
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
      if (!UUID_PATTERN.test(request.params.actionId)) {
        reply.code(400);
        return { error: "invalid_request", message: "actionId must be a UUID" };
      }

      const input = parseRecordActionResultInput(request.body);
      if (!input) {
        reply.code(400);
        return {
          error: "invalid_request",
          message:
            "Result must be completed, partial, postponed, blocked, or dropped; blocked requires blockedReason; texts ≤ 1000 chars; postponeUntil is YYYY-MM-DD; focusOutcome is completed, interrupted, or abandoned"
        };
      }

      const outcome = await recordActionResult(database, userId, request.params.actionId, input, new Date());
      if (outcome.status === "not_found") {
        reply.code(404);
        return { error: "not_found", message: "Action was not found" };
      }
      if (outcome.status === "invalid_status") {
        reply.code(409);
        return {
          error: "invalid_status",
          message: "Only ready or active Actions can receive a result",
          currentStatus: outcome.currentStatus
        };
      }
      if (outcome.status === "active_focus_requires_choice") {
        reply.code(409);
        return {
          error: "active_focus_exists",
          message: "A FocusSession is active on this Action; pass focusOutcome to end it in the same step",
          focusSessionId: outcome.focusSessionId
        };
      }
      if (outcome.status === "focus_not_active") {
        reply.code(409);
        return { error: "focus_not_active", message: "focusOutcome was given but no FocusSession is active on this Action" };
      }

      reply.code(201);
      return outcome.view;
    }
  );

  app.get<{ Querystring: { date?: string; offsetMinutes?: string } }>(
    "/v1/daily-close",
    async (request, reply): Promise<DailyCloseView | ResultErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Daily Close storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const range = parseDayQuery(request.query);
      if (!range) {
        reply.code(400);
        return { error: "invalid_request", message: "date must be YYYY-MM-DD and offsetMinutes an integer within ±840" };
      }

      const outcome = await readDailyClose(database, userId, range.date, range.offsetMinutes, new Date());
      if (outcome.status === "invalid_range") {
        reply.code(400);
        return { error: "invalid_request", message: "date/offsetMinutes do not form a valid local day" };
      }
      return outcome.view;
    }
  );

  app.post("/v1/daily-close", async (request, reply): Promise<DailyCloseView | ResultErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "Daily Close storage is unavailable" };
    }

    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }

    const input = parseCloseDayInput(request.body);
    if (!input) {
      reply.code(400);
      return {
        error: "invalid_request",
        message: "Daily Close requires date (YYYY-MM-DD) and offsetMinutes; optional texts ≤ 1000 chars; frictionCode must be a known code"
      };
    }

    const outcome = await closeDay(database, userId, input, new Date());
    if (outcome.status === "invalid_range") {
      reply.code(400);
      return { error: "invalid_request", message: "date/offsetMinutes do not form a valid local day" };
    }

    reply.code(outcome.created ? 201 : 200);
    return outcome.view;
  });
}

const RECORD_KEYS = new Set(["result", "note", "blockedReason", "remainingText", "postponeUntil", "focusOutcome"]);

function parseRecordActionResultInput(value: unknown): RecordActionResultInput | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => !RECORD_KEYS.has(key))) return null;
  if (typeof value.result !== "string" || !(ACTION_RESULTS as readonly string[]).includes(value.result)) return null;
  const result = value.result as RecordActionResultInput["result"];

  const note = optionalText(value.note, ACTION_RESULT_TEXT_MAX_LENGTH);
  const blockedReason = optionalText(value.blockedReason, ACTION_RESULT_TEXT_MAX_LENGTH);
  const remainingText = optionalText(value.remainingText, ACTION_RESULT_TEXT_MAX_LENGTH);
  if (note === false || blockedReason === false || remainingText === false) return null;
  if (result === "blocked" && blockedReason === undefined) return null;

  let postponeUntil: string | undefined;
  if (value.postponeUntil !== undefined) {
    if (typeof value.postponeUntil !== "string" || !isValidLocalDate(value.postponeUntil)) return null;
    postponeUntil = value.postponeUntil;
  }

  let focusOutcome: RecordActionResultInput["focusOutcome"];
  if (value.focusOutcome !== undefined) {
    if (typeof value.focusOutcome !== "string" || !(FOCUS_END_OUTCOMES as readonly string[]).includes(value.focusOutcome)) {
      return null;
    }
    focusOutcome = value.focusOutcome as RecordActionResultInput["focusOutcome"];
  }

  return {
    result,
    ...(note === undefined ? {} : { note }),
    ...(blockedReason === undefined ? {} : { blockedReason }),
    ...(remainingText === undefined ? {} : { remainingText }),
    ...(postponeUntil === undefined ? {} : { postponeUntil }),
    ...(focusOutcome === undefined ? {} : { focusOutcome })
  };
}

function parseDayQuery(query: { date?: string; offsetMinutes?: string }): { date: string; offsetMinutes: number } | null {
  if (typeof query.date !== "string" || !isValidLocalDate(query.date)) return null;
  if (typeof query.offsetMinutes !== "string" || !/^-?\d{1,3}$/.test(query.offsetMinutes)) return null;
  const offsetMinutes = Number(query.offsetMinutes);
  if (!isValidUtcOffsetMinutes(offsetMinutes)) return null;
  return { date: query.date, offsetMinutes };
}

const CLOSE_KEYS = new Set(["date", "offsetMinutes", "meaningfulProgressText", "frictionCode", "frictionNote", "note"]);

function parseCloseDayInput(value: unknown): CloseDayInput | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => !CLOSE_KEYS.has(key))) return null;
  if (typeof value.date !== "string" || !isValidLocalDate(value.date)) return null;
  if (typeof value.offsetMinutes !== "number" || !isValidUtcOffsetMinutes(value.offsetMinutes)) return null;

  const meaningfulProgressText = optionalText(value.meaningfulProgressText, DAILY_CLOSE_TEXT_MAX_LENGTH);
  const frictionNote = optionalText(value.frictionNote, DAILY_CLOSE_TEXT_MAX_LENGTH);
  const note = optionalText(value.note, DAILY_CLOSE_TEXT_MAX_LENGTH);
  if (meaningfulProgressText === false || frictionNote === false || note === false) return null;

  let frictionCode: CloseDayInput["frictionCode"];
  if (value.frictionCode !== undefined) {
    if (typeof value.frictionCode !== "string" || !(DAILY_CLOSE_FRICTION_CODES as readonly string[]).includes(value.frictionCode)) {
      return null;
    }
    frictionCode = value.frictionCode as CloseDayInput["frictionCode"];
  }

  return {
    date: value.date,
    offsetMinutes: value.offsetMinutes,
    ...(meaningfulProgressText === undefined ? {} : { meaningfulProgressText }),
    ...(frictionCode === undefined ? {} : { frictionCode }),
    ...(frictionNote === undefined ? {} : { frictionNote }),
    ...(note === undefined ? {} : { note })
  };
}

/** undefined = absent, false = invalid, string = trimmed non-blank text. */
function optionalText(value: unknown, maxLength: number): string | undefined | false {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (value.length > maxLength) return false;
  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
