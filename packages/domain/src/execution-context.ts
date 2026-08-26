import type { OutcomeId, ProjectId, SeasonId } from "./ids.js";

export const OUTCOME_STATUSES = ["active", "achieved", "paused", "dropped"] as const;
export type OutcomeStatus = (typeof OUTCOME_STATUSES)[number];

export const PROJECT_STATUSES = ["candidate", "active", "paused", "completed", "dropped"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type OutcomeView = {
  id: OutcomeId;
  seasonId: SeasonId;
  title: string;
  successDefinition?: string;
  status: OutcomeStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProjectView = {
  id: ProjectId;
  outcomeId: OutcomeId;
  title: string;
  description?: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateExecutionContextInput = {
  seasonId: SeasonId;
  outcome: {
    title: string;
    successDefinition?: string;
  };
  project?: {
    title: string;
    description?: string;
  };
};

export type CreatedExecutionContextView = {
  seasonId: SeasonId;
  outcome: OutcomeView;
  project?: ProjectView;
};

export type CurrentExecutionContextView = {
  seasonId: SeasonId;
  outcomes: Array<{
    outcome: OutcomeView;
    projects: ProjectView[];
  }>;
};
