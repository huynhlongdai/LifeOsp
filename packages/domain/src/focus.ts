import type { ActionId, CaptureId, FocusSessionId, RecommendationId } from "./ids.js";

export const FOCUS_SESSION_STATUSES = ["active", "completed", "interrupted", "abandoned"] as const;
export type FocusSessionStatus = (typeof FOCUS_SESSION_STATUSES)[number];

export const FOCUS_END_OUTCOMES = ["completed", "interrupted", "abandoned"] as const;
export type FocusEndOutcome = (typeof FOCUS_END_OUTCOMES)[number];

export type FocusActionSnapshot = {
  id: ActionId;
  title: string;
  doneCondition?: string;
};

export type FocusSessionView = {
  id: FocusSessionId;
  actionId: ActionId;
  recommendationId?: RecommendationId;
  status: FocusSessionStatus;
  plannedMinutes?: number;
  startedAt: string;
  endedAt?: string;
  action: FocusActionSnapshot;
};

export type FocusStateView =
  | { state: "none"; generatedAt: string }
  | { state: "active"; generatedAt: string; focus: FocusSessionView }
  | { state: "recent"; generatedAt: string; focus: FocusSessionView };

export type StartFocusInput = {
  recommendationId: RecommendationId;
};

export type EndFocusInput = {
  outcome: FocusEndOutcome;
};

export type CaptureDistractionInput = {
  rawText: string;
};

export type DistractionCaptureView = {
  id: CaptureId;
  focusSessionId: FocusSessionId;
  actionId: ActionId;
  rawText: string;
  createdAt: string;
};
