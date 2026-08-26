import {
  MISSING_NEXT_ACTION_CONTRACT_ID,
  MISSING_NEXT_ACTION_CONTRACT_VERSION,
  type MissingNextActionProposalV1,
  type OutcomeId,
  type ProjectId,
  type SeasonId
} from "@lifeos/domain";
import type { AiRuntimeMetadata } from "./index.js";

export type MissingNextActionInputV1 = {
  contractId: typeof MISSING_NEXT_ACTION_CONTRACT_ID;
  contractVersion: typeof MISSING_NEXT_ACTION_CONTRACT_VERSION;
  season: {
    id: SeasonId;
    title: string;
    purpose: string;
    primaryFocusText?: string;
  };
  outcome: {
    id: OutcomeId;
    title: string;
    successDefinition?: string;
  };
  project?: {
    id: ProjectId;
    title: string;
    description?: string;
  };
};

export type MissingNextActionProviderResult = {
  output: unknown;
  runtime?: AiRuntimeMetadata;
};

export interface MissingNextActionProvider {
  propose(
    input: MissingNextActionInputV1,
    options: { signal: AbortSignal }
  ): Promise<MissingNextActionProviderResult>;
}

export type MissingNextActionValidationResult =
  | { ok: true; proposal: MissingNextActionProposalV1 }
  | { ok: false; errors: string[] };

const ROOT_KEYS = ["contractId", "contractVersion", "proposal"] as const;
const PROPOSAL_KEYS = ["title", "doneCondition", "estimatedMinutes", "reason", "assumptions"] as const;
const MAX_TITLE_LENGTH = 500;
const MAX_DONE_CONDITION_LENGTH = 1_000;
const MAX_REASON_LENGTH = 1_000;
const MAX_ASSUMPTIONS = 10;
const MAX_ASSUMPTION_LENGTH = 500;
export const MAX_ACTION_ESTIMATED_MINUTES = 480;

export function createMissingNextActionInputV1(
  context: Omit<MissingNextActionInputV1, "contractId" | "contractVersion">
): MissingNextActionInputV1 {
  return {
    contractId: MISSING_NEXT_ACTION_CONTRACT_ID,
    contractVersion: MISSING_NEXT_ACTION_CONTRACT_VERSION,
    ...context
  };
}

export function validateMissingNextActionOutputV1(output: unknown): MissingNextActionValidationResult {
  const errors: string[] = [];
  if (!isRecord(output)) return { ok: false, errors: ["output must be an object"] };

  rejectUnknownKeys(output, ROOT_KEYS, "output", errors);
  if (output.contractId !== MISSING_NEXT_ACTION_CONTRACT_ID) {
    errors.push(`output.contractId must be ${MISSING_NEXT_ACTION_CONTRACT_ID}`);
  }
  if (output.contractVersion !== MISSING_NEXT_ACTION_CONTRACT_VERSION) {
    errors.push(`output.contractVersion must be ${MISSING_NEXT_ACTION_CONTRACT_VERSION}`);
  }
  if (!isRecord(output.proposal)) {
    errors.push("output.proposal must be an object");
    return { ok: false, errors };
  }

  const proposal = output.proposal;
  rejectUnknownKeys(proposal, PROPOSAL_KEYS, "output.proposal", errors);

  const title = parseRequiredText(proposal.title, "output.proposal.title", MAX_TITLE_LENGTH, errors);
  const doneCondition = parseRequiredText(
    proposal.doneCondition,
    "output.proposal.doneCondition",
    MAX_DONE_CONDITION_LENGTH,
    errors
  );
  const reason = parseRequiredText(proposal.reason, "output.proposal.reason", MAX_REASON_LENGTH, errors);

  let estimatedMinutes: number | null = null;
  if (
    !Number.isInteger(proposal.estimatedMinutes) ||
    (proposal.estimatedMinutes as number) < 1 ||
    (proposal.estimatedMinutes as number) > MAX_ACTION_ESTIMATED_MINUTES
  ) {
    errors.push(`output.proposal.estimatedMinutes must be an integer from 1 to ${MAX_ACTION_ESTIMATED_MINUTES}`);
  } else {
    estimatedMinutes = proposal.estimatedMinutes as number;
  }

  const assumptions: string[] = [];
  if (!Array.isArray(proposal.assumptions)) {
    errors.push("output.proposal.assumptions must be an array");
  } else if (proposal.assumptions.length > MAX_ASSUMPTIONS) {
    errors.push(`output.proposal.assumptions may contain at most ${MAX_ASSUMPTIONS} items`);
  } else {
    proposal.assumptions.forEach((assumption, index) => {
      const parsed = parseRequiredText(
        assumption,
        `output.proposal.assumptions[${index}]`,
        MAX_ASSUMPTION_LENGTH,
        errors
      );
      if (parsed) assumptions.push(parsed);
    });
  }

  if (errors.length > 0 || !title || !doneCondition || !reason || estimatedMinutes === null) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    proposal: { title, doneCondition, estimatedMinutes, reason, assumptions }
  };
}

function parseRequiredText(value: unknown, path: string, maxLength: number, errors: string[]): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path} must be a non-blank string`);
    return null;
  }
  if (value.length > maxLength) {
    errors.push(`${path} may be at most ${maxLength} characters`);
    return null;
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectUnknownKeys(
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
  path: string,
  errors: string[]
) {
  for (const key of Object.keys(record)) {
    if (!allowedKeys.includes(key)) errors.push(`${path}.${key} is not allowed`);
  }
}
