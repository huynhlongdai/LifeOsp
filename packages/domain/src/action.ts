import type { ActionId, OutcomeId, ProjectId } from "./ids.js";

export const ACTION_STATUSES = [
  "candidate",
  "ready",
  "active",
  "completed",
  "partial",
  "postponed",
  "blocked",
  "dropped"
] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export const MISSING_NEXT_ACTION_CONTRACT_ID = "missing-next-action-v1" as const;
export const MISSING_NEXT_ACTION_CONTRACT_VERSION = 1 as const;

export type ActionView = {
  id: ActionId;
  outcomeId: OutcomeId;
  projectId?: ProjectId;
  title: string;
  doneCondition?: string;
  estimatedMinutes?: number;
  status: ActionStatus;
  priority?: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateActionCandidateInput = {
  outcomeId: OutcomeId;
  projectId?: ProjectId;
  title: string;
  doneCondition?: string;
  estimatedMinutes?: number;
  priority?: number;
};

export type ConfirmActionCandidateInput = {
  title?: string;
  doneCondition?: string;
  estimatedMinutes?: number;
  priority?: number;
};

export type MissingNextActionProposalV1 = {
  title: string;
  doneCondition: string;
  estimatedMinutes: number;
  reason: string;
  assumptions: string[];
};
