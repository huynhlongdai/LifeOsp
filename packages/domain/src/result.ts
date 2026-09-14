import type { ActionId, ActionResultId, DailyCloseId, FocusSessionId } from "./ids.js";
import type { ActionStatus } from "./action.js";
import type { FocusEndOutcome, FocusSessionStatus } from "./focus.js";

/**
 * B5 Result + Daily Close V0.
 *
 * An ActionResult is the user's explicit statement of what actually happened to
 * an Action. It is recorded once per Action and is always user-owned: nothing in
 * B5 infers a result, invents mood/energy/friction, or creates overdue debt.
 */
export const ACTION_RESULT_OUTCOMES = ["completed", "partial", "postponed", "blocked", "dropped"] as const;
export type ActionResultOutcome = (typeof ACTION_RESULT_OUTCOMES)[number];

/** Action statuses from which a result may be recorded. */
export const ACTION_RESULT_SOURCE_STATUSES = ["ready", "active"] as const;
export type ActionResultSourceStatus = (typeof ACTION_RESULT_SOURCE_STATUSES)[number];

/** Outcomes that require a user-provided reason. */
export const ACTION_RESULT_REASON_REQUIRED: readonly ActionResultOutcome[] = ["blocked"];

export const MAX_ACTION_RESULT_TEXT_LENGTH = 2_000;
export const MAX_DAILY_CLOSE_NOTE_LENGTH = 2_000;

export function isActionResultOutcome(value: unknown): value is ActionResultOutcome {
  return typeof value === "string" && (ACTION_RESULT_OUTCOMES as readonly string[]).includes(value);
}

export function canRecordActionResult(status: ActionStatus): status is ActionResultSourceStatus {
  return (ACTION_RESULT_SOURCE_STATUSES as readonly string[]).includes(status);
}

/** The Action status implied by a recorded result. Result outcome and Action status stay 1:1. */
export function actionStatusForResult(outcome: ActionResultOutcome): ActionStatus {
  return outcome;
}

/**
 * Focus outcome that may be committed together with an Action result.
 * The mapping is a default only; the user may always choose explicitly, and a
 * Focus outcome never implies the Action result (or the reverse).
 */
export function defaultFocusOutcomeForResult(outcome: ActionResultOutcome): FocusEndOutcome {
  return outcome === "completed" ? "completed" : outcome === "partial" ? "interrupted" : "abandoned";
}

export type RecordActionResultInput = {
  outcome: ActionResultOutcome;
  /** Optional free-text note from the user. Never generated. */
  note?: string;
  /** Required for `blocked`; optional elsewhere. */
  reason?: string;
  /** Explicitly commit the active FocusSession together with the Action result. */
  focusSessionId?: FocusSessionId;
  /** Overrides `defaultFocusOutcomeForResult` when the user chooses. */
  focusOutcome?: FocusEndOutcome;
  /** Optional user-chosen local date (YYYY-MM-DD) to revisit a postponed Action. */
  postponedTo?: string;
};

export type ActionResultView = {
  id: ActionResultId;
  actionId: ActionId;
  outcome: ActionResultOutcome;
  actionStatus: ActionStatus;
  previousActionStatus: ActionResultSourceStatus;
  note?: string;
  reason?: string;
  postponedTo?: string;
  focusSessionId?: FocusSessionId;
  focusStatus?: FocusSessionStatus;
  focusMinutes?: number;
  plannedMinutes?: number;
  recordedAt: string;
};

/** Factual counters derived from recorded state only. No inference, no AI. */
export type DailyCloseSummary = {
  resultsRecorded: number;
  completed: number;
  partial: number;
  postponed: number;
  blocked: number;
  dropped: number;
  focusSessions: number;
  focusMinutes: number;
  distractionsCaptured: number;
  capturesCreated: number;
};

export type DailyCloseView = {
  localDate: string;
  tzOffsetMinutes: number;
  generatedAt: string;
  summary: DailyCloseSummary;
  results: ActionResultView[];
  closed?: {
    id: DailyCloseId;
    closedAt: string;
    note?: string;
  };
};

export type CommitDailyCloseInput = {
  localDate: string;
  tzOffsetMinutes?: number;
  note?: string;
};

export const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_TZ_OFFSET_MINUTES = 840;

export function isLocalDate(value: unknown): value is string {
  if (typeof value !== "string" || !LOCAL_DATE_PATTERN.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(timestamp)) return false;
  return new Date(timestamp).toISOString().slice(0, 10) === value;
}

export function isTzOffsetMinutes(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    Math.abs(value) <= MAX_TZ_OFFSET_MINUTES
  );
}

/**
 * UTC window covering one local calendar date.
 * `tzOffsetMinutes` is minutes ahead of UTC (Asia/Bangkok = +420).
 */
export function localDateWindow(localDate: string, tzOffsetMinutes: number): { from: Date; to: Date } {
  const startUtcMs = Date.parse(`${localDate}T00:00:00Z`) - tzOffsetMinutes * 60_000;
  return { from: new Date(startUtcMs), to: new Date(startUtcMs + 24 * 60 * 60_000) };
}
