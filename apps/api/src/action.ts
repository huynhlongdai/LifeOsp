import {
  createMissingNextActionInputV1,
  validateMissingNextActionOutputV1,
  type MissingNextActionProvider
} from "@lifeos/ai";
import {
  confirmActionCandidate,
  createActionCandidate,
  findActionById,
  findActionContext,
  type ActionRow,
  type DatabaseClient
} from "@lifeos/db";
import type {
  ActionId,
  ActionView,
  ConfirmActionCandidateInput,
  CreateActionCandidateInput,
  OutcomeId,
  ProjectId,
  SeasonId
} from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TITLE_LENGTH = 500;
const MAX_DONE_CONDITION_LENGTH = 1_000;
const MAX_ESTIMATED_MINUTES = 480;

export type ActionOptions = {
  provider?: MissingNextActionProvider;
  timeoutMs?: number;
};

type ActionErrorView = {
  error:
    | "unavailable"
    | "unauthenticated"
    | "invalid_action"
    | "not_found"
    | "inactive_context"
    | "invalid_status"
    | "provider_unavailable"
    | "provider_failed"
    | "invalid_provider_output";
  message: string;
  manualFallback?: boolean;
  validationErrors?: string[];
  currentStatus?: string;
};

type AiActionCandidateView = {
  action: ActionView;
  proposal: {
    reason: string;
    assumptions: string[];
  };
};

export function registerActionRoutes(
  app: FastifyInstance,
  database: DatabaseClient | null,
  options: ActionOptions = {}
) {
  app.post(
    "/v1/actions/candidates/manual",
    async (request, reply): Promise<ActionView | ActionErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Action storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const input = parseCreateActionCandidateInput(request.body);
      if (!input) {
        reply.code(400);
        return { error: "invalid_action", message: "Action candidate does not match the B1 contract" };
      }

      const result = await createActionCandidate(database, {
        userId,
        outcomeId: input.outcomeId,
        ...(input.projectId === undefined ? {} : { projectId: input.projectId }),
        title: input.title,
        ...(input.doneCondition === undefined ? {} : { doneCondition: input.doneCondition }),
        ...(input.estimatedMinutes === undefined ? {} : { estimatedMinutes: input.estimatedMinutes }),
        ...(input.priority === undefined ? {} : { priority: input.priority }),
        source: "user"
      });

      if (result.status === "not_found") {
        reply.code(404);
        return { error: "not_found", message: "Owned execution context was not found" };
      }
      if (result.status === "inactive_context") {
        reply.code(409);
        return { error: "inactive_context", message: "Action candidates require active execution context" };
      }

      reply.code(201);
      return toActionView(result.action);
    }
  );

  app.post(
    "/v1/actions/candidates/propose",
    async (request, reply): Promise<AiActionCandidateView | ActionErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Action storage is unavailable", manualFallback: true };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const ids = parseActionContextIds(request.body);
      if (!ids) {
        reply.code(400);
        return { error: "invalid_action", message: "AI proposal requires owned Outcome/Project context" };
      }

      const context = await findActionContext(
        database,
        userId,
        ids.outcomeId,
        ids.projectId
      );
      if (context.status === "not_found") {
        reply.code(404);
        return { error: "not_found", message: "Owned execution context was not found" };
      }
      if (context.status === "inactive_context") {
        reply.code(409);
        return { error: "inactive_context", message: "AI proposals require active execution context" };
      }

      if (!options.provider) {
        reply.code(503);
        return {
          error: "provider_unavailable",
          message: "AI action proposal is unavailable; create the Action manually",
          manualFallback: true
        };
      }

      const { season, outcome, project } = context.context;
      let providerResult;
      try {
        providerResult = await options.provider.propose(
          createMissingNextActionInputV1({
            season: {
              id: season.id as SeasonId,
              title: season.title,
              purpose: season.purpose,
              ...(season.primaryFocusText === null ? {} : { primaryFocusText: season.primaryFocusText })
            },
            outcome: {
              id: outcome.id as OutcomeId,
              title: outcome.title,
              ...(outcome.successDefinition === null ? {} : { successDefinition: outcome.successDefinition })
            },
            ...(project === undefined
              ? {}
              : {
                  project: {
                    id: project.id as ProjectId,
                    title: project.title,
                    ...(project.description === null ? {} : { description: project.description })
                  }
                })
          }),
          { signal: AbortSignal.timeout(options.timeoutMs ?? 8_000) }
        );
      } catch (error) {
        request.log.warn({ error }, "missing next Action provider failed");
        reply.code(503);
        return {
          error: "provider_failed",
          message: "AI action proposal failed; manual Action creation is still available",
          manualFallback: true
        };
      }

      const validation = validateMissingNextActionOutputV1(providerResult.output);
      if (!validation.ok) {
        request.log.warn({ validationErrors: validation.errors }, "missing next Action provider returned invalid output");
        reply.code(422);
        return {
          error: "invalid_provider_output",
          message: "AI output did not match the safe Action proposal contract",
          manualFallback: true,
          validationErrors: validation.errors
        };
      }

      if (providerResult.runtime) {
        request.log.info({ aiRuntime: providerResult.runtime }, "missing next Action provider completed");
      }

      const proposal = validation.proposal;
      const created = await createActionCandidate(database, {
        userId,
        outcomeId: ids.outcomeId,
        ...(ids.projectId === undefined ? {} : { projectId: ids.projectId }),
        title: proposal.title,
        doneCondition: proposal.doneCondition,
        estimatedMinutes: proposal.estimatedMinutes,
        source: "ai",
        proposalReason: proposal.reason,
        proposalAssumptions: proposal.assumptions
      });
      if (created.status === "not_found") {
        reply.code(404);
        return { error: "not_found", message: "Execution context changed before the proposal could be saved" };
      }
      if (created.status === "inactive_context") {
        reply.code(409);
        return { error: "inactive_context", message: "Execution context became inactive before the proposal could be saved" };
      }

      reply.code(201);
      return {
        action: toActionView(created.action),
        proposal: {
          reason: proposal.reason,
          assumptions: proposal.assumptions
        }
      };
    }
  );

  app.post<{ Params: { actionId: string } }>(
    "/v1/actions/:actionId/confirm",
    async (request, reply): Promise<ActionView | ActionErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Action storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }
      if (!UUID_PATTERN.test(request.params.actionId)) {
        reply.code(400);
        return { error: "invalid_action", message: "actionId must be a UUID" };
      }

      const input = parseConfirmActionCandidateInput(request.body);
      if (!input) {
        reply.code(400);
        return { error: "invalid_action", message: "Action confirmation does not match the B1 contract" };
      }

      const result = await confirmActionCandidate(database, {
        userId,
        actionId: request.params.actionId,
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.doneCondition === undefined ? {} : { doneCondition: input.doneCondition }),
        ...(input.estimatedMinutes === undefined ? {} : { estimatedMinutes: input.estimatedMinutes }),
        ...(input.priority === undefined ? {} : { priority: input.priority })
      });

      if (result.status === "not_found") {
        reply.code(404);
        return { error: "not_found", message: "Action candidate was not found" };
      }
      if (result.status === "inactive_context") {
        reply.code(409);
        return { error: "inactive_context", message: "Action cannot be confirmed outside active execution context" };
      }
      if (result.status === "invalid_status") {
        reply.code(409);
        return {
          error: "invalid_status",
          message: "Only candidate Actions can be confirmed",
          currentStatus: result.currentStatus
        };
      }

      return toActionView(result.action);
    }
  );

  app.get<{ Params: { actionId: string } }>(
    "/v1/actions/:actionId",
    async (request, reply): Promise<ActionView | ActionErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Action storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }
      if (!UUID_PATTERN.test(request.params.actionId)) {
        reply.code(400);
        return { error: "invalid_action", message: "actionId must be a UUID" };
      }

      const action = await findActionById(database, userId, request.params.actionId);
      if (!action) {
        reply.code(404);
        return { error: "not_found", message: "Action was not found" };
      }
      return toActionView(action);
    }
  );
}

function parseCreateActionCandidateInput(value: unknown): CreateActionCandidateInput | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => !["outcomeId", "projectId", "title", "doneCondition", "estimatedMinutes", "priority"].includes(key))) {
    return null;
  }
  const ids = parseIds(value);
  if (!ids || !isRequiredText(value.title, MAX_TITLE_LENGTH)) return null;
  if (value.doneCondition !== undefined && !isRequiredText(value.doneCondition, MAX_DONE_CONDITION_LENGTH)) return null;
  if (value.estimatedMinutes !== undefined && !isEstimatedMinutes(value.estimatedMinutes)) return null;
  if (value.priority !== undefined && !isPriority(value.priority)) return null;

  return {
    outcomeId: ids.outcomeId as OutcomeId,
    ...(ids.projectId === undefined ? {} : { projectId: ids.projectId as ProjectId }),
    title: value.title,
    ...(value.doneCondition === undefined ? {} : { doneCondition: value.doneCondition }),
    ...(value.estimatedMinutes === undefined ? {} : { estimatedMinutes: value.estimatedMinutes }),
    ...(value.priority === undefined ? {} : { priority: value.priority })
  };
}

function parseActionContextIds(value: unknown): { outcomeId: string; projectId?: string } | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => key !== "outcomeId" && key !== "projectId")) return null;
  return parseIds(value);
}

function parseIds(record: Record<string, unknown>): { outcomeId: string; projectId?: string } | null {
  if (typeof record.outcomeId !== "string" || !UUID_PATTERN.test(record.outcomeId)) return null;
  if (record.projectId !== undefined && (typeof record.projectId !== "string" || !UUID_PATTERN.test(record.projectId))) {
    return null;
  }
  return {
    outcomeId: record.outcomeId,
    ...(record.projectId === undefined ? {} : { projectId: record.projectId as string })
  };
}

function parseConfirmActionCandidateInput(value: unknown): ConfirmActionCandidateInput | null {
  if (value === undefined || value === null) return {};
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => !["title", "doneCondition", "estimatedMinutes", "priority"].includes(key))) return null;
  if (value.title !== undefined && !isRequiredText(value.title, MAX_TITLE_LENGTH)) return null;
  if (value.doneCondition !== undefined && !isRequiredText(value.doneCondition, MAX_DONE_CONDITION_LENGTH)) return null;
  if (value.estimatedMinutes !== undefined && !isEstimatedMinutes(value.estimatedMinutes)) return null;
  if (value.priority !== undefined && !isPriority(value.priority)) return null;

  return {
    ...(value.title === undefined ? {} : { title: value.title }),
    ...(value.doneCondition === undefined ? {} : { doneCondition: value.doneCondition }),
    ...(value.estimatedMinutes === undefined ? {} : { estimatedMinutes: value.estimatedMinutes }),
    ...(value.priority === undefined ? {} : { priority: value.priority })
  };
}

function toActionView(row: ActionRow): ActionView {
  if (!row.outcomeId) throw new Error("B1 Action must remain linked to an Outcome");
  return {
    id: row.id as ActionId,
    outcomeId: row.outcomeId as OutcomeId,
    ...(row.projectId === null ? {} : { projectId: row.projectId as ProjectId }),
    title: row.title,
    ...(row.doneCondition === null ? {} : { doneCondition: row.doneCondition }),
    ...(row.estimatedMinutes === null ? {} : { estimatedMinutes: row.estimatedMinutes }),
    status: row.status as ActionView["status"],
    ...(row.priority === null ? {} : { priority: row.priority }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function isEstimatedMinutes(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= MAX_ESTIMATED_MINUTES;
}

function isPriority(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isRequiredText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
