import {
  NEXT_ACTION_RULESET_VERSION,
  rankNextActions,
  type ActionId,
  type NextActionRankingCandidate,
  type NextActionScoreFactor,
  type OutcomeId,
  type ProjectId,
  type SeasonId
} from "@lifeos/domain";
import { and, desc, eq } from "drizzle-orm";
import type { DatabaseClient } from "./index.js";
import * as schema from "./schema.js";

const NEXT_ACTION_RECOMMENDATION_KIND = "next_action" as const;
const NEXT_ACTION_RECOMMENDATION_STATUS = "shown" as const;
const NEXT_ACTION_RECOMMENDATION_CONTRACT = "next-action-recommendation-v0" as const;

export type GenerateNextActionRecommendationResult =
  | {
      status: "shown";
      recommendation: schema.RecommendationRow;
      evidence: schema.RecommendationEvidenceRow[];
      ranking: ReturnType<typeof rankNextActions>;
      refreshed: boolean;
    }
  | { status: "no_active_season" }
  | { status: "no_eligible_actions"; evaluatedCount: number };

export async function generateNextActionRecommendation(
  database: DatabaseClient,
  userId: string,
  evaluatedAt: Date
): Promise<GenerateNextActionRecommendationResult> {
  return database.db.transaction(async (transaction) => {
    const [user] = await transaction
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)
      .for("update");
    if (!user) return { status: "no_active_season" };

    const existingShown = await transaction
      .select()
      .from(schema.recommendations)
      .where(
        and(
          eq(schema.recommendations.userId, userId),
          eq(schema.recommendations.kind, NEXT_ACTION_RECOMMENDATION_KIND),
          eq(schema.recommendations.status, NEXT_ACTION_RECOMMENDATION_STATUS)
        )
      )
      .orderBy(desc(schema.recommendations.createdAt))
      .for("update");

    const [season] = await transaction
      .select()
      .from(schema.seasons)
      .where(and(eq(schema.seasons.userId, userId), eq(schema.seasons.status, "active")))
      .limit(1)
      .for("update");

    if (!season) {
      await withdrawShownRecommendations(transaction, userId, existingShown, "no_active_season", evaluatedAt);
      return { status: "no_active_season" };
    }

    const rows = await transaction
      .select({
        action: schema.actions,
        outcome: schema.outcomes,
        project: schema.projects
      })
      .from(schema.actions)
      .innerJoin(
        schema.outcomes,
        and(
          eq(schema.actions.outcomeId, schema.outcomes.id),
          eq(schema.outcomes.userId, userId),
          eq(schema.outcomes.seasonId, season.id)
        )
      )
      .leftJoin(
        schema.projects,
        and(eq(schema.actions.projectId, schema.projects.id), eq(schema.projects.userId, userId))
      )
      .where(eq(schema.actions.userId, userId));

    const candidates = rows.map(({ action, outcome, project }) =>
      toRankingCandidate(season, outcome, action, project)
    );
    const ranking = rankNextActions(candidates, evaluatedAt);

    if (!ranking.winner) {
      await withdrawShownRecommendations(transaction, userId, existingShown, "no_eligible_actions", evaluatedAt);
      return { status: "no_eligible_actions", evaluatedCount: candidates.length };
    }

    const winner = ranking.winner;
    const now = evaluatedAt;
    const payload = {
      contract: NEXT_ACTION_RECOMMENDATION_CONTRACT,
      rulesetVersion: NEXT_ACTION_RULESET_VERSION,
      evaluatedAt: ranking.evaluatedAt,
      seasonId: winner.candidate.seasonId,
      outcomeId: winner.candidate.outcomeId,
      projectId: winner.candidate.projectId ?? null,
      actionId: winner.candidate.actionId,
      totalScore: winner.totalScore,
      eligibleCount: ranking.eligibleCount,
      action: {
        title: winner.candidate.title,
        doneCondition: winner.candidate.doneCondition ?? null,
        estimatedMinutes: winner.candidate.estimatedMinutes ?? null,
        scheduledFor: winner.candidate.scheduledFor ?? null
      }
    };
    const rationale = buildRationale(winner.factors);

    let recommendation: schema.RecommendationRow;
    let refreshed = false;
    const primaryExisting = existingShown[0];
    if (primaryExisting) {
      refreshed = true;
      const [updated] = await transaction
        .update(schema.recommendations)
        .set({
          title: winner.candidate.title,
          rationale,
          confidenceClass: "direct",
          proposedEntityType: "action",
          proposedEntityPayload: payload,
          shownAt: now,
          resolvedAt: null
        })
        .where(
          and(
            eq(schema.recommendations.id, primaryExisting.id),
            eq(schema.recommendations.userId, userId)
          )
        )
        .returning();
      if (!updated) throw new Error("Failed to refresh next Action recommendation");
      recommendation = updated;

      await transaction
        .delete(schema.recommendationEvidence)
        .where(eq(schema.recommendationEvidence.recommendationId, recommendation.id));

      for (const duplicate of existingShown.slice(1)) {
        await transaction.delete(schema.recommendations).where(eq(schema.recommendations.id, duplicate.id));
      }
    } else {
      const [created] = await transaction
        .insert(schema.recommendations)
        .values({
          userId,
          kind: NEXT_ACTION_RECOMMENDATION_KIND,
          title: winner.candidate.title,
          rationale,
          confidenceClass: "direct",
          status: NEXT_ACTION_RECOMMENDATION_STATUS,
          proposedEntityType: "action",
          proposedEntityPayload: payload,
          shownAt: now
        })
        .returning();
      if (!created) throw new Error("Failed to create next Action recommendation");
      recommendation = created;
    }

    const evidence = await transaction
      .insert(schema.recommendationEvidence)
      .values(
        winner.factors.map((factor) => ({
          recommendationId: recommendation.id,
          evidenceType: factor.key,
          entityType: "action",
          entityId: winner.candidate.actionId,
          label: factor.label,
          valueJson: {
            score: factor.score,
            ...factor.value,
            rulesetVersion: NEXT_ACTION_RULESET_VERSION
          },
          strength:
            factor.key === "active_context" || factor.key === "user_priority" || factor.key === "urgency"
              ? "direct"
              : "supporting"
        }))
      )
      .returning();

    await transaction.insert(schema.lifeEvents).values({
      userId,
      type: "recommendation.shown",
      source: "system",
      entityType: "recommendation",
      entityId: recommendation.id,
      payload: {
        kind: NEXT_ACTION_RECOMMENDATION_KIND,
        rulesetVersion: NEXT_ACTION_RULESET_VERSION,
        seasonId: winner.candidate.seasonId,
        outcomeId: winner.candidate.outcomeId,
        projectId: winner.candidate.projectId ?? null,
        actionId: winner.candidate.actionId,
        totalScore: winner.totalScore,
        eligibleCount: ranking.eligibleCount,
        factors: winner.factors.map((factor) => ({
          key: factor.key,
          score: factor.score,
          label: factor.label,
          value: factor.value
        })),
        refreshed
      },
      occurredAt: now
    });

    return { status: "shown", recommendation, evidence, ranking, refreshed };
  });
}

export async function findShownNextActionRecommendation(
  database: DatabaseClient,
  userId: string
): Promise<{ recommendation: schema.RecommendationRow; evidence: schema.RecommendationEvidenceRow[] } | null> {
  const [recommendation] = await database.db
    .select()
    .from(schema.recommendations)
    .where(
      and(
        eq(schema.recommendations.userId, userId),
        eq(schema.recommendations.kind, NEXT_ACTION_RECOMMENDATION_KIND),
        eq(schema.recommendations.status, NEXT_ACTION_RECOMMENDATION_STATUS)
      )
    )
    .orderBy(desc(schema.recommendations.createdAt))
    .limit(1);
  if (!recommendation) return null;

  const evidence = await database.db
    .select()
    .from(schema.recommendationEvidence)
    .where(eq(schema.recommendationEvidence.recommendationId, recommendation.id));
  return { recommendation, evidence };
}

function toRankingCandidate(
  season: schema.SeasonRow,
  outcome: schema.OutcomeRow,
  action: schema.ActionRow,
  project: schema.ProjectRow | null
): NextActionRankingCandidate {
  if (!action.outcomeId) throw new Error("B2 cannot rank an Action without an Outcome");
  if (action.projectId !== null && !project) {
    throw new Error("B2 cannot rank an Action whose Project relation is missing or not owned by the user");
  }
  return {
    actionId: action.id as ActionId,
    outcomeId: action.outcomeId as OutcomeId,
    ...(action.projectId === null ? {} : { projectId: action.projectId as ProjectId }),
    seasonId: season.id as SeasonId,
    title: action.title,
    ...(action.doneCondition === null ? {} : { doneCondition: action.doneCondition }),
    ...(action.estimatedMinutes === null ? {} : { estimatedMinutes: action.estimatedMinutes }),
    ...(action.priority === null ? {} : { priority: action.priority }),
    ...(action.scheduledFor === null ? {} : { scheduledFor: action.scheduledFor.toISOString() }),
    createdAt: action.createdAt.toISOString(),
    actionStatus: action.status as NextActionRankingCandidate["actionStatus"],
    outcomeStatus: outcome.status as NextActionRankingCandidate["outcomeStatus"],
    ...(action.projectId === null
      ? {}
      : { projectStatus: project!.status as NonNullable<NextActionRankingCandidate["projectStatus"]> }),
    seasonStatus: season.status as NextActionRankingCandidate["seasonStatus"]
  };
}

function buildRationale(factors: readonly NextActionScoreFactor[]): string {
  const meaningful = factors
    .filter((factor) => factor.key !== "active_context" && factor.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)
    .map((factor) => factor.label);
  if (meaningful.length === 0) return "Ready Action in the active Current Season.";
  return meaningful.join(" · ");
}

type RankingTransaction = Parameters<Parameters<DatabaseClient["db"]["transaction"]>[0]>[0];

async function withdrawShownRecommendations(
  transaction: RankingTransaction,
  userId: string,
  shown: schema.RecommendationRow[],
  reason: "no_active_season" | "no_eligible_actions",
  occurredAt: Date
): Promise<void> {
  for (const recommendation of shown) {
    await transaction.delete(schema.recommendations).where(eq(schema.recommendations.id, recommendation.id));
    await transaction.insert(schema.lifeEvents).values({
      userId,
      type: "recommendation.withdrawn",
      source: "system",
      entityType: "recommendation",
      entityId: recommendation.id,
      payload: { kind: NEXT_ACTION_RECOMMENDATION_KIND, reason },
      occurredAt
    });
  }
}
