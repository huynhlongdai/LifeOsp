import type { ActionId, OutcomeId } from "./ids.js";
import type { ActionStatus } from "./action.js";

/**
 * Get Unstuck V0 (`docs/design/FIGMA_AI_DESIGN_BRIEF_V1.md` §17,
 * `docs/design/PRODUCT_SURFACE_SPEC_V1.md` §12, Meeting #003 Pattern B,
 * intervention ladder levels 2–4).
 *
 * Never diagnose before evidence, never open with advice, one question,
 * one intervention. No AI provider in V0 — every value here is computed
 * deterministically from `actions` / `action_results` / `recommendations`,
 * the same "hard rules first" stance as the Next Action Engine. A future
 * slice may add an optional AI provider for the "resize" suggestion the
 * same way B1 added one for missing next actions; until then the user
 * writes the smaller step themselves.
 *
 * Deliberate scope cuts, recorded here rather than re-derived later:
 * - the spec's "replan" intervention needs Weekly Reset (not built yet) to
 *   mean anything; V0 folds it into `reprioritize`.
 * - "inactivity" evidence (spec §12.1) would need an aging policy on top of
 *   `Action.updatedAt`; V0 only surfaces evidence already recorded as facts
 *   (postpone/blocked results, corrected recommendations).
 */

export const GET_UNSTUCK_FRICTIONS = [
  "unclear_first_step",
  "too_large",
  "blocked",
  "insufficient_capacity",
  "lower_priority",
  "no_longer_important",
  "other"
] as const;
export type GetUnstuckFriction = (typeof GET_UNSTUCK_FRICTIONS)[number];

export const GET_UNSTUCK_INTERVENTIONS = ["clarify", "resize", "unblock", "reprioritize", "pause_drop"] as const;
export type GetUnstuckIntervention = (typeof GET_UNSTUCK_INTERVENTIONS)[number];

/** Deterministic default; the user can still act differently — this never runs silently. */
export function defaultInterventionForFriction(friction: GetUnstuckFriction): GetUnstuckIntervention {
  switch (friction) {
    case "unclear_first_step":
      return "clarify";
    case "too_large":
      return "resize";
    case "blocked":
      return "unblock";
    case "insufficient_capacity":
      return "reprioritize";
    case "lower_priority":
      return "reprioritize";
    case "no_longer_important":
      return "pause_drop";
    case "other":
      return "clarify";
  }
}

/** An Action qualifies once it accumulates two stall signals, or one explicit block. */
export const GET_UNSTUCK_STALL_THRESHOLD = 2;

export type StuckEvidenceReason = "blocked" | "repeated_delay" | "repeated_correction";

export type StuckActionEvidence = {
  action: {
    id: ActionId;
    outcomeId: OutcomeId;
    title: string;
    doneCondition?: string;
    estimatedMinutes?: number;
    status: ActionStatus;
    blockedReason?: string;
  };
  reasons: StuckEvidenceReason[];
  /** Lifetime `postponed` + `blocked` results recorded on this Action (see result.ts). */
  postponedCount: number;
  blockedResultCount: number;
  /** NOW recommendations for this Action the user resolved as wrong_assumption. */
  wrongAssumptionCount: number;
  lastMovedAt?: string;
};

export function isStuckEvidence(
  evidence: Pick<StuckActionEvidence, "action" | "postponedCount" | "blockedResultCount" | "wrongAssumptionCount">
): boolean {
  return (
    evidence.action.status === "blocked" ||
    evidence.postponedCount + evidence.blockedResultCount >= GET_UNSTUCK_STALL_THRESHOLD ||
    evidence.wrongAssumptionCount >= GET_UNSTUCK_STALL_THRESHOLD
  );
}

export function stuckEvidenceReasons(evidence: StuckActionEvidence): StuckEvidenceReason[] {
  const reasons: StuckEvidenceReason[] = [];
  if (evidence.action.status === "blocked") reasons.push("blocked");
  if (evidence.postponedCount + evidence.blockedResultCount >= GET_UNSTUCK_STALL_THRESHOLD) reasons.push("repeated_delay");
  if (evidence.wrongAssumptionCount >= GET_UNSTUCK_STALL_THRESHOLD) reasons.push("repeated_correction");
  return reasons;
}

/**
 * One factual sentence, no advice — Meeting #010 §11: "This action has moved 3 times."
 * Always states the real counted number, never a placeholder.
 */
export function describeStuckEvidence(evidence: StuckActionEvidence): string {
  const moved = evidence.postponedCount + evidence.blockedResultCount;
  const parts: string[] = [];
  if (evidence.action.status === "blocked") parts.push("đang bị chặn");
  if (moved > 0) parts.push(`đã dịch chuyển ${moved} lần`);
  if (evidence.wrongAssumptionCount > 0) parts.push(`đã được sửa giả định ${evidence.wrongAssumptionCount} lần`);
  if (parts.length === 0) return "Việc này chưa có dấu hiệu bị kẹt.";
  return `Việc này ${parts.join(", ")}.`;
}

export type GetUnstuckListView = {
  generatedAt: string;
  candidates: StuckActionEvidence[];
};

export type SubmitFrictionInput = {
  friction: GetUnstuckFriction;
};

export type GetUnstuckDiagnosisView = {
  actionId: ActionId;
  friction: GetUnstuckFriction;
  intervention: GetUnstuckIntervention;
  evidence: StuckActionEvidence;
  /** Can go through `/get-unstuck/revive` (status is blocked or postponed). */
  canRevive: boolean;
  /** Can go through the existing `/result` endpoint (status is ready or active). */
  canRecordResult: boolean;
};

export type ApplyGetUnstuckEditInput = {
  intervention: "clarify" | "resize";
  title?: string;
  doneCondition?: string;
  estimatedMinutes?: number;
};

export const GET_UNSTUCK_EDIT_TEXT_MAX_LENGTH = 1_000;
export const GET_UNSTUCK_TITLE_MAX_LENGTH = 500;
