import type { ActionId, OutcomeId, ProjectId, RecommendationId, SeasonId } from "./ids.js";
import type { ActionStatus } from "./action.js";
import type { OutcomeStatus, ProjectStatus } from "./execution-context.js";
import type { SeasonStatus } from "./promotion.js";

export const NEXT_ACTION_RULESET_VERSION = "next-action-v0.1" as const;

export const NEXT_ACTION_FACTOR_KEYS = [
  "active_context",
  "user_priority",
  "urgency",
  "bounded_effort",
  "freshness"
] as const;
export type NextActionFactorKey = (typeof NEXT_ACTION_FACTOR_KEYS)[number];

export type NextActionRankingCandidate = {
  actionId: ActionId;
  outcomeId: OutcomeId;
  projectId?: ProjectId;
  seasonId: SeasonId;
  title: string;
  doneCondition?: string;
  estimatedMinutes?: number;
  priority?: number;
  scheduledFor?: string;
  createdAt: string;
  actionStatus: ActionStatus;
  outcomeStatus: OutcomeStatus;
  projectStatus?: ProjectStatus;
  seasonStatus: SeasonStatus;
};

export type NextActionScoreFactor = {
  key: NextActionFactorKey;
  score: number;
  label: string;
  value: Record<string, unknown>;
};

export type RankedNextAction = {
  candidate: NextActionRankingCandidate;
  totalScore: number;
  factors: NextActionScoreFactor[];
};

export type NextActionRankingResult = {
  rulesetVersion: typeof NEXT_ACTION_RULESET_VERSION;
  evaluatedAt: string;
  eligibleCount: number;
  winner: RankedNextAction | null;
  ranked: RankedNextAction[];
};

export type NextActionRecommendationView = {
  recommendationId: RecommendationId;
  rulesetVersion: typeof NEXT_ACTION_RULESET_VERSION;
  evaluatedAt: string;
  seasonId: SeasonId;
  actionId: ActionId;
  outcomeId: OutcomeId;
  projectId?: ProjectId;
  title: string;
  rationale: string;
  totalScore: number;
  confidenceClass: "direct";
  status: "shown";
  factors: NextActionScoreFactor[];
  action: {
    title: string;
    doneCondition?: string;
    estimatedMinutes?: number;
    scheduledFor?: string;
  };
};

const HOUR_MS = 60 * 60 * 1_000;
const DAY_MS = 24 * HOUR_MS;

export function rankNextActions(
  candidates: readonly NextActionRankingCandidate[],
  evaluatedAt: Date
): NextActionRankingResult {
  const evaluatedMs = evaluatedAt.getTime();
  if (!Number.isFinite(evaluatedMs)) throw new Error("evaluatedAt must be a valid Date");

  const ranked = candidates
    .filter(isEligibleNextAction)
    .map((candidate) => scoreCandidate(candidate, evaluatedMs))
    .sort(compareRankedNextActions);

  return {
    rulesetVersion: NEXT_ACTION_RULESET_VERSION,
    evaluatedAt: evaluatedAt.toISOString(),
    eligibleCount: ranked.length,
    winner: ranked[0] ?? null,
    ranked
  };
}

export function isEligibleNextAction(candidate: NextActionRankingCandidate): boolean {
  if (candidate.actionStatus !== "ready") return false;
  if (candidate.seasonStatus !== "active") return false;
  if (candidate.outcomeStatus !== "active") return false;
  if (candidate.projectId !== undefined && candidate.projectStatus !== "active") return false;
  return true;
}

function scoreCandidate(candidate: NextActionRankingCandidate, evaluatedMs: number): RankedNextAction {
  const factors: NextActionScoreFactor[] = [
    {
      key: "active_context",
      score: 40,
      label: "Ready Action in the active Current Season",
      value: {
        seasonId: candidate.seasonId,
        outcomeId: candidate.outcomeId,
        ...(candidate.projectId === undefined ? {} : { projectId: candidate.projectId })
      }
    }
  ];

  if (candidate.priority !== undefined) {
    const weight = clamp(Math.trunc(candidate.priority), -20, 20);
    factors.push({
      key: "user_priority",
      score: weight,
      label: "Explicit user priority weight",
      value: { priority: candidate.priority, appliedWeight: weight }
    });
  }

  if (candidate.scheduledFor !== undefined) {
    const scheduledMs = Date.parse(candidate.scheduledFor);
    if (Number.isFinite(scheduledMs)) {
      const deltaMs = scheduledMs - evaluatedMs;
      const score = urgencyScore(deltaMs);
      factors.push({
        key: "urgency",
        score,
        label: urgencyLabel(deltaMs),
        value: { scheduledFor: candidate.scheduledFor, deltaMinutes: Math.round(deltaMs / 60_000) }
      });
    }
  }

  if (candidate.estimatedMinutes !== undefined) {
    factors.push({
      key: "bounded_effort",
      score: effortScore(candidate.estimatedMinutes),
      label: effortLabel(candidate.estimatedMinutes),
      value: { estimatedMinutes: candidate.estimatedMinutes }
    });
  }

  const createdMs = Date.parse(candidate.createdAt);
  if (Number.isFinite(createdMs)) {
    const ageMs = evaluatedMs - createdMs;
    if (ageMs >= 0) {
      factors.push({
        key: "freshness",
        score: freshnessScore(ageMs),
        label: freshnessLabel(ageMs),
        value: { createdAt: candidate.createdAt, ageHours: Math.floor(ageMs / HOUR_MS) }
      });
    }
  }

  return {
    candidate,
    totalScore: factors.reduce((sum, factor) => sum + factor.score, 0),
    factors
  };
}

function compareRankedNextActions(left: RankedNextAction, right: RankedNextAction): number {
  if (left.totalScore !== right.totalScore) return right.totalScore - left.totalScore;

  const leftPriority = left.candidate.priority ?? 0;
  const rightPriority = right.candidate.priority ?? 0;
  if (leftPriority !== rightPriority) return rightPriority - leftPriority;

  const leftScheduled = parseNullableDate(left.candidate.scheduledFor);
  const rightScheduled = parseNullableDate(right.candidate.scheduledFor);
  if (leftScheduled !== rightScheduled) return leftScheduled - rightScheduled;

  const leftEstimate = left.candidate.estimatedMinutes ?? Number.POSITIVE_INFINITY;
  const rightEstimate = right.candidate.estimatedMinutes ?? Number.POSITIVE_INFINITY;
  if (leftEstimate !== rightEstimate) return leftEstimate - rightEstimate;

  const leftCreated = Date.parse(left.candidate.createdAt);
  const rightCreated = Date.parse(right.candidate.createdAt);
  if (leftCreated !== rightCreated) return leftCreated - rightCreated;

  return String(left.candidate.actionId).localeCompare(String(right.candidate.actionId));
}

function parseNullableDate(value: string | undefined): number {
  if (value === undefined) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function urgencyScore(deltaMs: number): number {
  if (deltaMs <= 0) return 30;
  if (deltaMs <= DAY_MS) return 25;
  if (deltaMs <= 3 * DAY_MS) return 15;
  if (deltaMs <= 7 * DAY_MS) return 8;
  return 0;
}

function urgencyLabel(deltaMs: number): string {
  if (deltaMs <= 0) return "Scheduled time has arrived or passed";
  if (deltaMs <= DAY_MS) return "Scheduled within 24 hours";
  if (deltaMs <= 3 * DAY_MS) return "Scheduled within 3 days";
  if (deltaMs <= 7 * DAY_MS) return "Scheduled within 7 days";
  return "Scheduled later than 7 days";
}

function effortScore(minutes: number): number {
  if (minutes <= 15) return 12;
  if (minutes <= 30) return 10;
  if (minutes <= 45) return 8;
  if (minutes <= 60) return 5;
  if (minutes <= 90) return 2;
  return 0;
}

function effortLabel(minutes: number): string {
  if (minutes <= 15) return "Very small bounded Action";
  if (minutes <= 30) return "Small bounded Action";
  if (minutes <= 45) return "Bounded Action within the default 45-minute target";
  if (minutes <= 60) return "Moderate bounded Action";
  if (minutes <= 90) return "Larger bounded Action";
  return "Large Action; no effort-fit bonus applied";
}

function freshnessScore(ageMs: number): number {
  if (ageMs <= DAY_MS) return 4;
  if (ageMs <= 3 * DAY_MS) return 3;
  if (ageMs <= 7 * DAY_MS) return 2;
  if (ageMs <= 30 * DAY_MS) return 1;
  return 0;
}

function freshnessLabel(ageMs: number): string {
  if (ageMs <= DAY_MS) return "Created within the last day";
  if (ageMs <= 3 * DAY_MS) return "Created within the last 3 days";
  if (ageMs <= 7 * DAY_MS) return "Created within the last week";
  if (ageMs <= 30 * DAY_MS) return "Created within the last month";
  return "Older Action; no freshness bonus applied";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
