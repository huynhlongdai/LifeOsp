import {
  captureFocusDistraction,
  endActiveFocus,
  readFocusState,
  startFocusFromNowRecommendation,
  type ActionRow,
  type DatabaseClient,
  type FocusSessionRow
} from "@lifeos/db";
import type {
  CaptureDistractionInput,
  DistractionCaptureView,
  EndFocusInput,
  FocusSessionView,
  FocusStateView,
  StartFocusInput
} from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_DISTRACTION_LENGTH = 2_000;

export type FocusErrorView = {
  error:
    | "unavailable"
    | "unauthenticated"
    | "invalid_request"
    | "not_found"
    | "invalid_status"
    | "invalid_action"
    | "active_focus_exists";
  message: string;
  currentStatus?: string;
};

export function registerFocusRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.get("/v1/focus", async (request, reply): Promise<FocusStateView | FocusErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "Focus storage is unavailable" };
    }

    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }

    return readFocusState(database, userId, new Date());
  });

  app.post("/v1/focus/start", async (request, reply): Promise<FocusSessionView | FocusErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "Focus storage is unavailable" };
    }

    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }

    const input = parseStartFocusInput(request.body);
    if (!input) {
      reply.code(400);
      return { error: "invalid_request", message: "Focus start requires an accepted or edited NOW recommendation UUID" };
    }

    const result = await startFocusFromNowRecommendation(database, userId, input.recommendationId, new Date());
    if (result.status === "not_found") {
      reply.code(404);
      return { error: "not_found", message: "NOW recommendation was not found" };
    }
    if (result.status === "invalid_status") {
      reply.code(409);
      return {
        error: "invalid_status",
        message: "Focus can only start from an accepted or edited NOW recommendation",
        currentStatus: result.currentStatus
      };
    }
    if (result.status === "invalid_action") {
      reply.code(409);
      return { error: "invalid_action", message: "Recommendation no longer points to a valid owned ready Action" };
    }
    if (result.status === "active_focus_exists") {
      reply.code(409);
      return { error: "active_focus_exists", message: "An active FocusSession already exists" };
    }

    reply.code(201);
    return toFocusSessionView(result.focus, result.action);
  });

  app.post<{ Params: { focusSessionId: string } }>(
    "/v1/focus/:focusSessionId/end",
    async (request, reply): Promise<FocusSessionView | FocusErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Focus storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }
      if (!UUID_PATTERN.test(request.params.focusSessionId)) {
        reply.code(400);
        return { error: "invalid_request", message: "focusSessionId must be a UUID" };
      }

      const input = parseEndFocusInput(request.body);
      if (!input) {
        reply.code(400);
        return { error: "invalid_request", message: "Focus end outcome must be completed, interrupted, or abandoned" };
      }

      const result = await endActiveFocus(database, userId, request.params.focusSessionId, input.outcome, new Date());
      if (result.status === "not_found") {
        reply.code(404);
        return { error: "not_found", message: "FocusSession was not found" };
      }
      if (result.status === "invalid_status") {
        reply.code(409);
        return { error: "invalid_status", message: "Only active FocusSession can be ended", currentStatus: result.currentStatus };
      }

      return toFocusSessionView(result.focus, result.action);
    }
  );

  app.post<{ Params: { focusSessionId: string } }>(
    "/v1/focus/:focusSessionId/distractions",
    async (request, reply): Promise<DistractionCaptureView | FocusErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Focus storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }
      if (!UUID_PATTERN.test(request.params.focusSessionId)) {
        reply.code(400);
        return { error: "invalid_request", message: "focusSessionId must be a UUID" };
      }

      const input = parseCaptureDistractionInput(request.body);
      if (!input) {
        reply.code(400);
        return { error: "invalid_request", message: "Distraction rawText must be non-blank text" };
      }

      const result = await captureFocusDistraction(database, userId, request.params.focusSessionId, input.rawText, new Date());
      if (result.status === "not_found") {
        reply.code(404);
        return { error: "not_found", message: "FocusSession was not found" };
      }
      if (result.status === "invalid_status") {
        reply.code(409);
        return { error: "invalid_status", message: "Distractions can only be captured during active Focus", currentStatus: result.currentStatus };
      }

      reply.code(201);
      return {
        id: result.capture.id as DistractionCaptureView["id"],
        focusSessionId: result.focus.id as DistractionCaptureView["focusSessionId"],
        actionId: result.action.id as DistractionCaptureView["actionId"],
        rawText: result.capture.rawText,
        createdAt: result.capture.createdAt.toISOString()
      };
    }
  );
}

function toFocusSessionView(focus: FocusSessionRow, action: ActionRow): FocusSessionView {
  return {
    id: focus.id as FocusSessionView["id"],
    actionId: focus.actionId as FocusSessionView["actionId"],
    ...(focus.recommendationId === null ? {} : { recommendationId: focus.recommendationId as FocusSessionView["recommendationId"] }),
    status: focus.status as FocusSessionView["status"],
    ...(focus.plannedMinutes === null ? {} : { plannedMinutes: focus.plannedMinutes }),
    startedAt: focus.startedAt.toISOString(),
    ...(focus.endedAt === null ? {} : { endedAt: focus.endedAt.toISOString() }),
    action: {
      id: action.id as FocusSessionView["action"]["id"],
      title: action.title,
      ...(action.doneCondition === null ? {} : { doneCondition: action.doneCondition })
    }
  };
}

function parseStartFocusInput(value: unknown): StartFocusInput | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => key !== "recommendationId")) return null;
  if (typeof value.recommendationId !== "string" || !UUID_PATTERN.test(value.recommendationId)) return null;
  return { recommendationId: value.recommendationId as StartFocusInput["recommendationId"] };
}

function parseEndFocusInput(value: unknown): EndFocusInput | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => key !== "outcome")) return null;
  if (value.outcome !== "completed" && value.outcome !== "interrupted" && value.outcome !== "abandoned") return null;
  return { outcome: value.outcome };
}

function parseCaptureDistractionInput(value: unknown): CaptureDistractionInput | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => key !== "rawText")) return null;
  if (typeof value.rawText !== "string" || value.rawText.trim().length === 0 || value.rawText.length > MAX_DISTRACTION_LENGTH) return null;
  return { rawText: value.rawText };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
