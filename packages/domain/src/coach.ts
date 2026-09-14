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

export type LifeScoreComponent = {
  id: "execution" | "focus" | "outcome" | "reflection";
  label: string;
  weightPercent: number;
  /** 0..100, or null when LifeOS has no data to compute this part honestly. */
  value: number | null;
  detail: string;
};

/**
 * A single number is only shown when every part of it comes from stored data.
 * Missing parts stay null and are named, instead of being filled with a guess.
 */
export type LifeScoreView = {
  windowDays: 7;
  score: number | null;
  components: LifeScoreComponent[];
  missingReason?: string;
};

export type LifeScoreInput = {
  actionsCompletedLast7Days: number;
  actionsPartialLast7Days: number;
  actionsPostponedLast7Days: number;
  focusMinutesLast7Days: number;
  focusMinutesGoalPerDay: number;
  outcomeActionsTotal: number;
  outcomeActionsCompleted: number;
  dailyClosesLast7Days: number;
};

const LIFE_SCORE_WEIGHTS = { execution: 35, focus: 25, outcome: 25, reflection: 15 } as const;

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Weighted 0..100 over the last 7 days; parts without data are skipped, not assumed. */
export function computeLifeScore(input: LifeScoreInput): LifeScoreView {
  const decided = input.actionsCompletedLast7Days + input.actionsPartialLast7Days + input.actionsPostponedLast7Days;
  const focusGoal = Math.max(0, input.focusMinutesGoalPerDay) * 7;

  const components: LifeScoreComponent[] = [
    {
      id: "execution",
      label: "Thực thi",
      weightPercent: LIFE_SCORE_WEIGHTS.execution,
      value: decided === 0 ? null : clampPercent(((input.actionsCompletedLast7Days + 0.5 * input.actionsPartialLast7Days) / decided) * 100),
      detail:
        decided === 0
          ? "Chưa có Action nào được ghi kết quả trong 7 ngày"
          : `${input.actionsCompletedLast7Days} xong · ${input.actionsPartialLast7Days} một phần · ${input.actionsPostponedLast7Days} hoãn`
    },
    {
      id: "focus",
      label: "Deep focus",
      weightPercent: LIFE_SCORE_WEIGHTS.focus,
      value: focusGoal === 0 || input.focusMinutesLast7Days === 0 ? null : clampPercent((input.focusMinutesLast7Days / focusGoal) * 100),
      detail:
        focusGoal === 0 || input.focusMinutesLast7Days === 0
          ? "Chưa có phút focus nào trong 7 ngày"
          : `${input.focusMinutesLast7Days} / ${focusGoal} phút focus trong 7 ngày`
    },
    {
      id: "outcome",
      label: "Tiến độ Outcome",
      weightPercent: LIFE_SCORE_WEIGHTS.outcome,
      value: input.outcomeActionsTotal === 0 ? null : clampPercent((input.outcomeActionsCompleted / input.outcomeActionsTotal) * 100),
      detail:
        input.outcomeActionsTotal === 0
          ? "Chưa có Action nào thuộc Outcome đang hoạt động"
          : `${input.outcomeActionsCompleted} / ${input.outcomeActionsTotal} Action của Outcome đang hoạt động đã xong`
    },
    {
      id: "reflection",
      label: "Nhìn lại",
      weightPercent: LIFE_SCORE_WEIGHTS.reflection,
      value: input.dailyClosesLast7Days === 0 ? null : clampPercent((Math.min(7, input.dailyClosesLast7Days) / 7) * 100),
      detail:
        input.dailyClosesLast7Days === 0
          ? "Chưa có ngày nào được chốt trong 7 ngày"
          : `${input.dailyClosesLast7Days} / 7 ngày có chốt ngày`
    }
  ];

  const usable = components.filter((component) => component.value !== null);
  const totalWeight = usable.reduce((sum, component) => sum + component.weightPercent, 0);
  if (usable.length < 2 || totalWeight === 0) {
    return {
      windowDays: 7,
      score: null,
      components,
      missingReason: "Chưa đủ dữ liệu 7 ngày để tính điểm — LifeOS không đoán thay bạn."
    };
  }

  const score = Math.round(
    usable.reduce((sum, component) => sum + (component.value as number) * component.weightPercent, 0) / totalWeight
  );
  return { windowDays: 7, score, components };
}

export type CoachView = {
  generatedAt: string;
  capacity: CoachCapacityView;
  lifeScore: LifeScoreView;
  insights: CoachInsight[];
  facts: {
    actionsCompletedLast7Days: number;
    actionsPartialLast7Days: number;
    actionsPostponedLast7Days: number;
    dailyClosesLast7Days: number;
    bestFocusHour?: number;
  };
};
