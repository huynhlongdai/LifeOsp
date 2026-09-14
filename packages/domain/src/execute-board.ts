import type { ActionView } from "./action.js";
import type { OutcomeView, ProjectView } from "./execution-context.js";
import type { SeasonId } from "./ids.js";

/**
 * EXECUTE reads the confirmed Season as a board: Outcomes own Projects, Projects own
 * Actions. Actions that belong to an Outcome without a Project stay visible at the
 * Outcome level so nothing silently disappears from the board.
 */
export type ExecuteProjectGroupView = {
  project: ProjectView;
  actions: ActionView[];
};

export type ExecuteOutcomeGroupView = {
  outcome: OutcomeView;
  projects: ExecuteProjectGroupView[];
  unassignedActions: ActionView[];
};

export type ExecuteBoardView = {
  seasonId: SeasonId;
  seasonTitle: string;
  outcomes: ExecuteOutcomeGroupView[];
};
