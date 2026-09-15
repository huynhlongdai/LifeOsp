import type { ActionView } from "./action.js";
import type { OutcomeId, ProjectId } from "./ids.js";

// Execute landing (spec §7.1). Purpose: inspect execution structure without
// competing with NOW. Facts only — counts, not percentages (Figma
// reconciliation K6: "thay % progress bằng đếm sự kiện thật").

export const EXECUTE_RECENTLY_FINISHED_LIMIT = 10 as const;

/** ActionView plus the two facts Execute needs that NOW/B1 don't carry. */
export type ExecuteActionView = ActionView & {
  blockedReason?: string;
  completedAt?: string;
};

export type ExecuteOutcomeSummary = {
  id: OutcomeId;
  title: string;
};

export type ExecuteProjectSummary = {
  id: ProjectId;
  outcomeId: OutcomeId;
  title: string;
};

export type ExecuteBoardView = {
  generatedAt: string;
  /** status = 'ready', oldest first (spec: not a huge backlog by default). */
  ready: ExecuteActionView[];
  /** status = 'candidate', awaiting user confirmation. */
  candidates: ExecuteActionView[];
  /** status = 'blocked'. */
  blocked: ExecuteActionView[];
  /** status in ('completed', 'partial'), most recent first, capped at EXECUTE_RECENTLY_FINISHED_LIMIT. */
  recentlyFinished: ExecuteActionView[];
  /** For the Outcome/Project filter; active-only, not every Outcome/Project the user has ever created. */
  outcomes: ExecuteOutcomeSummary[];
  projects: ExecuteProjectSummary[];
};

export function isExecuteBoardEmpty(board: Pick<ExecuteBoardView, "ready" | "candidates" | "blocked" | "recentlyFinished">): boolean {
  return board.ready.length === 0 && board.candidates.length === 0 && board.blocked.length === 0 && board.recentlyFinished.length === 0;
}
