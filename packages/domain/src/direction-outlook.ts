/**
 * The DIRECTION outlook: what the current Season is actually made of, read from
 * stored Outcomes and Actions. Nothing is scored by a model and nothing is created
 * here — the analysis only repeats counts the user can verify.
 */

export type FocusAreaView = {
  outcomeId: string;
  title: string;
  successDefinition?: string;
  actionsTotal: number;
  actionsCompleted: number;
  percent: number | null;
};

export type MilestoneView = {
  outcomeId: string;
  title: string;
  actionsRemaining: number;
  nextActionTitle?: string;
};

export type SeasonWinView = { actionId: string; title: string; completedAt: string };

export type DirectionAnalysisView = { title: string; body: string; evidence: string[] };

export type DirectionOutlookView = {
  focusAreas: FocusAreaView[];
  nextMilestone: MilestoneView | null;
  recentWins: SeasonWinView[];
  analysis: DirectionAnalysisView;
};

export type DirectionOutlookInput = {
  outcomes: {
    outcomeId: string;
    title: string;
    successDefinition?: string;
    status: string;
    actionsTotal: number;
    actionsCompleted: number;
    nextActionTitle?: string;
  }[];
  recentWins: SeasonWinView[];
  actionsCompletedLast14Days: number;
  focusMinutesLast14Days: number;
};

export function buildDirectionOutlook(input: DirectionOutlookInput): DirectionOutlookView {
  const active = input.outcomes.filter((outcome) => outcome.status === "active");

  const focusAreas: FocusAreaView[] = active.map((outcome) => ({
    outcomeId: outcome.outcomeId,
    title: outcome.title,
    ...(outcome.successDefinition ? { successDefinition: outcome.successDefinition } : {}),
    actionsTotal: outcome.actionsTotal,
    actionsCompleted: outcome.actionsCompleted,
    percent: outcome.actionsTotal === 0 ? null : Math.round((outcome.actionsCompleted / outcome.actionsTotal) * 100)
  }));

  // The nearest milestone is the started Outcome with the fewest Actions left —
  // closest to done by stored work, not by a guess about importance.
  const candidates = active
    .map((outcome) => ({ outcome, remaining: outcome.actionsTotal - outcome.actionsCompleted }))
    .filter((entry) => entry.outcome.actionsTotal > 0 && entry.remaining > 0)
    .sort((left, right) => left.remaining - right.remaining || left.outcome.title.localeCompare(right.outcome.title));

  const nearest = candidates[0];
  const nextMilestone: MilestoneView | null = nearest
    ? {
        outcomeId: nearest.outcome.outcomeId,
        title: nearest.outcome.title,
        actionsRemaining: nearest.remaining,
        ...(nearest.outcome.nextActionTitle ? { nextActionTitle: nearest.outcome.nextActionTitle } : {})
      }
    : null;

  return { focusAreas, nextMilestone, recentWins: input.recentWins, analysis: buildAnalysis(input, active.length) };
}

function buildAnalysis(input: DirectionOutlookInput, activeOutcomes: number): DirectionAnalysisView {
  const hours = Math.round((input.focusMinutesLast14Days / 60) * 10) / 10;
  const evidence = [
    `${activeOutcomes} Outcome đang hoạt động`,
    `${input.actionsCompletedLast14Days} Action hoàn thành trong 14 ngày`,
    `${hours} giờ Focus trong 14 ngày`
  ];

  if (activeOutcomes === 0) {
    return {
      title: "Season này chưa có Outcome nào",
      body: "Chưa có gì để đo tiến độ. Thêm Outcome cho Season để LifeOS biết bạn đang đi về đâu.",
      evidence
    };
  }

  if (input.actionsCompletedLast14Days === 0 && input.focusMinutesLast14Days === 0) {
    return {
      title: "Hai tuần qua chưa có việc nào chạy",
      body: "Season vẫn đứng yên trên dữ liệu. Nếu hướng vẫn đúng, chọn một Action nhỏ để khởi động lại.",
      evidence
    };
  }

  if (activeOutcomes > 3) {
    return {
      title: "Season đang mở quá nhiều hướng cùng lúc",
      body: `${activeOutcomes} Outcome cùng chạy trong khi bạn hoàn thành ${input.actionsCompletedLast14Days} Action trong 14 ngày. Cân nhắc tạm dừng bớt, LifeOS không tự dừng thay bạn.`,
      evidence
    };
  }

  return {
    title: "Season đang tiến theo đúng hướng đã chọn",
    body: `Bạn hoàn thành ${input.actionsCompletedLast14Days} Action và bỏ ${hours} giờ Focus trong 14 ngày qua cho ${activeOutcomes} Outcome đang hoạt động.`,
    evidence
  };
}
