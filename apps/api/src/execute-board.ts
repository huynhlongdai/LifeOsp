import { findExecuteBoard, type ActionRow, type DatabaseClient, type OutcomeRow, type ProjectRow } from "@lifeos/db";
import type {
  ActionId,
  ActionView,
  ExecuteBoardView,
  OutcomeId,
  OutcomeView,
  ProjectId,
  ProjectView,
  SeasonId
} from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

type ExecuteBoardErrorView = {
  error: "unavailable" | "unauthenticated" | "not_found";
  message: string;
};

export function registerExecuteBoardRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.get("/v1/execute", async (request, reply): Promise<ExecuteBoardView | ExecuteBoardErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "Execute board storage is unavailable" };
    }

    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }

    const board = await findExecuteBoard(database, userId);
    if (!board) {
      reply.code(404);
      return { error: "not_found", message: "No active Current Season exists" };
    }

    return {
      seasonId: board.season.id as SeasonId,
      seasonTitle: board.season.title,
      outcomes: board.outcomes.map((group) => ({
        outcome: toOutcomeView(group.outcome),
        projects: group.projects.map(({ project, actions }) => ({
          project: toProjectView(project),
          actions: actions.map(toActionView)
        })),
        unassignedActions: group.unassignedActions.map(toActionView)
      }))
    };
  });
}

function toOutcomeView(row: OutcomeRow): OutcomeView {
  if (!row.seasonId) throw new Error("Outcome must remain linked to a Season");
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
  if (!row.outcomeId) throw new Error("Project must remain linked to an Outcome");
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

function toActionView(row: ActionRow): ActionView {
  if (!row.outcomeId) throw new Error("Action must remain linked to an Outcome");
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
