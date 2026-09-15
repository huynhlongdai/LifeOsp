import type { ActionStatus } from "./action.js";
import type { FocusEndOutcome, FocusSessionView } from "./focus.js";
import type { ActionId, ActionResultId, DailyCloseId, FocusSessionId, OutcomeId, RecommendationId } from "./ids.js";

// B5 — Action result + Daily Close V0.
// A FocusSession result and an Action result stay distinct; the user may commit
// both in one explicit step (focusOutcome), never implicitly.

export const ACTION_RESULTS = ["completed", "partial", "postponed", "blocked", "dropped"] as const;
export type ActionResult = (typeof ACTION_RESULTS)[number];

/** Action statuses that may receive a result. Everything else is a 409. */
export const ACTION_RESULT_SOURCE_STATUSES = ["ready", "active"] as const satisfies readonly ActionStatus[];

export const ACTION_RESULT_TEXT_MAX_LENGTH = 1_000;
export const DAILY_CLOSE_TEXT_MAX_LENGTH = 1_000;
export const LOCAL_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const MAX_UTC_OFFSET_MINUTES = 14 * 60;

export function canRecordActionResult(status: ActionStatus): boolean {
  return (ACTION_RESULT_SOURCE_STATUSES as readonly string[]).includes(status);
}

/** The result vocabulary is the same as the terminal Action statuses by design. */
export function actionStatusForResult(result: ActionResult): ActionStatus {
  return result;
}

export function isActionResult(value: unknown): value is ActionResult {
  return typeof value === "string" && (ACTION_RESULTS as readonly string[]).includes(value);
}

/**
 * Suggested FocusSession outcome when the user records a result while Focus is
 * still running. A default the UI may pre-select — never applied implicitly, and
 * a Focus outcome never implies the Action result (or the reverse).
 */
export function defaultFocusOutcomeForResult(result: ActionResult): FocusEndOutcome {
  return result === "completed" ? "completed" : result === "partial" ? "interrupted" : "abandoned";
}

export type RecordActionResultInput = {
  result: ActionResult;
  /** Free note: what moved / why postponed / why dropped. Optional everywhere. */
  note?: string;
  /** Required when result === "blocked". */
  blockedReason?: string;
  /** Only meaningful for "partial": what is still left. */
  remainingText?: string;
  /** Only meaningful for "postponed": local date YYYY-MM-DD. No overdue debt is derived from it. */
  postponeUntil?: string;
  /** End the active FocusSession on this Action in the same commit. Must be explicit. */
  focusOutcome?: FocusEndOutcome;
};

export type ActionResultView = {
  id: ActionResultId;
  actionId: ActionId;
  result: ActionResult;
  note?: string;
  blockedReason?: string;
  remainingText?: string;
  postponeUntil?: string;
  recommendationId?: RecommendationId;
  focusSessionId?: FocusSessionId;
  /** Plan-vs-reality metadata, recorded as facts at result time. */
  plannedMinutes?: number;
  actualFocusMinutes: number;
  focusSessionCount: number;
  recordedAt: string;
  action: {
    id: ActionId;
    title: string;
    status: ActionStatus;
    outcomeId?: OutcomeId;
  };
  /** Present only when a FocusSession was ended in the same commit. */
  focus?: FocusSessionView;
};

export const DAILY_CLOSE_FRICTION_CODES = [
  "unclear",
  "too_big",
  "low_energy",
  "interrupted",
  "waiting_on_others",
  "new_idea_pulled",
  "none",
  "other"
] as const;
export type DailyCloseFrictionCode = (typeof DAILY_CLOSE_FRICTION_CODES)[number];

export type DailyCloseResultItem = {
  actionId: ActionId;
  title: string;
  result: ActionResult;
  recordedAt: string;
};

/** Facts only. Nothing here is inferred. */
export type DailyCloseSummary = {
  results: Record<ActionResult, number>;
  resultItems: DailyCloseResultItem[];
  focusSessions: { count: number; totalMinutes: number };
  distractionsCaptured: number;
  outcomesMoved: number;
  /** NOW recommendations the user resolved with not_now / wrong_assumption. */
  intentionalDecisions: number;
};

export type DailyCloseRecordView = {
  id: DailyCloseId;
  date: string;
  meaningfulProgressText?: string;
  frictionCode?: DailyCloseFrictionCode;
  frictionNote?: string;
  note?: string;
  closedAt: string;
  updatedAt: string;
};

export type DailyCloseView = {
  date: string;
  range: { from: string; to: string };
  generatedAt: string;
  summary: DailyCloseSummary;
  close: DailyCloseRecordView | null;
};

export type CloseDayInput = {
  date: string;
  offsetMinutes: number;
  meaningfulProgressText?: string;
  frictionCode?: DailyCloseFrictionCode;
  frictionNote?: string;
  note?: string;
};

export function isValidLocalDate(value: string): boolean {
  if (!LOCAL_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

export function isValidUtcOffsetMinutes(value: number): boolean {
  return Number.isInteger(value) && Math.abs(value) <= MAX_UTC_OFFSET_MINUTES;
}

/**
 * UTC instants covering a user's local calendar day. offsetMinutes follows
 * `Date.prototype.getTimezoneOffset` semantics (UTC − local), e.g. Asia/Saigon = −420.
 */
export function localDayRange(date: string, offsetMinutes: number): { from: Date; to: Date } | null {
  if (!isValidLocalDate(date) || !isValidUtcOffsetMinutes(offsetMinutes)) return null;
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const localMidnightAsUtc = Date.UTC(year, month - 1, day);
  const from = new Date(localMidnightAsUtc + offsetMinutes * 60_000);
  const to = new Date(from.getTime() + 24 * 60 * 60_000);
  return { from, to };
}

export function emptyDailyCloseSummary(): DailyCloseSummary {
  return {
    results: { completed: 0, partial: 0, postponed: 0, blocked: 0, dropped: 0 },
    resultItems: [],
    focusSessions: { count: 0, totalMinutes: 0 },
    distractionsCaptured: 0,
    outcomesMoved: 0,
    intentionalDecisions: 0
  };
}
