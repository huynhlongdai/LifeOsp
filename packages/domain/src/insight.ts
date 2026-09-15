import type { InsightId } from "./ids.js";
import type { OperatingPreferenceKey } from "./operating-preference.js";

// Insight = "Pattern Candidate" in the UI (DOMAIN_MODEL_V1.md §16,
// PRODUCT_SURFACE_SPEC_V1.md §13.4/§14.3). V0 detects candidates with
// deterministic threshold rules only — no AI/ML, matching the same
// "no ranking model in MVP" rule already applied to the Next Action Engine.
// Confidence classes and the confirm/correct/reject vocabulary come
// straight from PERSONAL_INTELLIGENCE_ENGINE_V1.md and
// FIGMA_AI_DESIGN_BRIEF_V1.md §19; "Incorrect" and "Do not use" are
// deliberately folded into one `rejected` status (product owner decision,
// 2026-09-15) rather than tracked separately.
//
// Adjustment (spec §13.5) is deliberately NOT a separate entity: Meeting
// #010 §12 Step 4's own example ("Default generated Next Actions to
// ≤45 min") is exactly an OperatingPreference, confirming Adjustment is
// the same confirm-an-Insight action framed with an expected-effect
// preview rather than a second confirmation step (product owner decision,
// 2026-09-15 — Option A over splitting Insight-accuracy from
// preference-adoption into two separate confirmations).

export const INSIGHT_CONFIDENCE_CLASSES = ["strong_pattern", "possible_pattern", "suggestion"] as const;
export type InsightConfidenceClass = (typeof INSIGHT_CONFIDENCE_CLASSES)[number];

export const INSIGHT_STATUSES = ["candidate", "shown", "confirmed", "corrected", "rejected"] as const;
export type InsightStatus = (typeof INSIGHT_STATUSES)[number];

export const INSIGHT_PATTERN_KEYS = ["duration_completion_rate", "project_load_stall_rate"] as const;
export type InsightPatternKey = (typeof INSIGHT_PATTERN_KEYS)[number];

export const INSIGHT_RESOLUTIONS = ["confirm", "partly_accurate", "reject"] as const;
export type InsightResolution = (typeof INSIGHT_RESOLUTIONS)[number];

export type ProposedPreference = {
  key: OperatingPreferenceKey;
  value: number;
  /** Plain-language expected effect (spec §13.5 "effect preview"), written
   * from a static per-pattern template — never AI-generated wording. */
  effect: string;
};

export type InsightView = {
  id: InsightId;
  patternKey: InsightPatternKey;
  title: string;
  description: string;
  confidenceClass: InsightConfidenceClass;
  status: InsightStatus;
  evidenceSummary: Record<string, number>;
  proposedPreference?: ProposedPreference;
  createdAt: string;
  resolvedAt?: string;
};

export type InsightListView = {
  generatedAt: string;
  /** Every unresolved (candidate/shown) Insight the user has. */
  candidates: InsightView[];
};

export type ResolveInsightInput = {
  resolution: InsightResolution;
  /** Required when resolution = 'partly_accurate': the value the user actually wants stored. */
  editedValue?: number;
};

// ---- Duration vs completion-rate pattern ----
// PERSONAL_INTELLIGENCE_ENGINE_V1.md "Action-duration preference vs
// start/completion rate". Bucket at 45 minutes, matching the Next Action
// Engine's existing implicit default (see next-action.ts effortLabel).

export const DURATION_PATTERN_MIN_SAMPLE = 5;
export const DURATION_PATTERN_MIN_SHORT_RATE = 0.6;
export const DURATION_PATTERN_MIN_GAP = 0.3;
export const DURATION_PATTERN_BOUNDARY_MINUTES = 45;

export type DurationCompletionStats = {
  shortAttempted: number;
  shortCompleted: number;
  longAttempted: number;
  longCompleted: number;
};

export function detectDurationCompletionPattern(
  stats: DurationCompletionStats
): { proposedMaxMinutes: number; shortRate: number; longRate: number } | null {
  if (stats.shortAttempted < DURATION_PATTERN_MIN_SAMPLE || stats.longAttempted < DURATION_PATTERN_MIN_SAMPLE) return null;
  const shortRate = stats.shortCompleted / stats.shortAttempted;
  const longRate = stats.longCompleted / stats.longAttempted;
  if (shortRate < DURATION_PATTERN_MIN_SHORT_RATE) return null;
  if (shortRate - longRate < DURATION_PATTERN_MIN_GAP) return null;
  return { proposedMaxMinutes: DURATION_PATTERN_BOUNDARY_MINUTES, shortRate, longRate };
}

// ---- Active-project load vs stall-rate pattern ----
// PERSONAL_INTELLIGENCE_ENGINE_V1.md "Active-project limits vs stalled-work
// rate"; proposed value matches the exact example in
// DOMAIN_MODEL_V1.md §17 (`projects.max_primary_active = 2`).

export const PROJECT_LOAD_PATTERN_MIN_ACTIVE = 3;
export const PROJECT_LOAD_PATTERN_MIN_STALL_RATE = 0.5;
export const PROJECT_LOAD_PATTERN_PROPOSED_MAX = 2;

export type ProjectLoadStats = {
  activeProjectCount: number;
  stalledProjectCount: number;
};

export function detectProjectLoadPattern(stats: ProjectLoadStats): { proposedMaxActive: number; stallRate: number } | null {
  if (stats.activeProjectCount < PROJECT_LOAD_PATTERN_MIN_ACTIVE) return null;
  const stallRate = stats.stalledProjectCount / stats.activeProjectCount;
  if (stallRate < PROJECT_LOAD_PATTERN_MIN_STALL_RATE) return null;
  return { proposedMaxActive: PROJECT_LOAD_PATTERN_PROPOSED_MAX, stallRate };
}
