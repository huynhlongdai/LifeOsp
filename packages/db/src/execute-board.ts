import { and, desc, eq, inArray } from "drizzle-orm";
import type { ActionId, ExecuteActionView, ExecuteBoardView, OutcomeId, ProjectId } from "@lifeos/domain";
import { EXECUTE_RECENTLY_FINISHED_LIMIT } from "@lifeos/domain";
import type { DatabaseClient } from "./index.js";
import * as schema from "./schema.js";

function toExecuteActionView(row: schema.ActionRow): ExecuteActionView {
  if (!row.outcomeId) throw new Error("Action must remain linked to an Outcome");
  return {
    id: row.id as ActionId,
    outcomeId: row.outcomeId as OutcomeId,
    ...(row.projectId === null ? {} : { projectId: row.projectId as ProjectId }),
    title: row.title,
    ...(row.doneCondition === null ? {} : { doneCondition: row.doneCondition }),
    ...(row.estimatedMinutes === null ? {} : { estimatedMinutes: row.estimatedMinutes }),
    status: row.status as ExecuteActionView["status"],
    ...(row.priority === null ? {} : { priority: row.priority }),
    ...(row.blockedReason === null ? {} : { blockedReason: row.blockedReason }),
    ...(row.completedAt === null ? {} : { completedAt: row.completedAt.toISOString() }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function readExecuteBoard(database: DatabaseClient, userId: string): Promise<ExecuteBoardView> {
  const [ready, candidates, blocked, recentlyFinished, outcomeRows, projectRows] = await Promise.all([
    database.db
      .select()
      .from(schema.actions)
      .where(and(eq(schema.actions.userId, userId), eq(schema.actions.status, "ready")))
      .orderBy(schema.actions.createdAt),
    database.db
      .select()
      .from(schema.actions)
      .where(and(eq(schema.actions.userId, userId), eq(schema.actions.status, "candidate")))
      .orderBy(schema.actions.createdAt),
    database.db
      .select()
      .from(schema.actions)
      .where(and(eq(schema.actions.userId, userId), eq(schema.actions.status, "blocked")))
      .orderBy(schema.actions.createdAt),
    database.db
      .select()
      .from(schema.actions)
      .where(and(eq(schema.actions.userId, userId), inArray(schema.actions.status, ["completed", "partial"])))
      .orderBy(desc(schema.actions.completedAt), desc(schema.actions.updatedAt))
      .limit(EXECUTE_RECENTLY_FINISHED_LIMIT),
    database.db
      .select({ id: schema.outcomes.id, title: schema.outcomes.title })
      .from(schema.outcomes)
      .where(and(eq(schema.outcomes.userId, userId), eq(schema.outcomes.status, "active"))),
    database.db
      .select({ id: schema.projects.id, outcomeId: schema.projects.outcomeId, title: schema.projects.title })
      .from(schema.projects)
      .where(and(eq(schema.projects.userId, userId), inArray(schema.projects.status, ["candidate", "active"])))
  ]);

  return {
    generatedAt: new Date().toISOString(),
    ready: ready.map(toExecuteActionView),
    candidates: candidates.map(toExecuteActionView),
    blocked: blocked.map(toExecuteActionView),
    recentlyFinished: recentlyFinished.map(toExecuteActionView),
    outcomes: outcomeRows.map((row) => ({ id: row.id as OutcomeId, title: row.title })),
    projects: projectRows
      .filter((row): row is typeof row & { outcomeId: string } => row.outcomeId !== null)
      .map((row) => ({ id: row.id as ProjectId, outcomeId: row.outcomeId as OutcomeId, title: row.title }))
  };
}
