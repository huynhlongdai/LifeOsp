import { and, asc, eq, inArray } from "drizzle-orm";
import type { DatabaseClient } from "./index.js";
import * as schema from "./schema.js";

export type ExecuteBoardRows = {
  season: schema.SeasonRow;
  outcomes: Array<{
    outcome: schema.OutcomeRow;
    projects: Array<{ project: schema.ProjectRow; actions: schema.ActionRow[] }>;
    unassignedActions: schema.ActionRow[];
  }>;
};

/**
 * Reads the EXECUTE board for the user's single active Season. Returns null when no
 * Season is active — EXECUTE never invents a Season to fill the screen.
 */
export async function findExecuteBoard(
  database: DatabaseClient,
  userId: string
): Promise<ExecuteBoardRows | null> {
  const [season] = await database.db
    .select()
    .from(schema.seasons)
    .where(and(eq(schema.seasons.userId, userId), eq(schema.seasons.status, "active")))
    .limit(1);

  if (!season) return null;

  const outcomes = await database.db
    .select()
    .from(schema.outcomes)
    .where(and(eq(schema.outcomes.userId, userId), eq(schema.outcomes.seasonId, season.id)))
    .orderBy(asc(schema.outcomes.createdAt), asc(schema.outcomes.id));

  if (outcomes.length === 0) return { season, outcomes: [] };

  const outcomeIds = outcomes.map((outcome) => outcome.id);

  const projects = await database.db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.userId, userId), inArray(schema.projects.outcomeId, outcomeIds)))
    .orderBy(asc(schema.projects.createdAt), asc(schema.projects.id));

  const actions = await database.db
    .select()
    .from(schema.actions)
    .where(and(eq(schema.actions.userId, userId), inArray(schema.actions.outcomeId, outcomeIds)))
    .orderBy(asc(schema.actions.createdAt), asc(schema.actions.id));

  const actionsByProject = new Map<string, schema.ActionRow[]>();
  const actionsByOutcome = new Map<string, schema.ActionRow[]>();
  for (const action of actions) {
    if (action.projectId) {
      const list = actionsByProject.get(action.projectId) ?? [];
      list.push(action);
      actionsByProject.set(action.projectId, list);
      continue;
    }
    if (!action.outcomeId) continue;
    const list = actionsByOutcome.get(action.outcomeId) ?? [];
    list.push(action);
    actionsByOutcome.set(action.outcomeId, list);
  }

  const projectsByOutcome = new Map<string, schema.ProjectRow[]>();
  for (const project of projects) {
    if (!project.outcomeId) continue;
    const list = projectsByOutcome.get(project.outcomeId) ?? [];
    list.push(project);
    projectsByOutcome.set(project.outcomeId, list);
  }

  return {
    season,
    outcomes: outcomes.map((outcome) => ({
      outcome,
      projects: (projectsByOutcome.get(outcome.id) ?? []).map((project) => ({
        project,
        actions: actionsByProject.get(project.id) ?? []
      })),
      unassignedActions: actionsByOutcome.get(outcome.id) ?? []
    }))
  };
}
