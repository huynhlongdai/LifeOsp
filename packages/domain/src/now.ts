import type { ActionId, RecommendationId, SeasonId } from "./ids.js";
import type { EvidenceStrength, RecommendationConfidenceClass, RecommendationStatus } from "./promotion.js";
import type { NextActionFactorKey } from "./next-action.js";

export type NowSeasonContext = {
  id: SeasonId;
  title: string;
  purpose: string;
  primaryFocusText?: string;
};

export type NowEvidenceItem = {
  key: NextActionFactorKey;
  label: string;
  score: number;
  value: Record<string, unknown>;
  strength: EvidenceStrength;
};

export type NowActionView = {
  id: ActionId;
  title: string;
  doneCondition?: string;
  estimatedMinutes?: number;
  scheduledFor?: string;
  priority?: number;
};

export type NowRecommendationView = {
  id: RecommendationId;
  title: string;
  rationale: string;
  confidenceClass: RecommendationConfidenceClass;
  status: Extract<RecommendationStatus, "shown" | "accepted" | "edited">;
  evidence: NowEvidenceItem[];
};

/**
 * W5 (Meeting #020) — present when the user is coming back after an absence.
 * Facts only; the UI must not turn daysAway into a streak, a count, or a debt.
 */
export type NowReturnContext = {
  lastActivityAt: string;
  daysAway: number;
};

/** Absence threshold for NowReturnContext, in hours since the last user-sourced LifeEvent. */
export const NOW_RETURN_THRESHOLD_HOURS = 48 as const;

export type NowReadyView = {
  state: "ready";
  generatedAt: string;
  season: NowSeasonContext;
  action: NowActionView;
  recommendation: NowRecommendationView;
  returning?: NowReturnContext;
};

export type NowNoDirectionView = {
  state: "no_direction";
  generatedAt: string;
  message: string;
  returning?: NowReturnContext;
};

export type NowNoReadyActionView = {
  state: "no_ready_action";
  generatedAt: string;
  season: NowSeasonContext;
  readyActionCount: number;
  reason: "none_ready" | "recommendation_resolved" | "recommendation_missing";
  message: string;
  returning?: NowReturnContext;
};

export type NowBlockedView = {
  state: "blocked";
  generatedAt: string;
  season: NowSeasonContext;
  blockedActionCount: number;
  message: string;
  returning?: NowReturnContext;
};

export type NowView = NowReadyView | NowNoDirectionView | NowNoReadyActionView | NowBlockedView;

export type NowRecommendationResolution = "accepted" | "edited" | "not_now" | "wrong_assumption";

export type ResolveNowRecommendationInput = {
  resolution: NowRecommendationResolution;
  action?: {
    title?: string;
    doneCondition?: string | null;
    estimatedMinutes?: number | null;
  };
};
