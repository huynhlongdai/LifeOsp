export type ReflectWeekDayView = {
  localDate: string;
  focusMinutes: number;
  focusSessions: number;
  actionsCompleted: number;
  closed: boolean;
};

/** Seven counted days. Days with no activity are zeros, never estimates. */
export type ReflectWeekView = {
  tzOffsetMinutes: number;
  days: ReflectWeekDayView[];
  totals: { focusMinutes: number; actionsCompleted: number; closedDays: number };
};
