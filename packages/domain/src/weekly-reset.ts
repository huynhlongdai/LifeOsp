import type { ACTION_RESULTS } from "./result.js";
import { isValidLocalDate, isValidUtcOffsetMinutes } from "./result.js";
import type { ActionId, OutcomeId } from "./ids.js";

// Weekly Reset (spec §13, Reflect/Weekly Reset). Figma reconciliation C1:
// ships as counted facts in narrative order — no %, no week-over-week
// percentage comparison. V0 covers the chapters that are derivable from
// data already recorded (13.1 start / 13.2 Reality / 13.3 Movement / 13.4
// Pattern Candidates, reusing insight.ts's deterministic detection / 13.6
// Next Week). Adjustment (13.5, distinct proposed *operating changes* for
// the week ahead, beyond a plain preference confirmation) still needs its
// own design — named in unavailableSections instead of fabricated, same
// "no fabricated confidence" rule as ME overview's §14.4.

type ActionResult = (typeof ACTION_RESULTS)[number];

export const WEEKLY_RESET_UNAVAILABLE_SECTIONS = ["adjustment"] as const;
export type WeeklyResetUnavailableSection = (typeof WEEKLY_RESET_UNAVAILABLE_SECTIONS)[number];

export type WeeklyResetReality = {
  /** Sum of action_results.actual_focus_minutes recorded in the week. */
  focusMinutes: number;
  focusSessionCount: number;
  /** Count of recorded Action results in the week, by result. */
  resultCounts: Record<ActionResult, number>;
  dailyClosesCompleted: number;
};

export type WeeklyResetMovementItem = {
  id: ActionId;
  title: string;
  outcomeId: OutcomeId;
};

export type WeeklyResetMovement = {
  /** Actions completed this week. */
  advanced: WeeklyResetMovementItem[];
  /** Actions currently blocked (as of now, not time-boxed to the week). */
  blocked: WeeklyResetMovementItem[];
  /** Actions intentionally dropped this week. */
  intentionallyDropped: WeeklyResetMovementItem[];
};

export type WeeklyResetNextWeek = {
  hasDirection: boolean;
  directionTitle?: string;
  seasonTitle?: string;
};

export type WeeklyResetView = {
  generatedAt: string;
  weekStart: string;
  weekEnd: string;
  reality: WeeklyResetReality;
  movement: WeeklyResetMovement;
  nextWeek: WeeklyResetNextWeek;
  unavailableSections: WeeklyResetUnavailableSection[];
  /** Most recent weekly_reset.completed LifeEvent, across all weeks. */
  lastCompletedAt?: string;
};

export type CompleteWeeklyResetInput = {
  weekStart: string;
  offsetMinutes: number;
};

/** [weekStart local midnight, weekStart+7d local midnight) as UTC instants,
 * same getTimezoneOffset semantics as result.ts's localDayRange. */
export function localWeekRange(weekStart: string, offsetMinutes: number): { from: Date; to: Date } | null {
  if (!isValidLocalDate(weekStart) || !isValidUtcOffsetMinutes(offsetMinutes)) return null;
  const [year, month, day] = weekStart.split("-").map(Number) as [number, number, number];
  const localMidnightAsUtc = Date.UTC(year, month - 1, day);
  const from = new Date(localMidnightAsUtc + offsetMinutes * 60_000);
  const to = new Date(from.getTime() + 7 * 24 * 60 * 60_000);
  return { from, to };
}

export function addDaysToLocalDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  const yyyy = shifted.getUTCFullYear();
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(shifted.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
