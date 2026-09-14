import {
  commitDailyClose,
  readDailyClose,
  recordActionResult,
  toActionResultView,
  type DatabaseClient
} from "@lifeos/db";
import {
  isActionResultOutcome,
  isLocalDate,
  isTzOffsetMinutes,
  MAX_ACTION_RESULT_TEXT_LENGTH,
  MAX_DAILY_CLOSE_NOTE_LENGTH,
  type ActionResultView,
  type CommitDailyCloseInput,
  type DailyCloseView,
  type FocusSessionId,
  type RecordActionResultInput
} from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FOCUS_END_OUTCOMES = ["completed", "interrupted", "abandoned"] as const;

export type ResultErrorView = {
  error:
    | "unavailable"
    | "unauthenticated"
    | "invalid_request"
    | "not_found"
    | "invalid_status"
    | "already_recorded"
    | "invalid_focus"
    | "reason_required"
    | "already_closed";
  message: string;
  currentStatus?: string;
  closedAt?: string;
};

/**
 * B5 Result + Daily Close V0 routes.
 *
 * Everything here is user-committed and provider-independent: no AI call is made,
 * so an AI provider outage can never block recording a result or closing a day.
 */
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
          message: "Result requires outcome completed, partial, postponed, blocked, or dropped"
        };
      }

      const result = await recordActionResult(database, {
        userId,
        actionId: request.params.actionId,
        outcome: input.outcome,
        ...(input.note === undefined ? {} : { note: input.note }),
        ...(input.reason === undefined ? {} : { reason: input.reason }),
        ...(input.focusSessionId === undefined ? {} : { focusSessionId: input.focusSessionId }),
        ...(input.focusOutcome === undefined ? {} : { focusOutcome: input.focusOutcome }),
        ...(input.postponedTo === undefined ? {} : { postponedTo: input.postponedTo }),
        recordedAt: new Date()
      });

      if (result.status === "not_found") {
        reply.code(404);
        return { error: "not_found", message: "Action was not found" };
      }
      if (result.status === "reason_required") {
        reply.code(400);
        return { error: "reason_required", message: "A blocked result requires a reason" };
      }
      if (result.status === "already_recorded") {
        reply.code(409);
        return {
          error: "already_recorded",
          message: "This Action already has a recorded result",
          currentStatus: result.currentStatus
        };
      }
      if (result.status === "invalid_status") {
        reply.code(409);
        return {
          error: "invalid_status",
          message: "Only a ready or active Action can receive a result",
          currentStatus: result.currentStatus
        };
      }
      if (result.status === "invalid_focus") {
        reply.code(409);
        return {
          error: "invalid_focus",
          message: "FocusSession must be an active session owned by the same Action",
          ...(result.currentStatus === undefined ? {} : { currentStatus: result.currentStatus })
        };
      }

      reply.code(201);
      return toActionResultView(result.result, result.action, result.focus);
    }
  );

  app.get<{ Querystring: { date?: string; tzOffsetMinutes?: string } }>(
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

      const tzOffsetMinutes = parseTzOffsetQuery(request.query.tzOffsetMinutes);
      if (tzOffsetMinutes === null) {
        reply.code(400);
        return { error: "invalid_request", message: "tzOffsetMinutes must be an integer between -840 and 840" };
      }

      const localDate = request.query.date ?? currentLocalDate(new Date(), tzOffsetMinutes);
      if (!isLocalDate(localDate)) {
        reply.code(400);
        return { error: "invalid_request", message: "date must be a calendar date in YYYY-MM-DD form" };
      }

      return readDailyClose(database, userId, localDate, tzOffsetMinutes, new Date());
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

    const input = parseCommitDailyCloseInput(request.body);
    if (!input) {
      reply.code(400);
      return { error: "invalid_request", message: "Daily Close requires a localDate in YYYY-MM-DD form" };
    }

    const result = await commitDailyClose(database, {
      userId,
      localDate: input.localDate,
      tzOffsetMinutes: input.tzOffsetMinutes ?? 0,
      ...(input.note === undefined ? {} : { note: input.note }),
      closedAt: new Date()
    });

    if (result.status === "already_closed") {
      reply.code(409);
      return { error: "already_closed", message: "This local date is already closed", closedAt: result.closedAt };
    }

    reply.code(201);
    return result.view;
  });
}

function currentLocalDate(now: Date, tzOffsetMinutes: number): string {
  return new Date(now.getTime() + tzOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

function parseTzOffsetQuery(value: string | undefined): number | null {
  if (value === undefined) return 0;
  if (!/^-?\d{1,4}$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  return isTzOffsetMinutes(parsed) ? parsed : null;
}

function parseRecordActionResultInput(value: unknown): RecordActionResultInput | null {
  if (!isRecord(value)) return null;
  const allowed = new Set(["outcome", "note", "reason", "focusSessionId", "focusOutcome", "postponedTo"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return null;
  if (!isActionResultOutcome(value.outcome)) return null;

  const note = optionalText(value.note, MAX_ACTION_RESULT_TEXT_LENGTH);
  if (note === false) return null;
  const reason = optionalText(value.reason, MAX_ACTION_RESULT_TEXT_LENGTH);
  if (reason === false) return null;

  if (value.focusSessionId !== undefined) {
    if (typeof value.focusSessionId !== "string" || !UUID_PATTERN.test(value.focusSessionId)) return null;
  }
  if (value.focusOutcome !== undefined) {
    if (typeof value.focusOutcome !== "string" || !(FOCUS_END_OUTCOMES as readonly string[]).includes(value.focusOutcome)) {
      return null;
    }
  }
  if (value.postponedTo !== undefined) {
    if (!isLocalDate(value.postponedTo)) return null;
    if (value.outcome !== "postponed") return null;
  }
  if (value.outcome === "blocked" && reason === undefined) return null;

  return {
    outcome: value.outcome,
    ...(note === undefined ? {} : { note }),
    ...(reason === undefined ? {} : { reason }),
    ...(value.focusSessionId === undefined ? {} : { focusSessionId: value.focusSessionId as FocusSessionId }),
    ...(value.focusOutcome === undefined
      ? {}
      : { focusOutcome: value.focusOutcome as NonNullable<RecordActionResultInput["focusOutcome"]> }),
    ...(value.postponedTo === undefined ? {} : { postponedTo: value.postponedTo as string })
  };
}

function parseCommitDailyCloseInput(value: unknown): CommitDailyCloseInput | null {
  if (!isRecord(value)) return null;
  const allowed = new Set(["localDate", "tzOffsetMinutes", "note"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return null;
  if (!isLocalDate(value.localDate)) return null;
  if (value.tzOffsetMinutes !== undefined && !isTzOffsetMinutes(value.tzOffsetMinutes)) return null;

  const note = optionalText(value.note, MAX_DAILY_CLOSE_NOTE_LENGTH);
  if (note === false) return null;

  return {
    localDate: value.localDate,
    ...(value.tzOffsetMinutes === undefined ? {} : { tzOffsetMinutes: value.tzOffsetMinutes as number }),
    ...(note === undefined ? {} : { note })
  };
}

function optionalText(value: unknown, maxLength: number): string | undefined | false {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return false;
  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
