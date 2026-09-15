import {
  applyGetUnstuckEdit,
  diagnoseGetUnstuck,
  readGetUnstuckCandidates,
  reviveGetUnstuckAction,
  type ActionRow,
  type DatabaseClient
} from "@lifeos/db";
import {
  defaultInterventionForFriction,
  GET_UNSTUCK_EDIT_TEXT_MAX_LENGTH,
  GET_UNSTUCK_FRICTIONS,
  GET_UNSTUCK_TITLE_MAX_LENGTH,
  type ActionId,
  type ActionView,
  type ApplyGetUnstuckEditInput,
  type GetUnstuckDiagnosisView,
  type GetUnstuckFriction,
  type GetUnstuckListView,
  type ProjectId
} from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type GetUnstuckErrorView = {
  error: "unavailable" | "unauthenticated" | "invalid_request" | "not_found" | "not_stuck" | "invalid_status";
  message: string;
  currentStatus?: string;
};

// Get Unstuck V0: evidence first, one friction question, one intervention.
// diagnose() only logs the friction choice; the actual state change is a
// separate, explicit call (edit or revive), or the existing /result route
// for reprioritize/pause_drop — never silent, always a step the user chose.
export function registerGetUnstuckRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.get("/v1/get-unstuck", async (request, reply): Promise<GetUnstuckListView | GetUnstuckErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "Get Unstuck storage is unavailable" };
    }

    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }

    return readGetUnstuckCandidates(database, userId, new Date());
  });

  app.post<{ Params: { actionId: string } }>(
    "/v1/actions/:actionId/get-unstuck/diagnose",
    async (request, reply): Promise<GetUnstuckDiagnosisView | GetUnstuckErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Get Unstuck storage is unavailable" };
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

      const friction = parseFriction(request.body);
      if (!friction) {
        reply.code(400);
        return { error: "invalid_request", message: `friction must be one of ${GET_UNSTUCK_FRICTIONS.join(", ")}` };
      }

      const intervention = defaultInterventionForFriction(friction);
      const outcome = await diagnoseGetUnstuck(database, userId, request.params.actionId, friction, intervention, new Date());
      if (outcome.status === "not_found") {
        reply.code(404);
        return { error: "not_found", message: "Action was not found" };
      }
      if (outcome.status === "not_stuck") {
        reply.code(409);
        return { error: "not_stuck", message: "This Action does not currently show evidence of being stuck" };
      }

      reply.code(201);
      return outcome.view;
    }
  );

  app.post<{ Params: { actionId: string } }>(
    "/v1/actions/:actionId/get-unstuck/edit",
    async (request, reply): Promise<ActionView | GetUnstuckErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Get Unstuck storage is unavailable" };
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

      const input = parseEditInput(request.body);
      if (!input) {
        reply.code(400);
        return {
          error: "invalid_request",
          message: "Body requires intervention (clarify | resize) and at least one of title, doneCondition, estimatedMinutes"
        };
      }

      const outcome = await applyGetUnstuckEdit(database, userId, request.params.actionId, input, new Date());
      if (outcome.status === "not_found") {
        reply.code(404);
        return { error: "not_found", message: "Action was not found" };
      }
      if (outcome.status === "invalid_status") {
        reply.code(409);
        return { error: "invalid_status", message: "Completed or dropped Actions cannot be edited here" };
      }

      return toActionView(outcome.action);
    }
  );

  app.post<{ Params: { actionId: string } }>(
    "/v1/actions/:actionId/get-unstuck/revive",
    async (request, reply): Promise<ActionView | GetUnstuckErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Get Unstuck storage is unavailable" };
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
      if (request.body !== undefined && (typeof request.body !== "object" || request.body === null || Object.keys(request.body).length > 0)) {
        reply.code(400);
        return { error: "invalid_request", message: "revive takes no body" };
      }

      const outcome = await reviveGetUnstuckAction(database, userId, request.params.actionId, new Date());
      if (outcome.status === "not_found") {
        reply.code(404);
        return { error: "not_found", message: "Action was not found" };
      }
      if (outcome.status === "invalid_status") {
        reply.code(409);
        return {
          error: "invalid_status",
          message: "Only a blocked or postponed Action can be revived",
          currentStatus: outcome.currentStatus
        };
      }

      return toActionView(outcome.action);
    }
  );
}

function parseFriction(value: unknown): GetUnstuckFriction | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => key !== "friction")) return null;
  if (typeof value.friction !== "string" || !(GET_UNSTUCK_FRICTIONS as readonly string[]).includes(value.friction)) return null;
  return value.friction as GetUnstuckFriction;
}

const EDIT_KEYS = new Set(["intervention", "title", "doneCondition", "estimatedMinutes"]);

function parseEditInput(value: unknown): ApplyGetUnstuckEditInput | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => !EDIT_KEYS.has(key))) return null;
  if (value.intervention !== "clarify" && value.intervention !== "resize") return null;

  let title: string | undefined;
  if (value.title !== undefined) {
    if (typeof value.title !== "string" || value.title.trim().length === 0 || value.title.length > GET_UNSTUCK_TITLE_MAX_LENGTH) return null;
    title = value.title.trim();
  }

  let doneCondition: string | undefined;
  if (value.doneCondition !== undefined) {
    if (typeof value.doneCondition !== "string" || value.doneCondition.length > GET_UNSTUCK_EDIT_TEXT_MAX_LENGTH) return null;
    doneCondition = value.doneCondition.trim();
  }

  let estimatedMinutes: number | undefined;
  if (value.estimatedMinutes !== undefined) {
    if (!Number.isInteger(value.estimatedMinutes) || (value.estimatedMinutes as number) < 1 || (value.estimatedMinutes as number) > 480) return null;
    estimatedMinutes = value.estimatedMinutes as number;
  }

  if (title === undefined && doneCondition === undefined && estimatedMinutes === undefined) return null;

  return {
    intervention: value.intervention,
    ...(title === undefined ? {} : { title }),
    ...(doneCondition === undefined ? {} : { doneCondition }),
    ...(estimatedMinutes === undefined ? {} : { estimatedMinutes })
  };
}

function toActionView(action: ActionRow): ActionView {
  if (!action.outcomeId) throw new Error("Action must remain linked to an Outcome");
  return {
    id: action.id as ActionId,
    outcomeId: action.outcomeId as ActionView["outcomeId"],
    ...(action.projectId === null ? {} : { projectId: action.projectId as ProjectId }),
    title: action.title,
    ...(action.doneCondition === null ? {} : { doneCondition: action.doneCondition }),
    ...(action.estimatedMinutes === null ? {} : { estimatedMinutes: action.estimatedMinutes }),
    status: action.status as ActionView["status"],
    ...(action.priority === null ? {} : { priority: action.priority }),
    createdAt: action.createdAt.toISOString(),
    updatedAt: action.updatedAt.toISOString()
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
