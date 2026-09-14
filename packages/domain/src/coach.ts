/**
 * The coach never invents a number. Every insight carries the counted facts it came from,
 * and nothing here schedules or changes anything by itself.
 */
export type CoachInsight = {
  id: string;
  kind: "focus" | "result" | "closing" | "capacity";
  title: string;
  body: string;
  evidence: string[];
};

export type CoachCapacityView = {
  workWindowMinutesPerDay: number;
  workDaysPerWeek: number;
  plannedWeeklyMinutes: number;
  focusMinutesLast7Days: number;
  focusSessionsLast7Days: number;
  interruptedSessionsLast7Days: number;
  scheduledMinutesNext7Days: number;
};

export type CoachView = {
  generatedAt: string;
  capacity: CoachCapacityView;
  insights: CoachInsight[];
  facts: {
    actionsCompletedLast7Days: number;
    actionsPartialLast7Days: number;
    actionsPostponedLast7Days: number;
    dailyClosesLast7Days: number;
    bestFocusHour?: number;
  };
};
