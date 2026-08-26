import {
  createExecutionContext,
  findCurrentExecutionContext,
  type DatabaseClient,
  type OutcomeRow,
  type ProjectRow
} from "@lifeos/db";
import type {
  CreateExecutionContextInput,
  CreatedExecutionContextView,
  CurrentExecutionContextView,
  OutcomeId,
  OutcomeView,
  ProjectId,
  ProjectView,
  SeasonId
} from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TEXT = 2_000;

type ExecutionContextErrorView = {
  error: "unavailable" | "unauthenticated" | "invalid_context" | "not_found" | "season_not_active";
  message: string;
};

export function registerExecutionContextRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.post(
    "/v1/execution-context",
    async (request, reply): Promise<CreatedExecutionContextView | ExecutionContextErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Execution context storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const parsed = parseExecutionContextInput(request.body);
      if (!parsed) {
        reply.code(400);
        return { error: "invalid_context", message: "Execution context does not match the B0 contract" };
      }

      const result = await createExecutionContext(database, {
        userId,
        seasonId: parsed.seasonId,
        outcome: parsed.outcome,
        ...(parsed.project === undefined ? {} : { project: parsed.project })
      });

      if (result.status === "season_not_found") {
        reply.code(404);
        return { error: "not_found", message: "Active Season not found" };
      }
      if (result.status === "season_not_active") {
        reply.code(409);
        return { error: "season_not_active", message: "Execution context can only be added to an active Season" };
      }

      reply.code(201);
      return {
        seasonId: result.season.id as SeasonId,
        outcome: toOutcomeView(result.outcome),
        ...(result.project === undefined ? {} : { project: toProjectView(result.project) })
      };
    }
  );

  app.get(
    "/v1/execution-context/current",
    async (request, reply): Promise<CurrentExecutionContextView | ExecutionContextErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Execution context storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const current = await findCurrentExecutionContext(database, userId);
      if (!current) {
        reply.code(404);
        return { error: "not_found", message: "No active Current Season exists" };
      }

      return {
        seasonId: current.season.id as SeasonId,
        outcomes: current.outcomes.map(({ outcome, projects }) => ({
          outcome: toOutcomeView(outcome),
          projects: projects.map(toProjectView)
        }))
      };
    }
  );
}

function parseExecutionContextInput(value: unknown): CreateExecutionContextInput | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => !["seasonId", "outcome", "project"].includes(key))) return null;
  if (typeof value.seasonId !== "string" || !UUID_PATTERN.test(value.seasonId)) return null;

  const outcome = parseOutcome(value.outcome);
  if (!outcome) return null;

  let project: NonNullable<CreateExecutionContextInput["project"]> | undefined;
  if (value.project !== undefined) {
    const parsedProject = parseProject(value.project);
    if (!parsedProject) return null;
    project = parsedProject;
  }

  return {
    seasonId: value.seasonId as SeasonId,
    outcome,
    ...(project === undefined ? {} : { project })
  };
}

function parseOutcome(value: unknown): CreateExecutionContextInput["outcome"] | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => key !== "title" && key !== "successDefinition")) return null;
  if (!isText(value.title)) return null;
  if (value.successDefinition !== undefined && !isText(value.successDefinition, true)) return null;
  return {
    title: value.title as string,
    ...(value.successDefinition === undefined ? {} : { successDefinition: value.successDefinition as string })
  };
}

function parseProject(value: unknown): NonNullable<CreateExecutionContextInput["project"]> | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => key !== "title" && key !== "description")) return null;
  if (!isText(value.title)) return null;
  if (value.description !== undefined && !isText(value.description, true)) return null;
  return {
    title: value.title as string,
    ...(value.description === undefined ? {} : { description: value.description as string })
  };
}

function toOutcomeView(row: OutcomeRow): OutcomeView {
  if (!row.seasonId) throw new Error("B0 Outcome must remain linked to a Season");
  return {
    id: row.id as OutcomeId,
    seasonId: row.seasonId as SeasonId,
    title: row.title,
    status: row.status as OutcomeView["status"],
    ...(row.successDefinition === null ? {} : { successDefinition: row.successDefinition }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toProjectView(row: ProjectRow): ProjectView {
  if (!row.outcomeId) throw new Error("B0 Project must remain linked to an Outcome");
  return {
    id: row.id as ProjectId,
    outcomeId: row.outcomeId as OutcomeId,
    title: row.title,
    status: row.status as ProjectView["status"],
    ...(row.description === null ? {} : { description: row.description }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown, allowEmpty = false): value is string {
  if (typeof value !== "string" || value.length > MAX_TEXT) return false;
  return allowEmpty ? true : value.trim().length > 0;
}
