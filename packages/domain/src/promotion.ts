import type {
  CaptureId,
  DirectionId,
  IncubatorItemId,
  RecommendationId,
  SeasonId
} from "./ids.js";

export const TRADE_OFF_BUCKETS = ["active", "maintain", "not_now"] as const;
export type TradeOffBucket = (typeof TRADE_OFF_BUCKETS)[number];

export const DIRECTION_STATUSES = ["draft", "active", "inactive"] as const;
export type DirectionStatus = (typeof DIRECTION_STATUSES)[number];

export const SEASON_STATUSES = ["draft", "active", "paused", "completed", "abandoned"] as const;
export type SeasonStatus = (typeof SEASON_STATUSES)[number];

export const INCUBATOR_KINDS = ["idea", "project_candidate", "someday", "reference"] as const;
export type IncubatorKind = (typeof INCUBATOR_KINDS)[number];

export const INCUBATOR_STATUSES = ["incubated", "promoted", "archived"] as const;
export type IncubatorStatus = (typeof INCUBATOR_STATUSES)[number];

export const RECOMMENDATION_KINDS = [
  "next_action",
  "direction",
  "friction_intervention",
  "weekly_adjustment"
] as const;
export type RecommendationKind = (typeof RECOMMENDATION_KINDS)[number];

export const RECOMMENDATION_CONFIDENCE_CLASSES = [
  "direct",
  "strong_pattern",
  "possible_pattern",
  "suggestion"
] as const;
export type RecommendationConfidenceClass = (typeof RECOMMENDATION_CONFIDENCE_CLASSES)[number];

export const RECOMMENDATION_STATUSES = [
  "draft",
  "shown",
  "accepted",
  "edited",
  "rejected",
  "not_now",
  "wrong_assumption"
] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export const EVIDENCE_STRENGTHS = ["direct", "strong", "supporting", "tentative"] as const;
export type EvidenceStrength = (typeof EVIDENCE_STRENGTHS)[number];

export type DirectionView = {
  id: DirectionId;
  title: string;
  description?: string;
  status: DirectionStatus;
  sourceCaptureId?: CaptureId;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SeasonView = {
  id: SeasonId;
  directionId?: DirectionId;
  title: string;
  purpose: string;
  startsOn?: string;
  targetEndsOn?: string;
  status: SeasonStatus;
  primaryFocusText?: string;
  createdAt: string;
  updatedAt: string;
};

export type IncubatorItemView = {
  id: IncubatorItemId;
  sourceCaptureId?: CaptureId;
  title: string;
  notes?: string;
  kind: IncubatorKind;
  status: IncubatorStatus;
  revisitOn?: string;
  createdAt: string;
  updatedAt: string;
};

export type ClarityTradeOffItem = {
  text: string;
  bucket: TradeOffBucket;
  incubatorKind?: IncubatorKind;
};

export type ClarityPromotionDraftInput = {
  interpretationVersion: number;
  activeText: string;
  maintainTexts: string[];
  notNowItems: Array<{ text: string; kind: IncubatorKind }>;
  direction: {
    title: string;
    description?: string;
  };
  season: {
    title: string;
    purpose: string;
    primaryFocusText?: string;
    startsOn?: string;
    targetEndsOn?: string;
  };
};

export type ClarityPromotionDraftView = {
  recommendationId: RecommendationId;
  captureId: CaptureId;
  interpretationVersion: number;
  direction: DirectionView;
  season: SeasonView;
  activeText: string;
  maintainTexts: string[];
  notNowItems: Array<{ text: string; kind: IncubatorKind }>;
  recommendationStatus: RecommendationStatus;
};

export type CurrentDirectionView = {
  direction: DirectionView;
  season: SeasonView;
};
