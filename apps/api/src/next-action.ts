import {
  findShownNextActionRecommendation,
  generateNextActionRecommendation,
  type DatabaseClient,
  type RecommendationEvidenceRow,
  type RecommendationRow
} from "@lifeos/db";
import {
  NEXT_ACTION_FACTOR_KEYS,
  NEXT_ACTION_RULESET_VERSION,
  type ActionId,
  type NextActionRecommendationView,
  type NextActionScoreFactor,
  type OutcomeId,
  type ProjectId,
  type RecommendationId,
  type SeasonId
} from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

type NextActionErrorView = {
  error:
    | "unavailable"
    | "unauthenticated"
    | "no_active_season"
    | "no_eligible_actions"
    | "not_found"
    | "invalid_stored_recommendation";
  message: string;
  evaluatedCount?: number;
};

export function registerNextActionRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.post(
    "/v1/recommendations/next-action",
    async (request, reply): Promise<NextActionRecommendationView | NextActionErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Next Action recommendation storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const result = await generateNextActionRecommendation(database, userId, new Date());
      if (result.status === "no_active_season") {
        reply.code(409);
        return { error: "no_active_season", message: "An active Current Season is required before ranking Actions" };
      }
      if (result.status === "no_eligible_actions") {
        reply.code(409);
        return {
          error: "no_eligible_actions",
          message: "No ready Action is eligible under the active Current Season",
          evaluatedCount: result.evaluatedCount
        };
      }

      const winner = result.ranking.winner;
      if (!winner) throw new Error("B2 shown result must include a deterministic winner");
      return {
        recommendationId: result.recommendation.id as RecommendationId,
        rulesetVersion: NEXT_ACTION_RULESET_VERSION,
        evaluatedAt: result.ranking.evaluatedAt,
        seasonId: winner.candidate.seasonId,
        actionId: winner.candidate.actionId,
        outcomeId: winner.candidate.outcomeId,
        ...(winner.candidate.projectId === undefined ? {} : { projectId: winner.candidate.projectId }),
        title: result.recommendation.title,
        rationale: result.recommendation.rationale,
        totalScore: winner.totalScore,
        confidenceClass: "direct",
        status: "shown",
        factors: winner.factors,
        action: {
          title: winner.candidate.title,
          ...(winner.candidate.doneCondition === undefined ? {} : { doneCondition: winner.candidate.doneCondition }),
          ...(winner.candidate.estimatedMinutes === undefined
            ? {}
            : { estimatedMinutes: winner.candidate.estimatedMinutes }),
          ...(winner.candidate.scheduledFor === undefined ? {} : { scheduledFor: winner.candidate.scheduledFor })
        }
      };
    }
  );

  app.get(
    "/v1/recommendations/next-action",
    async (request, reply): Promise<NextActionRecommendationView | NextActionErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Next Action recommendation storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const stored = await findShownNextActionRecommendation(database, userId);
      if (!stored) {
        reply.code(404);
        return { error: "not_found", message: "No shown Next Action recommendation exists" };
      }

      const view = parseStoredRecommendation(stored.recommendation, stored.evidence);
      if (!view) {
        request.log.error({ recommendationId: stored.recommendation.id }, "stored next Action recommendation is invalid");
        reply.code(500);
        return { error: "invalid_stored_recommendation", message: "Stored Next Action recommendation is invalid" };
      }
      return view;
    }
  );
}

function parseStoredRecommendation(
  recommendation: RecommendationRow,
  evidenceRows: RecommendationEvidenceRow[]
): NextActionRecommendationView | null {
  if (
    recommendation.kind !== "next_action" ||
    recommendation.status !== "shown" ||
    recommendation.confidenceClass !== "direct" ||
    recommendation.proposedEntityType !== "action" ||
    !isRecord(recommendation.proposedEntityPayload)
  ) {
    return null;
  }

  const payload = recommendation.proposedEntityPayload;
  if (
    payload.contract !== "next-action-recommendation-v0" ||
    payload.rulesetVersion !== NEXT_ACTION_RULESET_VERSION ||
    typeof payload.evaluatedAt !== "string" ||
    typeof payload.seasonId !== "string" ||
    typeof payload.actionId !== "string" ||
    typeof payload.outcomeId !== "string" ||
    (payload.projectId !== null && typeof payload.projectId !== "string") ||
    typeof payload.totalScore !== "number" ||
    !isRecord(payload.action) ||
    typeof payload.action.title !== "string"
  ) {
    return null;
  }

  const factors = evidenceRows.map(parseEvidenceFactor);
  if (factors.some((factor) => factor === null)) return null;
  const orderedFactors = (factors as NextActionScoreFactor[]).sort(
    (left, right) => NEXT_ACTION_FACTOR_KEYS.indexOf(left.key) - NEXT_ACTION_FACTOR_KEYS.indexOf(right.key)
  );

  return {
    recommendationId: recommendation.id as RecommendationId,
    rulesetVersion: NEXT_ACTION_RULESET_VERSION,
    evaluatedAt: payload.evaluatedAt,
    seasonId: payload.seasonId as SeasonId,
    actionId: payload.actionId as ActionId,
    outcomeId: payload.outcomeId as OutcomeId,
    ...(payload.projectId === null ? {} : { projectId: payload.projectId as ProjectId }),
    title: recommendation.title,
    rationale: recommendation.rationale,
    totalScore: payload.totalScore,
    confidenceClass: "direct",
    status: "shown",
    factors: orderedFactors,
    action: {
      title: payload.action.title,
      ...(typeof payload.action.doneCondition === "string" ? { doneCondition: payload.action.doneCondition } : {}),
      ...(typeof payload.action.estimatedMinutes === "number"
        ? { estimatedMinutes: payload.action.estimatedMinutes }
        : {}),
      ...(typeof payload.action.scheduledFor === "string" ? { scheduledFor: payload.action.scheduledFor } : {})
    }
  };
}

function parseEvidenceFactor(row: RecommendationEvidenceRow): NextActionScoreFactor | null {
  if (!NEXT_ACTION_FACTOR_KEYS.includes(row.evidenceType as NextActionScoreFactor["key"])) return null;
  if (!isRecord(row.valueJson) || typeof row.valueJson.score !== "number") return null;

  const { score, rulesetVersion: _rulesetVersion, ...value } = row.valueJson;
  return {
    key: row.evidenceType as NextActionScoreFactor["key"],
    score,
    label: row.label,
    value
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
