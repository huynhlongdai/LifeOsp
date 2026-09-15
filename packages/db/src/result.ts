import {
  actionStatusForResult,
  canRecordActionResult,
  emptyDailyCloseSummary,
  localDayRange,
  type ActionId,
  type ActionResult,
  type ActionResultId,
  type ActionResultView,
  type ActionStatus,
  type CloseDayInput,
  type DailyCloseFrictionCode,
  type DailyCloseId,
  type DailyCloseRecordView,
  type DailyCloseSummary,
  type DailyCloseView,
  type FocusSessionId,
  type OutcomeId,
  type RecommendationId,
  type RecordActionResultInput
} from "@lifeos/domain";
import { and, desc, eq, gte, inArray, isNotNull, lt, ne, sql } from "drizzle-orm";
import { toFocusView } from "./focus.js";
import type { DatabaseClient } from "./index.js";
import * as schema from "./schema.js";

const NEXT_ACTION_CONTRACT = "next-action-recommendation-v0" as const;

export type RecordActionResultOutcome =
  | { status: "recorded"; view: ActionResultView }
  | { status: "not_found" }
  | { status: "invalid_status"; currentStatus: string }
  /** An active FocusSession runs on this Action and the caller did not say what to do with it. */
  | { status: "active_focus_requires_choice"; focusSessionId: string }
  /** focusOutcome was given but there is no active FocusSession on this Action. */
  | { status: "focus_not_active" };

export async function recordActionResult(
  database: DatabaseClient,
  userId: string,
  actionId: string,
  input: RecordActionResultInput,
  recordedAt: Date
): Promise<RecordActionResultOutcome> {
  return database.db.transaction(async (transaction) => {
    const [action] = await transaction
      .select()
      .from(schema.actions)
      .where(and(eq(schema.actions.id, actionId), eq(schema.actions.userId, userId)))
      .limit(1)
      .for("update");
    if (!action) return { status: "not_found" };
    if (!canRecordActionResult(action.status as ActionStatus)) {
      return { status: "invalid_status", currentStatus: action.status };
    }

    const [activeFocus] = await transaction
      .select()
      .from(schema.focusSessions)
      .where(
        and(
          eq(schema.focusSessions.userId, userId),
          eq(schema.focusSessions.actionId, action.id),
          eq(schema.focusSessions.status, "active")
        )
      )
      .limit(1)
      .for("update");

    if (activeFocus && !input.focusOutcome) {
      return { status: "active_focus_requires_choice", focusSessionId: activeFocus.id };
    }
    if (!activeFocus && input.focusOutcome) return { status: "focus_not_active" };

    let endedFocus: schema.FocusSessionRow | null = null;
    if (activeFocus && input.focusOutcome) {
      const [updatedFocus] = await transaction
        .update(schema.focusSessions)
        .set({ status: input.focusOutcome, endedAt: recordedAt, updatedAt: recordedAt })
        .where(and(eq(schema.focusSessions.id, activeFocus.id), eq(schema.focusSessions.userId, userId)))
        .returning();
      if (!updatedFocus) throw new Error("Failed to end FocusSession with Action result");
      endedFocus = updatedFocus;

      await transaction.insert(schema.lifeEvents).values({
        userId,
        type: `focus.${input.focusOutcome}`,
        source: "user",
        entityType: "focus_session",
        entityId: updatedFocus.id,
        payload: {
          actionId: action.id,
          recommendationId: updatedFocus.recommendationId,
          outcome: input.focusOutcome,
          endedWithActionResult: input.result
        },
        occurredAt: recordedAt
      });
    }

    // Plan-vs-reality facts: every ended FocusSession on this Action so far.
    const focusRows = await transaction
      .select({ startedAt: schema.focusSessions.startedAt, endedAt: schema.focusSessions.endedAt })
      .from(schema.focusSessions)
      .where(
        and(
          eq(schema.focusSessions.userId, userId),
          eq(schema.focusSessions.actionId, action.id),
          ne(schema.focusSessions.status, "active"),
          isNotNull(schema.focusSessions.endedAt)
        )
      );
    const focusSessionCount = focusRows.length;
    const actualFocusMinutes = focusRows.reduce((total, row) => {
      if (!row.endedAt) return total;
      return total + Math.max(0, Math.round((row.endedAt.getTime() - row.startedAt.getTime()) / 60_000));
    }, 0);

    const [recommendation] = await transaction
      .select({ id: schema.recommendations.id })
      .from(schema.recommendations)
      .where(
        and(
          eq(schema.recommendations.userId, userId),
          eq(schema.recommendations.kind, "next_action"),
          sql`${schema.recommendations.proposedEntityPayload} ->> 'contract' = ${NEXT_ACTION_CONTRACT}`,
          sql`${schema.recommendations.proposedEntityPayload} ->> 'actionId' = ${action.id}`
        )
      )
      .orderBy(desc(schema.recommendations.createdAt))
      .limit(1);

    const nextStatus = actionStatusForResult(input.result);
    const [updatedAction] = await transaction
      .update(schema.actions)
      .set({
        status: nextStatus,
        updatedAt: recordedAt,
        ...(input.result === "completed" ? { completedAt: recordedAt } : {}),
        ...(input.result === "blocked" ? { blockedReason: input.blockedReason ?? null } : {})
      })
      .where(and(eq(schema.actions.id, action.id), eq(schema.actions.userId, userId)))
      .returning();
    if (!updatedAction) throw new Error("Failed to update Action status");

    const [resultRow] = await transaction
      .insert(schema.actionResults)
      .values({
        userId,
        actionId: action.id,
        focusSessionId: endedFocus?.id ?? null,
        recommendationId: recommendation?.id ?? null,
        result: input.result,
        note: input.note ?? null,
        blockedReason: input.result === "blocked" ? (input.blockedReason ?? null) : null,
        remainingText: input.result === "partial" ? (input.remainingText ?? null) : null,
        postponeUntil: input.result === "postponed" ? (input.postponeUntil ?? null) : null,
        plannedMinutes: action.estimatedMinutes,
        actualFocusMinutes,
        focusSessionCount,
        recordedAt
      })
      .returning();
    if (!resultRow) throw new Error("Failed to record Action result");

    await transaction.insert(schema.lifeEvents).values({
      userId,
      type: "action.result.recorded",
      source: "user",
      entityType: "action_result",
      entityId: resultRow.id,
      payload: {
        actionId: action.id,
        outcomeId: action.outcomeId,
        result: input.result,
        previousStatus: action.status,
        recommendationId: recommendation?.id ?? null,
        focusSessionId: endedFocus?.id ?? null,
        plannedMinutes: action.estimatedMinutes,
        actualFocusMinutes,
        focusSessionCount
      },
      occurredAt: recordedAt
    });

    return {
      status: "recorded",
      view: toActionResultView(resultRow, updatedAction, endedFocus)
    };
  });
}

export function toActionResultView(
  row: schema.ActionResultRow,
  action: schema.ActionRow,
  focus: schema.FocusSessionRow | null
): ActionResultView {
  return {
    id: row.id as ActionResultId,
    actionId: row.actionId as ActionId,
    result: row.result as ActionResult,
    ...(row.note === null ? {} : { note: row.note }),
    ...(row.blockedReason === null ? {} : { blockedReason: row.blockedReason }),
    ...(row.remainingText === null ? {} : { remainingText: row.remainingText }),
    ...(row.postponeUntil === null ? {} : { postponeUntil: row.postponeUntil }),
    ...(row.recommendationId === null ? {} : { recommendationId: row.recommendationId as RecommendationId }),
    ...(row.focusSessionId === null ? {} : { focusSessionId: row.focusSessionId as FocusSessionId }),
    ...(row.plannedMinutes === null ? {} : { plannedMinutes: row.plannedMinutes }),
    actualFocusMinutes: row.actualFocusMinutes,
    focusSessionCount: row.focusSessionCount,
    recordedAt: row.recordedAt.toISOString(),
    action: {
      id: action.id as ActionId,
      title: action.title,
      status: action.status as ActionStatus,
      ...(action.outcomeId === null ? {} : { outcomeId: action.outcomeId as OutcomeId })
    },
    ...(focus === null ? {} : { focus: toFocusView(focus, action) })
  };
}

export type ReadDailyCloseOutcome = { status: "ok"; view: DailyCloseView } | { status: "invalid_range" };

export async function readDailyClose(
  database: DatabaseClient,
  userId: string,
  date: string,
  offsetMinutes: number,
  generatedAt: Date
): Promise<ReadDailyCloseOutcome> {
  const range = localDayRange(date, offsetMinutes);
  if (!range) return { status: "invalid_range" };

  const summary = await summarizeLocalDay(database, userId, range.from, range.to);
  const [close] = await database.db
    .select()
    .from(schema.dailyCloses)
    .where(and(eq(schema.dailyCloses.userId, userId), eq(schema.dailyCloses.date, date)))
    .limit(1);

  return {
    status: "ok",
    view: {
      date,
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      generatedAt: generatedAt.toISOString(),
      summary,
      close: close ? toDailyCloseRecordView(close) : null
    }
  };
}

export type CloseDayOutcome = { status: "closed"; created: boolean; view: DailyCloseView } | { status: "invalid_range" };

export async function closeDay(
  database: DatabaseClient,
  userId: string,
  input: CloseDayInput,
  closedAt: Date
): Promise<CloseDayOutcome> {
  const range = localDayRange(input.date, input.offsetMinutes);
  if (!range) return { status: "invalid_range" };

  const created = await database.db.transaction(async (transaction) => {
    const [existing] = await transaction
      .select({ id: schema.dailyCloses.id })
      .from(schema.dailyCloses)
      .where(and(eq(schema.dailyCloses.userId, userId), eq(schema.dailyCloses.date, input.date)))
      .limit(1)
      .for("update");

    const values = {
      offsetMinutes: input.offsetMinutes,
      meaningfulProgressText: input.meaningfulProgressText ?? null,
      frictionCode: input.frictionCode ?? null,
      frictionNote: input.frictionNote ?? null,
      note: input.note ?? null,
      updatedAt: closedAt
    };

    let row: schema.DailyCloseRow | undefined;
    if (existing) {
      [row] = await transaction
        .update(schema.dailyCloses)
        .set(values)
        .where(and(eq(schema.dailyCloses.id, existing.id), eq(schema.dailyCloses.userId, userId)))
        .returning();
    } else {
      [row] = await transaction
        .insert(schema.dailyCloses)
        .values({ userId, date: input.date, closedAt, ...values })
        .returning();
    }
    if (!row) throw new Error("Failed to record Daily Close");

    await transaction.insert(schema.lifeEvents).values({
      userId,
      type: existing ? "daily_close.updated" : "daily_close.recorded",
      source: "user",
      entityType: "daily_close",
      entityId: row.id,
      payload: {
        date: input.date,
        offsetMinutes: input.offsetMinutes,
        hasMeaningfulProgressText: row.meaningfulProgressText !== null,
        frictionCode: row.frictionCode,
        hasNote: row.note !== null
      },
      occurredAt: closedAt
    });

    return !existing;
  });

  const read = await readDailyClose(database, userId, input.date, input.offsetMinutes, closedAt);
  if (read.status !== "ok") throw new Error("Daily Close range became invalid after write");
  return { status: "closed", created, view: read.view };
}

async function summarizeLocalDay(database: DatabaseClient, userId: string, from: Date, to: Date): Promise<DailyCloseSummary> {
  const summary = emptyDailyCloseSummary();

  const resultRows = await database.db
    .select({ result: schema.actionResults, action: schema.actions })
    .from(schema.actionResults)
    .innerJoin(schema.actions, and(eq(schema.actionResults.actionId, schema.actions.id), eq(schema.actions.userId, userId)))
    .where(
      and(
        eq(schema.actionResults.userId, userId),
        gte(schema.actionResults.recordedAt, from),
        lt(schema.actionResults.recordedAt, to)
      )
    )
    .orderBy(schema.actionResults.recordedAt);

  const movedOutcomes = new Set<string>();
  for (const row of resultRows) {
    const result = row.result.result as ActionResult;
    summary.results[result] += 1;
    summary.resultItems.push({
      actionId: row.action.id as ActionId,
      title: row.action.title,
      result,
      recordedAt: row.result.recordedAt.toISOString()
    });
    if ((result === "completed" || result === "partial") && row.action.outcomeId) movedOutcomes.add(row.action.outcomeId);
  }
  summary.outcomesMoved = movedOutcomes.size;

  const focusRows = await database.db
    .select({ startedAt: schema.focusSessions.startedAt, endedAt: schema.focusSessions.endedAt })
    .from(schema.focusSessions)
    .where(
      and(
        eq(schema.focusSessions.userId, userId),
        ne(schema.focusSessions.status, "active"),
        isNotNull(schema.focusSessions.endedAt),
        gte(schema.focusSessions.endedAt, from),
        lt(schema.focusSessions.endedAt, to)
      )
    );
  summary.focusSessions.count = focusRows.length;
  summary.focusSessions.totalMinutes = focusRows.reduce((total, row) => {
    if (!row.endedAt) return total;
    return total + Math.max(0, Math.round((row.endedAt.getTime() - row.startedAt.getTime()) / 60_000));
  }, 0);

  const [distractions] = await database.db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.captures)
    .where(
      and(
        eq(schema.captures.userId, userId),
        eq(schema.captures.kind, "distraction"),
        gte(schema.captures.createdAt, from),
        lt(schema.captures.createdAt, to)
      )
    );
  summary.distractionsCaptured = distractions?.count ?? 0;

  const [decisions] = await database.db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.recommendations)
    .where(
      and(
        eq(schema.recommendations.userId, userId),
        eq(schema.recommendations.kind, "next_action"),
        inArray(schema.recommendations.status, ["not_now", "wrong_assumption"]),
        isNotNull(schema.recommendations.resolvedAt),
        gte(schema.recommendations.resolvedAt, from),
        lt(schema.recommendations.resolvedAt, to)
      )
    );
  summary.intentionalDecisions = decisions?.count ?? 0;

  return summary;
}

function toDailyCloseRecordView(row: schema.DailyCloseRow): DailyCloseRecordView {
  return {
    id: row.id as DailyCloseId,
    date: row.date,
    ...(row.meaningfulProgressText === null ? {} : { meaningfulProgressText: row.meaningfulProgressText }),
    ...(row.frictionCode === null ? {} : { frictionCode: row.frictionCode as DailyCloseFrictionCode }),
    ...(row.frictionNote === null ? {} : { frictionNote: row.frictionNote }),
    ...(row.note === null ? {} : { note: row.note }),
    closedAt: row.closedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
