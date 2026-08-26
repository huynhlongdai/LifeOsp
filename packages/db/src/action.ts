import { and, eq } from "drizzle-orm";
import type { DatabaseClient } from "./index.js";
import * as schema from "./schema.js";

export type ActionContextRows = {
  season: schema.SeasonRow;
  outcome: schema.OutcomeRow;
  project?: schema.ProjectRow;
};

export type ActionContextResult =
  | { status: "ok"; context: ActionContextRows }
  | { status: "not_found" }
  | { status: "inactive_context" };

export async function findActionContext(
  database: DatabaseClient,
  userId: string,
  outcomeId: string,
  projectId?: string
): Promise<ActionContextResult> {
  const [outcome] = await database.db
    .select()
    .from(schema.outcomes)
    .where(and(eq(schema.outcomes.id, outcomeId), eq(schema.outcomes.userId, userId)))
    .limit(1);
  if (!outcome || !outcome.seasonId) return { status: "not_found" };

  const [season] = await database.db
    .select()
    .from(schema.seasons)
    .where(and(eq(schema.seasons.id, outcome.seasonId), eq(schema.seasons.userId, userId)))
    .limit(1);
  if (!season) return { status: "not_found" };
  if (outcome.status !== "active" || season.status !== "active") return { status: "inactive_context" };

  if (!projectId) return { status: "ok", context: { season, outcome } };

  const [project] = await database.db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.userId, userId),
        eq(schema.projects.outcomeId, outcome.id)
      )
    )
    .limit(1);
  if (!project) return { status: "not_found" };
  if (project.status !== "active") return { status: "inactive_context" };
  return { status: "ok", context: { season, outcome, project } };
}

export type CreateActionCandidateParams = {
  userId: string;
  outcomeId: string;
  projectId?: string;
  title: string;
  doneCondition?: string;
  estimatedMinutes?: number;
  priority?: number;
  source: "user" | "ai";
  proposalReason?: string;
  proposalAssumptions?: string[];
};

export type CreateActionCandidateResult =
  | { status: "created"; action: schema.ActionRow }
  | { status: "not_found" }
  | { status: "inactive_context" };

export async function createActionCandidate(
  database: DatabaseClient,
  params: CreateActionCandidateParams
): Promise<CreateActionCandidateResult> {
  return database.db.transaction(async (transaction) => {
    const [outcome] = await transaction
      .select()
      .from(schema.outcomes)
      .where(and(eq(schema.outcomes.id, params.outcomeId), eq(schema.outcomes.userId, params.userId)))
      .limit(1)
      .for("update");
    if (!outcome || !outcome.seasonId) return { status: "not_found" };

    const [season] = await transaction
      .select()
      .from(schema.seasons)
      .where(and(eq(schema.seasons.id, outcome.seasonId), eq(schema.seasons.userId, params.userId)))
      .limit(1)
      .for("update");
    if (!season) return { status: "not_found" };
    if (outcome.status !== "active" || season.status !== "active") return { status: "inactive_context" };

    let project: schema.ProjectRow | undefined;
    if (params.projectId) {
      [project] = await transaction
        .select()
        .from(schema.projects)
        .where(
          and(
            eq(schema.projects.id, params.projectId),
            eq(schema.projects.userId, params.userId),
            eq(schema.projects.outcomeId, outcome.id)
          )
        )
        .limit(1)
        .for("update");
      if (!project) return { status: "not_found" };
      if (project.status !== "active") return { status: "inactive_context" };
    }

    const now = new Date();
    const [action] = await transaction
      .insert(schema.actions)
      .values({
        userId: params.userId,
        outcomeId: outcome.id,
        ...(project === undefined ? {} : { projectId: project.id }),
        title: params.title,
        ...(params.doneCondition === undefined ? {} : { doneCondition: params.doneCondition }),
        ...(params.estimatedMinutes === undefined ? {} : { estimatedMinutes: params.estimatedMinutes }),
        ...(params.priority === undefined ? {} : { priority: params.priority }),
        status: "candidate",
        updatedAt: now
      })
      .returning();
    if (!action) throw new Error("Failed to create Action candidate");

    await transaction.insert(schema.lifeEvents).values({
      userId: params.userId,
      type: "action.created",
      source: params.source,
      entityType: "action",
      entityId: action.id,
      payload: {
        status: "candidate",
        outcomeId: outcome.id,
        projectId: project?.id ?? null,
        seasonId: season.id,
        origin: params.source === "ai" ? "ai_proposal" : "manual",
        ...(params.proposalReason === undefined ? {} : { proposalReason: params.proposalReason }),
        ...(params.proposalAssumptions === undefined ? {} : { proposalAssumptions: params.proposalAssumptions })
      }
    });

    return { status: "created", action };
  });
}

export type ConfirmActionCandidateParams = {
  userId: string;
  actionId: string;
  title?: string;
  doneCondition?: string;
  estimatedMinutes?: number;
  priority?: number;
};

export type ConfirmActionCandidateResult =
  | { status: "confirmed"; action: schema.ActionRow }
  | { status: "not_found" }
  | { status: "inactive_context" }
  | { status: "invalid_status"; currentStatus: string };

export async function confirmActionCandidate(
  database: DatabaseClient,
  params: ConfirmActionCandidateParams
): Promise<ConfirmActionCandidateResult> {
  return database.db.transaction(async (transaction) => {
    const [action] = await transaction
      .select()
      .from(schema.actions)
      .where(and(eq(schema.actions.id, params.actionId), eq(schema.actions.userId, params.userId)))
      .limit(1)
      .for("update");
    if (!action || !action.outcomeId) return { status: "not_found" };
    if (action.status !== "candidate") return { status: "invalid_status", currentStatus: action.status };

    const [outcome] = await transaction
      .select()
      .from(schema.outcomes)
      .where(and(eq(schema.outcomes.id, action.outcomeId), eq(schema.outcomes.userId, params.userId)))
      .limit(1)
      .for("update");
    if (!outcome || !outcome.seasonId) return { status: "not_found" };

    const [season] = await transaction
      .select()
      .from(schema.seasons)
      .where(and(eq(schema.seasons.id, outcome.seasonId), eq(schema.seasons.userId, params.userId)))
      .limit(1)
      .for("update");
    if (!season) return { status: "not_found" };
    if (outcome.status !== "active" || season.status !== "active") return { status: "inactive_context" };

    if (action.projectId) {
      const [project] = await transaction
        .select({ status: schema.projects.status })
        .from(schema.projects)
        .where(
          and(
            eq(schema.projects.id, action.projectId),
            eq(schema.projects.userId, params.userId),
            eq(schema.projects.outcomeId, outcome.id)
          )
        )
        .limit(1)
        .for("update");
      if (!project) return { status: "not_found" };
      if (project.status !== "active") return { status: "inactive_context" };
    }

    const now = new Date();
    const [ready] = await transaction
      .update(schema.actions)
      .set({
        status: "ready",
        ...(params.title === undefined ? {} : { title: params.title }),
        ...(params.doneCondition === undefined ? {} : { doneCondition: params.doneCondition }),
        ...(params.estimatedMinutes === undefined ? {} : { estimatedMinutes: params.estimatedMinutes }),
        ...(params.priority === undefined ? {} : { priority: params.priority }),
        updatedAt: now
      })
      .where(and(eq(schema.actions.id, action.id), eq(schema.actions.userId, params.userId)))
      .returning();
    if (!ready) throw new Error("Failed to confirm Action candidate");

    await transaction.insert(schema.lifeEvents).values({
      userId: params.userId,
      type: "action.ready",
      source: "user",
      entityType: "action",
      entityId: ready.id,
      payload: {
        previousStatus: "candidate",
        status: "ready",
        outcomeId: outcome.id,
        projectId: ready.projectId,
        seasonId: season.id
      }
    });

    return { status: "confirmed", action: ready };
  });
}

export async function findActionById(
  database: DatabaseClient,
  userId: string,
  actionId: string
): Promise<schema.ActionRow | null> {
  const [action] = await database.db
    .select()
    .from(schema.actions)
    .where(and(eq(schema.actions.id, actionId), eq(schema.actions.userId, userId)))
    .limit(1);
  return action ?? null;
}
