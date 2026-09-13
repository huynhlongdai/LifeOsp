import type { ActionId, FocusSessionId, LifeEventId } from "./ids.js";

export const ACTION_RESULT_TYPES = [
  "completed",
  "partial",
  "postponed",
  "blocked",
  "dropped"
] as const;
export type ActionResultType = (typeof ACTION_RESULT_TYPES)[number];

export const FOCUS_RESULT_TYPES = [
  "completed",
  "interrupted",
  "abandoned"
] as const;
export type FocusResultType = (typeof FOCUS_RESULT_TYPES)[number];

export type ActionResultView = {
  id: string;
  actionId: ActionId;
  resultType: ActionResultType;
  note?: string;
  createdAt: string;
};

export type FocusResultView = {
  id: string;
  focusSessionId: FocusSessionId;
  resultType: FocusResultType;
  actualMinutes?: number;
  note?: string;
  createdAt: string;
};

export type RecordActionResultInput = {
  resultType: ActionResultType;
  note?: string;
};

export type RecordFocusResultInput = {
  resultType: FocusResultType;
  actualMinutes?: number;
  note?: string;
};

export type DailyCloseView = {
  id: string;
  date: string;
  actionsCompleted: number;
  actionsPartial: number;
  actionsPostponed: number;
  actionsBlocked: number;
  actionsDropped: number;
  focusSessionsCompleted: number;
  focusSessionsInterrupted: number;
  focusSessionsAbandoned: number;
  totalFocusMinutes: number;
  note?: string;
  createdAt: string;
};

export type CloseDayInput = {
  date: string;
  note?: string;
};
