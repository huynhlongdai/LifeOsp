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

export type NowReadyView = {
  state: "ready";
  generatedAt: string;
  season: NowSeasonContext;
  action: NowActionView;
  recommendation: NowRecommendationView;
};

export type NowNoDirectionView = {
  state: "no_direction";
  generatedAt: string;
  message: string;
};

export type NowNoReadyActionView = {
  state: "no_ready_action";
  generatedAt: string;
  season: NowSeasonContext;
  readyActionCount: number;
  reason: "none_ready" | "recommendation_resolved" | "recommendation_missing";
  message: string;
};

export type NowBlockedView = {
  state: "blocked";
  generatedAt: string;
  season: NowSeasonContext;
  blockedActionCount: number;
  message: string;
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
