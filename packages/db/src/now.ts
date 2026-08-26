import {
  NEXT_ACTION_FACTOR_KEYS,
  type ActionId,
  type EvidenceStrength,
  type NextActionFactorKey,
  type NowEvidenceItem,
  type NowSeasonContext,
  type NowView,
  type RecommendationConfidenceClass,
  type RecommendationId,
  type ResolveNowRecommendationInput,
  type SeasonId
} from "@lifeos/domain";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { DatabaseClient } from "./index.js";
import * as schema from "./schema.js";

const NOW_RECOMMENDATION_STATUSES = ["shown", "accepted", "edited", "not_now", "wrong_assumption"] as const;
const READY_RECOMMENDATION_STATUSES = ["shown", "accepted", "edited"] as const;
const NEXT_ACTION_CONTRACT = "next-action-recommendation-v0" as const;

export type ResolveNowRecommendationResult =
  | { status: "resolved"; recommendation: schema.RecommendationRow; action: schema.ActionRow }
  | { status: "not_found" }
  | { status: "invalid_status"; currentStatus: string }
  | { status: "invalid_action" };

export async function readNowView(
  database: DatabaseClient,
  userId: string,
  generatedAt: Date
): Promise<NowView> {
  const [season] = await database.db
    .select()
    .from(schema.seasons)
    .where(and(eq(schema.seasons.userId, userId), eq(schema.seasons.status, "active")))
    .limit(1);

  if (!season) {
    return {
      state: "no_direction",
      generatedAt: generatedAt.toISOString(),
      message: "Hãy chọn một hướng hiện tại trước khi LifeOS đề xuất việc nên làm tiếp theo."
    };
  }

  const seasonView = toSeasonContext(season);
  const [latestRecommendation] = await database.db
    .select()
    .from(schema.recommendations)
    .where(
      and(
        eq(schema.recommendations.userId, userId),
        eq(schema.recommendations.kind, "next_action"),
        inArray(schema.recommendations.status, [...NOW_RECOMMENDATION_STATUSES])
      )
    )
    .orderBy(desc(schema.recommendations.createdAt))
    .limit(1);

  if (
    latestRecommendation &&
    (READY_RECOMMENDATION_STATUSES as readonly string[]).includes(latestRecommendation.status)
  ) {
    const readyView = await tryBuildReadyView(database, userId, season, latestRecommendation, generatedAt);
    if (readyView) return readyView;
  }

  const executionRows = await database.db
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

  const contextValid = (row: (typeof executionRows)[number]) =>
    row.outcome.status === "active" &&
    (row.action.projectId === null || (row.project !== null && row.project.status === "active"));

  const readyActionCount = executionRows.filter(
    (row) => row.action.status === "ready" && contextValid(row)
  ).length;
  const blockedActionCount = executionRows.filter(
    (row) => row.action.status === "blocked" && contextValid(row)
  ).length;

  if (readyActionCount === 0 && blockedActionCount > 0) {
    return {
      state: "blocked",
      generatedAt: generatedAt.toISOString(),
      season: seasonView,
      blockedActionCount,
      message: "Các Action hiện tại đang bị chặn. Gỡ một blocker trước khi chọn việc tiếp theo."
    };
  }

  const latestWasResolved =
    latestRecommendation?.status === "not_now" || latestRecommendation?.status === "wrong_assumption";

  return {
    state: "no_ready_action",
    generatedAt: generatedAt.toISOString(),
    season: seasonView,
    readyActionCount,
    reason: latestWasResolved
      ? "recommendation_resolved"
      : readyActionCount > 0
        ? "recommendation_missing"
        : "none_ready",
    message: latestWasResolved
      ? "Recommendation trước đã được bạn xử lý. LifeOS sẽ không tự đưa nó trở lại."
      : readyActionCount > 0
        ? "Có Action sẵn sàng nhưng chưa có recommendation hiện hành."
        : "Chưa có Action sẵn sàng trong Current Season này."
  };
}

export async function resolveNowRecommendation(
  database: DatabaseClient,
  userId: string,
  recommendationId: string,
  input: ResolveNowRecommendationInput,
  resolvedAt: Date
): Promise<ResolveNowRecommendationResult> {
  return database.db.transaction(async (transaction) => {
    const [recommendation] = await transaction
      .select()
      .from(schema.recommendations)
      .where(
        and(
          eq(schema.recommendations.id, recommendationId),
          eq(schema.recommendations.userId, userId),
          eq(schema.recommendations.kind, "next_action")
        )
      )
      .limit(1)
      .for("update");

    if (!recommendation) return { status: "not_found" };

    const allowedCurrentStatuses =
      input.resolution === "accepted" ? ["shown"] : ["shown", "accepted", "edited"];
    if (!allowedCurrentStatuses.includes(recommendation.status)) {
      return { status: "invalid_status", currentStatus: recommendation.status };
    }

    const actionId = getRecommendationActionId(recommendation);
    if (!actionId) return { status: "invalid_action" };

    const [currentAction] = await transaction
      .select()
      .from(schema.actions)
      .where(and(eq(schema.actions.id, actionId), eq(schema.actions.userId, userId)))
      .limit(1)
      .for("update");
    if (!currentAction) return { status: "invalid_action" };

    let action = currentAction;
    let changes: Record<string, unknown> | undefined;

    if (input.resolution === "edited") {
      if (!input.action || Object.keys(input.action).length === 0) return { status: "invalid_action" };
      const patch: Partial<schema.NewActionRow> = { updatedAt: resolvedAt };
      changes = {};

      if (input.action.title !== undefined) {
        patch.title = input.action.title;
        changes.title = input.action.title;
      }
      if (input.action.doneCondition !== undefined) {
        patch.doneCondition = input.action.doneCondition;
        changes.doneCondition = input.action.doneCondition;
      }
      if (input.action.estimatedMinutes !== undefined) {
        patch.estimatedMinutes = input.action.estimatedMinutes;
        changes.estimatedMinutes = input.action.estimatedMinutes;
      }

      const [updatedAction] = await transaction
        .update(schema.actions)
        .set(patch)
        .where(and(eq(schema.actions.id, currentAction.id), eq(schema.actions.userId, userId)))
        .returning();
      if (!updatedAction) throw new Error("Failed to edit Action from NOW recommendation");
      action = updatedAction;
    }

    const [updatedRecommendation] = await transaction
      .update(schema.recommendations)
      .set({
        status: input.resolution,
        resolvedAt,
        ...(input.resolution === "edited" ? { title: action.title } : {})
      })
      .where(and(eq(schema.recommendations.id, recommendation.id), eq(schema.recommendations.userId, userId)))
      .returning();
    if (!updatedRecommendation) throw new Error("Failed to resolve NOW recommendation");

    await transaction.insert(schema.lifeEvents).values({
      userId,
      type: `recommendation.${input.resolution}`,
      source: "user",
      entityType: "recommendation",
      entityId: recommendation.id,
      payload: {
        kind: "next_action",
        actionId: action.id,
        resolution: input.resolution,
        ...(changes === undefined ? {} : { changes })
      },
      occurredAt: resolvedAt
    });

    return { status: "resolved", recommendation: updatedRecommendation, action };
  });
}

async function tryBuildReadyView(
  database: DatabaseClient,
  userId: string,
  season: schema.SeasonRow,
  recommendation: schema.RecommendationRow,
  generatedAt: Date
): Promise<Extract<NowView, { state: "ready" }> | null> {
  const actionId = getRecommendationActionId(recommendation);
  if (!actionId) return null;

  const [row] = await database.db
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
    .where(and(eq(schema.actions.id, actionId), eq(schema.actions.userId, userId)))
    .limit(1);

  if (!row || row.action.status !== "ready" || row.outcome.status !== "active") return null;
  if (row.action.projectId !== null && (!row.project || row.project.status !== "active")) return null;

  const payloadSeasonId = getRecommendationSeasonId(recommendation);
  if (payloadSeasonId !== season.id) return null;

  const evidenceRows = await database.db
    .select()
    .from(schema.recommendationEvidence)
    .where(eq(schema.recommendationEvidence.recommendationId, recommendation.id));
  const evidence = evidenceRows.map(parseEvidence).filter((item): item is NowEvidenceItem => item !== null);
  evidence.sort(
    (left, right) => NEXT_ACTION_FACTOR_KEYS.indexOf(left.key) - NEXT_ACTION_FACTOR_KEYS.indexOf(right.key)
  );

  return {
    state: "ready",
    generatedAt: generatedAt.toISOString(),
    season: toSeasonContext(season),
    action: {
      id: row.action.id as ActionId,
      title: row.action.title,
      ...(row.action.doneCondition === null ? {} : { doneCondition: row.action.doneCondition }),
      ...(row.action.estimatedMinutes === null ? {} : { estimatedMinutes: row.action.estimatedMinutes }),
      ...(row.action.scheduledFor === null ? {} : { scheduledFor: row.action.scheduledFor.toISOString() }),
      ...(row.action.priority === null ? {} : { priority: row.action.priority })
    },
    recommendation: {
      id: recommendation.id as RecommendationId,
      title: recommendation.title,
      rationale: recommendation.rationale,
      confidenceClass: recommendation.confidenceClass as RecommendationConfidenceClass,
      status: recommendation.status as "shown" | "accepted" | "edited",
      evidence
    }
  };
}

function toSeasonContext(season: schema.SeasonRow): NowSeasonContext {
  return {
    id: season.id as SeasonId,
    title: season.title,
    purpose: season.purpose,
    ...(season.primaryFocusText === null ? {} : { primaryFocusText: season.primaryFocusText })
  };
}

function getRecommendationActionId(recommendation: schema.RecommendationRow): string | null {
  if (recommendation.proposedEntityType !== "action" || !isRecord(recommendation.proposedEntityPayload)) return null;
  const payload = recommendation.proposedEntityPayload;
  if (payload.contract !== NEXT_ACTION_CONTRACT || typeof payload.actionId !== "string") return null;
  return payload.actionId;
}

function getRecommendationSeasonId(recommendation: schema.RecommendationRow): string | null {
  if (!isRecord(recommendation.proposedEntityPayload)) return null;
  const payload = recommendation.proposedEntityPayload;
  return typeof payload.seasonId === "string" ? payload.seasonId : null;
}

function parseEvidence(row: schema.RecommendationEvidenceRow): NowEvidenceItem | null {
  if (!(NEXT_ACTION_FACTOR_KEYS as readonly string[]).includes(row.evidenceType)) return null;
  if (!isRecord(row.valueJson) || typeof row.valueJson.score !== "number") return null;
  const { score, rulesetVersion: _rulesetVersion, ...value } = row.valueJson;
  return {
    key: row.evidenceType as NextActionFactorKey,
    label: row.label,
    score,
    value,
    strength: row.strength as EvidenceStrength
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
