import { and, asc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import {
  actionStatusForResult,
  defaultFocusOutcomeForResult,
  localDateWindow,
  type ActionId,
  type ActionResultId,
  type ActionResultOutcome,
  type ActionResultView,
  type ActionStatus,
  type DailyCloseId,
  type DailyCloseSummary,
  type DailyCloseView,
  type FocusEndOutcome,
  type FocusSessionId,
  type FocusSessionStatus
} from "@lifeos/domain";
import type { DatabaseClient } from "./index.js";
import * as schema from "./schema.js";

const OPEN_RECOMMENDATION_STATUSES = ["shown", "accepted", "edited"] as const;
const NEXT_ACTION_CONTRACT = "next-action-recommendation-v0" as const;

export type RecordActionResultParams = {
  userId: string;
  actionId: string;
  outcome: ActionResultOutcome;
  note?: string;
  reason?: string;
  focusSessionId?: string;
  focusOutcome?: FocusEndOutcome;
  postponedTo?: string;
  recordedAt: Date;
};

export type RecordActionResultResult =
  | { status: "recorded"; result: schema.ActionResultRow; action: schema.ActionRow; focus?: schema.FocusSessionRow }
  | { status: "not_found" }
  | { status: "already_recorded"; currentStatus: string }
  | { status: "invalid_status"; currentStatus: string }
  | { status: "invalid_focus"; currentStatus?: string }
  | { status: "reason_required" };

/**
 * Records the user's explicit Action result.
 *
 * Atomic with: optional FocusSession commit, resolution of the open NOW
 * recommendation for the Action, and LifeEvents. Nothing here infers a result
 * and postponing/dropping never creates synthetic overdue debt: `scheduledFor`
 * is cleared unless the user explicitly chose a revisit date.
 */
export async function recordActionResult(
  database: DatabaseClient,
  params: RecordActionResultParams
): Promise<RecordActionResultResult> {
  if (params.outcome === "blocked" && (params.reason === undefined || params.reason.trim().length === 0)) {
    return { status: "reason_required" };
  }

  return database.db.transaction(async (transaction) => {
    const [action] = await transaction
      .select()
      .from(schema.actions)
      .where(and(eq(schema.actions.id, params.actionId), eq(schema.actions.userId, params.userId)))
      .limit(1)
      .for("update");
    if (!action) return { status: "not_found" };

    const [existing] = await transaction
      .select({ id: schema.actionResults.id })
      .from(schema.actionResults)
      .where(and(eq(schema.actionResults.actionId, action.id), eq(schema.actionResults.userId, params.userId)))
      .limit(1)
      .for("update");
    if (existing) return { status: "already_recorded", currentStatus: action.status };

    if (action.status !== "ready" && action.status !== "active") {
      return { status: "invalid_status", currentStatus: action.status };
    }
    const previousActionStatus = action.status;

    let focus: schema.FocusSessionRow | undefined;
    if (params.focusSessionId !== undefined) {
      const [candidate] = await transaction
        .select()
        .from(schema.focusSessions)
        .where(
          and(eq(schema.focusSessions.id, params.focusSessionId), eq(schema.focusSessions.userId, params.userId))
        )
        .limit(1)
        .for("update");
      if (!candidate) return { status: "invalid_focus" };
      if (candidate.actionId !== action.id) return { status: "invalid_focus" };
      if (candidate.status !== "active") return { status: "invalid_focus", currentStatus: candidate.status };
      focus = candidate;
    }

    const nextActionStatus: ActionStatus = actionStatusForResult(params.outcome);
    const [updatedAction] = await transaction
      .update(schema.actions)
      .set({
        status: nextActionStatus,
        updatedAt: params.recordedAt,
        completedAt: params.outcome === "completed" ? params.recordedAt : null,
        blockedReason: params.outcome === "blocked" ? (params.reason ?? null) : null,
        // No synthetic overdue debt: only an explicit user revisit date is kept.
        scheduledFor:
          params.outcome === "postponed" && params.postponedTo !== undefined
            ? new Date(`${params.postponedTo}T00:00:00Z`)
            : null
      })
      .where(and(eq(schema.actions.id, action.id), eq(schema.actions.userId, params.userId)))
      .returning();
    if (!updatedAction) throw new Error("Failed to update Action for result");

    let committedFocus: schema.FocusSessionRow | undefined;
    let focusMinutes: number | null = null;
    if (focus) {
      const focusOutcome: FocusEndOutcome = params.focusOutcome ?? defaultFocusOutcomeForResult(params.outcome);
      const [endedFocus] = await transaction
        .update(schema.focusSessions)
        .set({ status: focusOutcome, endedAt: params.recordedAt, updatedAt: params.recordedAt })
        .where(and(eq(schema.focusSessions.id, focus.id), eq(schema.focusSessions.userId, params.userId)))
        .returning();
      if (!endedFocus) throw new Error("Failed to commit FocusSession with Action result");
      committedFocus = endedFocus;
      focusMinutes = elapsedMinutes(endedFocus.startedAt, params.recordedAt);

      await transaction.insert(schema.lifeEvents).values({
        userId: params.userId,
        type: `focus.${focusOutcome}`,
        source: "user",
        entityType: "focus_session",
        entityId: endedFocus.id,
        payload: {
          actionId: action.id,
          recommendationId: endedFocus.recommendationId,
          outcome: focusOutcome,
          committedWithActionResult: true
        },
        occurredAt: params.recordedAt
      });
    }

    const [result] = await transaction
      .insert(schema.actionResults)
      .values({
        userId: params.userId,
        actionId: action.id,
        ...(committedFocus === undefined ? {} : { focusSessionId: committedFocus.id }),
        ...(committedFocus?.recommendationId ? { recommendationId: committedFocus.recommendationId } : {}),
        outcome: params.outcome,
        previousActionStatus,
        ...(params.note === undefined ? {} : { note: params.note }),
        ...(params.reason === undefined ? {} : { reason: params.reason }),
        ...(params.postponedTo === undefined ? {} : { postponedTo: params.postponedTo }),
        ...(focusMinutes === null ? {} : { focusMinutes }),
        ...(committedFocus?.plannedMinutes == null ? {} : { plannedMinutes: committedFocus.plannedMinutes }),
        recordedAt: params.recordedAt
      })
      .returning();
    if (!result) throw new Error("Failed to record Action result");

    await resolveOpenRecommendationsForAction(transaction, params.userId, action.id, params.outcome, params.recordedAt);

    await transaction.insert(schema.lifeEvents).values({
      userId: params.userId,
      type: "action.result.recorded",
      source: "user",
      entityType: "action",
      entityId: action.id,
      payload: {
        actionResultId: result.id,
        outcome: params.outcome,
        previousStatus: previousActionStatus,
        status: nextActionStatus,
        outcomeId: action.outcomeId,
        projectId: action.projectId,
        focusSessionId: committedFocus?.id ?? null,
        focusMinutes,
        plannedMinutes: committedFocus?.plannedMinutes ?? null,
        postponedTo: params.postponedTo ?? null,
        hasNote: params.note !== undefined,
        hasReason: params.reason !== undefined
      },
      occurredAt: params.recordedAt
    });

    return {
      status: "recorded",
      result,
      action: updatedAction,
      ...(committedFocus === undefined ? {} : { focus: committedFocus })
    };
  });
}

export type CommitDailyCloseParams = {
  userId: string;
  localDate: string;
  tzOffsetMinutes: number;
  note?: string;
  closedAt: Date;
};

export type CommitDailyCloseResult =
  | { status: "closed"; view: DailyCloseView }
  | { status: "already_closed"; closedAt: string };

/**
 * Persists a Daily Close for one local date. The stored summary contains only
 * facts already recorded in the system plus the user's optional note.
 */
export async function commitDailyClose(
  database: DatabaseClient,
  params: CommitDailyCloseParams
): Promise<CommitDailyCloseResult> {
  return database.db.transaction(async (transaction) => {
    const [existing] = await transaction
      .select()
      .from(schema.dailyCloses)
      .where(and(eq(schema.dailyCloses.userId, params.userId), eq(schema.dailyCloses.localDate, params.localDate)))
      .limit(1)
      .for("update");
    if (existing) return { status: "already_closed", closedAt: existing.closedAt.toISOString() };

    const facts = await readDailyFacts(transaction, params.userId, params.localDate, params.tzOffsetMinutes);

    const [row] = await transaction
      .insert(schema.dailyCloses)
      .values({
        userId: params.userId,
        localDate: params.localDate,
        tzOffsetMinutes: params.tzOffsetMinutes,
        ...(params.note === undefined ? {} : { note: params.note }),
        summary: facts.summary,
        closedAt: params.closedAt
      })
      .returning();
    if (!row) throw new Error("Failed to record Daily Close");

    await transaction.insert(schema.lifeEvents).values({
      userId: params.userId,
      type: "daily_close.recorded",
      source: "user",
      entityType: "daily_close",
      entityId: row.id,
      payload: {
        localDate: params.localDate,
        tzOffsetMinutes: params.tzOffsetMinutes,
        summary: facts.summary,
        hasNote: params.note !== undefined
      },
      occurredAt: params.closedAt
    });

    return {
      status: "closed",
      view: {
        localDate: params.localDate,
        tzOffsetMinutes: params.tzOffsetMinutes,
        generatedAt: params.closedAt.toISOString(),
        summary: facts.summary,
        results: facts.results,
        closed: {
          id: row.id as DailyCloseId,
          closedAt: row.closedAt.toISOString(),
          ...(row.note === null ? {} : { note: row.note })
        }
      }
    };
  });
}

export async function readDailyClose(
  database: DatabaseClient,
  userId: string,
  localDate: string,
  tzOffsetMinutes: number,
  generatedAt: Date
): Promise<DailyCloseView> {
  const facts = await readDailyFacts(database.db, userId, localDate, tzOffsetMinutes);

  const [closed] = await database.db
    .select()
    .from(schema.dailyCloses)
    .where(and(eq(schema.dailyCloses.userId, userId), eq(schema.dailyCloses.localDate, localDate)))
    .limit(1);

  return {
    localDate,
    tzOffsetMinutes,
    generatedAt: generatedAt.toISOString(),
    summary: facts.summary,
    results: facts.results,
    ...(closed === undefined
      ? {}
      : {
          closed: {
            id: closed.id as DailyCloseId,
            closedAt: closed.closedAt.toISOString(),
            ...(closed.note === null ? {} : { note: closed.note })
          }
        })
  };
}

export async function findActionResultByActionId(
  database: DatabaseClient,
  userId: string,
  actionId: string
): Promise<schema.ActionResultRow | null> {
  const [row] = await database.db
    .select()
    .from(schema.actionResults)
    .where(and(eq(schema.actionResults.actionId, actionId), eq(schema.actionResults.userId, userId)))
    .limit(1);
  return row ?? null;
}

export function toActionResultView(
  result: schema.ActionResultRow,
  action: schema.ActionRow,
  focus?: schema.FocusSessionRow
): ActionResultView {
  return {
    id: result.id as ActionResultId,
    actionId: result.actionId as ActionId,
    outcome: result.outcome as ActionResultOutcome,
    actionStatus: action.status as ActionStatus,
    previousActionStatus: result.previousActionStatus as ActionResultView["previousActionStatus"],
    ...(result.note === null ? {} : { note: result.note }),
    ...(result.reason === null ? {} : { reason: result.reason }),
    ...(result.postponedTo === null ? {} : { postponedTo: result.postponedTo }),
    ...(result.focusSessionId === null ? {} : { focusSessionId: result.focusSessionId as FocusSessionId }),
    ...(focus === undefined ? {} : { focusStatus: focus.status as FocusSessionStatus }),
    ...(result.focusMinutes === null ? {} : { focusMinutes: result.focusMinutes }),
    ...(result.plannedMinutes === null ? {} : { plannedMinutes: result.plannedMinutes }),
    recordedAt: result.recordedAt.toISOString()
  };
}

type AnyTransaction = DatabaseClient["db"] | Parameters<Parameters<DatabaseClient["db"]["transaction"]>[0]>[0];

async function readDailyFacts(
  executor: AnyTransaction,
  userId: string,
  localDate: string,
  tzOffsetMinutes: number
): Promise<{ summary: DailyCloseSummary; results: ActionResultView[] }> {
  const { from, to } = localDateWindow(localDate, tzOffsetMinutes);

  const resultRows = await executor
    .select({ result: schema.actionResults, action: schema.actions })
    .from(schema.actionResults)
    .innerJoin(schema.actions, eq(schema.actionResults.actionId, schema.actions.id))
    .where(
      and(
        eq(schema.actionResults.userId, userId),
        gte(schema.actionResults.recordedAt, from),
        lt(schema.actionResults.recordedAt, to)
      )
    )
    .orderBy(asc(schema.actionResults.recordedAt));

  const focusRows = await executor
    .select({
      status: schema.focusSessions.status,
      startedAt: schema.focusSessions.startedAt,
      endedAt: schema.focusSessions.endedAt
    })
    .from(schema.focusSessions)
    .where(
      and(
        eq(schema.focusSessions.userId, userId),
        gte(schema.focusSessions.startedAt, from),
        lt(schema.focusSessions.startedAt, to)
      )
    );

  const captureRows = await executor
    .select({ kind: schema.captures.kind })
    .from(schema.captures)
    .where(
      and(
        eq(schema.captures.userId, userId),
        gte(schema.captures.createdAt, from),
        lt(schema.captures.createdAt, to)
      )
    );

  const results = resultRows.map((row) => toActionResultView(row.result, row.action));
  const summary: DailyCloseSummary = {
    resultsRecorded: results.length,
    completed: countOutcome(results, "completed"),
    partial: countOutcome(results, "partial"),
    postponed: countOutcome(results, "postponed"),
    blocked: countOutcome(results, "blocked"),
    dropped: countOutcome(results, "dropped"),
    focusSessions: focusRows.length,
    focusMinutes: focusRows.reduce(
      (total, focus) => total + (focus.endedAt === null ? 0 : elapsedMinutes(focus.startedAt, focus.endedAt)),
      0
    ),
    distractionsCaptured: captureRows.filter((capture) => capture.kind === "distraction").length,
    capturesCreated: captureRows.filter((capture) => capture.kind !== "distraction").length
  };

  return { summary, results };
}

function countOutcome(results: ActionResultView[], outcome: ActionResultOutcome): number {
  return results.filter((result) => result.outcome === outcome).length;
}

function elapsedMinutes(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000));
}

async function resolveOpenRecommendationsForAction(
  transaction: Parameters<Parameters<DatabaseClient["db"]["transaction"]>[0]>[0],
  userId: string,
  actionId: string,
  outcome: ActionResultOutcome,
  occurredAt: Date
): Promise<void> {
  const open = await transaction
    .select()
    .from(schema.recommendations)
    .where(
      and(
        eq(schema.recommendations.userId, userId),
        eq(schema.recommendations.kind, "next_action"),
        inArray(schema.recommendations.status, [...OPEN_RECOMMENDATION_STATUSES]),
        isNull(schema.recommendations.resolvedAt),
        sql`${schema.recommendations.proposedEntityPayload} ->> 'contract' = ${NEXT_ACTION_CONTRACT}`,
        sql`${schema.recommendations.proposedEntityPayload} ->> 'actionId' = ${actionId}`
      )
    )
    .for("update");

  for (const recommendation of open) {
    await transaction
      .update(schema.recommendations)
      .set({ resolvedAt: occurredAt })
      .where(eq(schema.recommendations.id, recommendation.id));

    await transaction.insert(schema.lifeEvents).values({
      userId,
      type: "recommendation.resolved",
      source: "user",
      entityType: "recommendation",
      entityId: recommendation.id,
      payload: { kind: "next_action", actionId, reason: "action_result_recorded", outcome },
      occurredAt
    });
  }
}
