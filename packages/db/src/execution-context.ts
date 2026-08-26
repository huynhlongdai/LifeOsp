import { and, asc, eq, inArray } from "drizzle-orm";
import type { DatabaseClient } from "./index.js";
import * as schema from "./schema.js";

export type CreateExecutionContextParams = {
  userId: string;
  seasonId: string;
  outcome: {
    title: string;
    successDefinition?: string;
  };
  project?: {
    title: string;
    description?: string;
  };
};

export type CreateExecutionContextResult =
  | {
      status: "created";
      season: schema.SeasonRow;
      outcome: schema.OutcomeRow;
      project?: schema.ProjectRow;
    }
  | { status: "season_not_found" }
  | { status: "season_not_active" };

export async function createExecutionContext(
  database: DatabaseClient,
  params: CreateExecutionContextParams
): Promise<CreateExecutionContextResult> {
  return database.db.transaction(async (transaction) => {
    const [season] = await transaction
      .select()
      .from(schema.seasons)
      .where(and(eq(schema.seasons.id, params.seasonId), eq(schema.seasons.userId, params.userId)))
      .limit(1)
      .for("update");

    if (!season) return { status: "season_not_found" };
    if (season.status !== "active") return { status: "season_not_active" };

    const now = new Date();
    const [outcome] = await transaction
      .insert(schema.outcomes)
      .values({
        userId: params.userId,
        seasonId: season.id,
        title: params.outcome.title,
        ...(params.outcome.successDefinition === undefined
          ? {}
          : { successDefinition: params.outcome.successDefinition }),
        status: "active",
        updatedAt: now
      })
      .returning();
    if (!outcome) throw new Error("Failed to create Outcome");

    let project: schema.ProjectRow | undefined;
    if (params.project) {
      [project] = await transaction
        .insert(schema.projects)
        .values({
          userId: params.userId,
          outcomeId: outcome.id,
          title: params.project.title,
          ...(params.project.description === undefined ? {} : { description: params.project.description }),
          status: "active",
          updatedAt: now
        })
        .returning();
      if (!project) throw new Error("Failed to create Project");
    }

    const events: schema.NewLifeEventRow[] = [
      {
        userId: params.userId,
        type: "outcome.created",
        source: "user",
        entityType: "outcome",
        entityId: outcome.id,
        payload: {
          seasonId: season.id,
          status: "active"
        }
      }
    ];

    if (project) {
      events.push({
        userId: params.userId,
        type: "project.started",
        source: "user",
        entityType: "project",
        entityId: project.id,
        payload: {
          outcomeId: outcome.id,
          seasonId: season.id,
          status: "active"
        }
      });
    }

    await transaction.insert(schema.lifeEvents).values(events);

    return project
      ? { status: "created", season, outcome, project }
      : { status: "created", season, outcome };
  });
}

export type CurrentExecutionContextRows = {
  season: schema.SeasonRow;
  outcomes: Array<{
    outcome: schema.OutcomeRow;
    projects: schema.ProjectRow[];
  }>;
};

export async function findCurrentExecutionContext(
  database: DatabaseClient,
  userId: string
): Promise<CurrentExecutionContextRows | null> {
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

  const projects = await database.db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.userId, userId),
        inArray(
          schema.projects.outcomeId,
          outcomes.map((outcome) => outcome.id)
        )
      )
    )
    .orderBy(asc(schema.projects.createdAt), asc(schema.projects.id));

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
      projects: projectsByOutcome.get(outcome.id) ?? []
    }))
  };
}
