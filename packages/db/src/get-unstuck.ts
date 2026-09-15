import {
  describeStuckEvidence,
  isStuckEvidence,
  stuckEvidenceReasons,
  type ActionId,
  type ActionStatus,
  type ApplyGetUnstuckEditInput,
  type GetUnstuckDiagnosisView,
  type GetUnstuckFriction,
  type GetUnstuckListView,
  type OutcomeId,
  type StuckActionEvidence
} from "@lifeos/domain";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { DatabaseClient } from "./index.js";
import * as schema from "./schema.js";

const NEXT_ACTION_CONTRACT = "next-action-recommendation-v0" as const;
/** Statuses an Action must be in to appear as a Get Unstuck candidate. */
const CANDIDATE_STATUSES = ["ready", "active", "blocked", "postponed"] as const;
const MAX_CANDIDATES = 20;

export async function readGetUnstuckCandidates(
  database: DatabaseClient,
  userId: string,
  generatedAt: Date
): Promise<GetUnstuckListView> {
  const rows = await database.db
    .select({ action: schema.actions, outcome: schema.outcomes, project: schema.projects })
    .from(schema.actions)
    .innerJoin(schema.outcomes, and(eq(schema.actions.outcomeId, schema.outcomes.id), eq(schema.outcomes.userId, userId)))
    .leftJoin(schema.projects, and(eq(schema.actions.projectId, schema.projects.id), eq(schema.projects.userId, userId)))
    .where(and(eq(schema.actions.userId, userId), inArray(schema.actions.status, [...CANDIDATE_STATUSES])));

  const contextValid = (row: (typeof rows)[number]) =>
    row.outcome.status === "active" && (row.action.projectId === null || (row.project !== null && row.project.status === "active"));

  const candidates: StuckActionEvidence[] = [];
  for (const row of rows) {
    if (!contextValid(row)) continue;
    const evidence = await computeStuckEvidence(database, userId, row.action);
    if (isStuckEvidence(evidence)) candidates.push(evidence);
  }

  candidates.sort((left, right) => {
    if ((left.action.status === "blocked") !== (right.action.status === "blocked")) {
      return left.action.status === "blocked" ? -1 : 1;
    }
    const leftScore = left.postponedCount + left.blockedResultCount + left.wrongAssumptionCount;
    const rightScore = right.postponedCount + right.blockedResultCount + right.wrongAssumptionCount;
    return rightScore - leftScore;
  });

  return { generatedAt: generatedAt.toISOString(), candidates: candidates.slice(0, MAX_CANDIDATES) };
}

export type FindStuckActionOutcome = { status: "found"; evidence: StuckActionEvidence } | { status: "not_found" } | { status: "not_stuck" };

export async function findStuckAction(database: DatabaseClient, userId: string, actionId: string): Promise<FindStuckActionOutcome> {
  const [action] = await database.db
    .select()
    .from(schema.actions)
    .where(and(eq(schema.actions.id, actionId), eq(schema.actions.userId, userId)))
    .limit(1);
  if (!action) return { status: "not_found" };

  const evidence = await computeStuckEvidence(database, userId, action);
  if (!isStuckEvidence(evidence)) return { status: "not_stuck" };
  return { status: "found", evidence };
}

async function computeStuckEvidence(database: DatabaseClient, userId: string, action: schema.ActionRow): Promise<StuckActionEvidence> {
  const [resultCounts] = await database.db
    .select({
      postponed: sql<number>`count(*) filter (where ${schema.actionResults.result} = 'postponed')::int`,
      blocked: sql<number>`count(*) filter (where ${schema.actionResults.result} = 'blocked')::int`,
      lastMovedAt: sql<Date | null>`max(${schema.actionResults.recordedAt})`
    })
    .from(schema.actionResults)
    .where(and(eq(schema.actionResults.userId, userId), eq(schema.actionResults.actionId, action.id)));

  const [correctionCount] = await database.db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.recommendations)
    .where(
      and(
        eq(schema.recommendations.userId, userId),
        eq(schema.recommendations.kind, "next_action"),
        eq(schema.recommendations.status, "wrong_assumption"),
        sql`${schema.recommendations.proposedEntityPayload} ->> 'contract' = ${NEXT_ACTION_CONTRACT}`,
        sql`${schema.recommendations.proposedEntityPayload} ->> 'actionId' = ${action.id}`
      )
    );

  const evidence: StuckActionEvidence = {
    action: {
      id: action.id as ActionId,
      outcomeId: action.outcomeId as OutcomeId,
      title: action.title,
      status: action.status as ActionStatus,
      ...(action.doneCondition === null ? {} : { doneCondition: action.doneCondition }),
      ...(action.estimatedMinutes === null ? {} : { estimatedMinutes: action.estimatedMinutes }),
      ...(action.blockedReason === null ? {} : { blockedReason: action.blockedReason })
    },
    reasons: [],
    postponedCount: resultCounts?.postponed ?? 0,
    blockedResultCount: resultCounts?.blocked ?? 0,
    wrongAssumptionCount: correctionCount?.count ?? 0,
    ...(resultCounts?.lastMovedAt ? { lastMovedAt: new Date(resultCounts.lastMovedAt).toISOString() } : {})
  };
  evidence.reasons = stuckEvidenceReasons(evidence);
  return evidence;
}

export type DiagnoseGetUnstuckOutcome =
  | { status: "diagnosed"; view: GetUnstuckDiagnosisView }
  | { status: "not_found" }
  | { status: "not_stuck" };

export async function diagnoseGetUnstuck(
  database: DatabaseClient,
  userId: string,
  actionId: string,
  friction: GetUnstuckFriction,
  intervention: GetUnstuckDiagnosisView["intervention"],
  recordedAt: Date
): Promise<DiagnoseGetUnstuckOutcome> {
  const found = await findStuckAction(database, userId, actionId);
  if (found.status === "not_found") return { status: "not_found" };
  if (found.status === "not_stuck") return { status: "not_stuck" };

  await database.db.insert(schema.lifeEvents).values({
    userId,
    type: "get_unstuck.friction_selected",
    source: "user",
    entityType: "action",
    entityId: actionId,
    payload: {
      friction,
      intervention,
      actionStatus: found.evidence.action.status,
      postponedCount: found.evidence.postponedCount,
      blockedResultCount: found.evidence.blockedResultCount,
      wrongAssumptionCount: found.evidence.wrongAssumptionCount,
      evidenceSentence: describeStuckEvidence(found.evidence)
    },
    occurredAt: recordedAt
  });

  const canRevive = found.evidence.action.status === "blocked" || found.evidence.action.status === "postponed";
  const canRecordResult = found.evidence.action.status === "ready" || found.evidence.action.status === "active";

  return {
    status: "diagnosed",
    view: { actionId: actionId as ActionId, friction, intervention, evidence: found.evidence, canRevive, canRecordResult }
  };
}

export type ApplyGetUnstuckEditOutcome = { status: "applied"; action: schema.ActionRow } | { status: "not_found" } | { status: "invalid_status" };

export async function applyGetUnstuckEdit(
  database: DatabaseClient,
  userId: string,
  actionId: string,
  input: ApplyGetUnstuckEditInput,
  editedAt: Date
): Promise<ApplyGetUnstuckEditOutcome> {
  return database.db.transaction(async (transaction) => {
    const [action] = await transaction
      .select()
      .from(schema.actions)
      .where(and(eq(schema.actions.id, actionId), eq(schema.actions.userId, userId)))
      .limit(1)
      .for("update");
    if (!action) return { status: "not_found" };
    if (action.status === "completed" || action.status === "dropped") return { status: "invalid_status" };

    const [updated] = await transaction
      .update(schema.actions)
      .set({
        updatedAt: editedAt,
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.doneCondition === undefined ? {} : { doneCondition: input.doneCondition }),
        ...(input.estimatedMinutes === undefined ? {} : { estimatedMinutes: input.estimatedMinutes })
      })
      .where(and(eq(schema.actions.id, actionId), eq(schema.actions.userId, userId)))
      .returning();
    if (!updated) throw new Error("Failed to apply Get Unstuck edit");

    await transaction.insert(schema.lifeEvents).values({
      userId,
      type: "get_unstuck.intervention_applied",
      source: "user",
      entityType: "action",
      entityId: actionId,
      payload: { intervention: input.intervention, previousStatus: action.status },
      occurredAt: editedAt
    });

    return { status: "applied", action: updated };
  });
}

export type ReviveActionOutcome = { status: "revived"; action: schema.ActionRow } | { status: "not_found" } | { status: "invalid_status"; currentStatus: string };

/** The only path back into rotation for a blocked or postponed Action. */
export async function reviveGetUnstuckAction(
  database: DatabaseClient,
  userId: string,
  actionId: string,
  revivedAt: Date
): Promise<ReviveActionOutcome> {
  return database.db.transaction(async (transaction) => {
    const [action] = await transaction
      .select()
      .from(schema.actions)
      .where(and(eq(schema.actions.id, actionId), eq(schema.actions.userId, userId)))
      .limit(1)
      .for("update");
    if (!action) return { status: "not_found" };
    if (action.status !== "blocked" && action.status !== "postponed") {
      return { status: "invalid_status", currentStatus: action.status };
    }

    const [updated] = await transaction
      .update(schema.actions)
      .set({ status: "ready", blockedReason: null, updatedAt: revivedAt })
      .where(and(eq(schema.actions.id, actionId), eq(schema.actions.userId, userId)))
      .returning();
    if (!updated) throw new Error("Failed to revive Action");

    await transaction.insert(schema.lifeEvents).values({
      userId,
      type: "get_unstuck.intervention_applied",
      source: "user",
      entityType: "action",
      entityId: actionId,
      payload: { intervention: "unblock", previousStatus: action.status },
      occurredAt: revivedAt
    });

    return { status: "revived", action: updated };
  });
}
