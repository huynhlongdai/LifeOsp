import { and, eq, gte, inArray, lt, max } from "drizzle-orm";
import {
  ACTION_RESULTS,
  WEEKLY_RESET_UNAVAILABLE_SECTIONS,
  localWeekRange,
  type ActionId,
  type CompleteWeeklyResetInput,
  type OutcomeId,
  type WeeklyResetMovementItem,
  type WeeklyResetView
} from "@lifeos/domain";
import type { DatabaseClient } from "./index.js";
import { findCurrentDirection } from "./promotion.js";
import * as schema from "./schema.js";

export type ReadWeeklyResetOutcome = { status: "ok"; view: WeeklyResetView } | { status: "invalid_range" };

export async function readWeeklyReset(
  database: DatabaseClient,
  userId: string,
  weekStart: string,
  offsetMinutes: number,
  generatedAt: Date
): Promise<ReadWeeklyResetOutcome> {
  const range = localWeekRange(weekStart, offsetMinutes);
  if (!range) return { status: "invalid_range" };
  const weekEnd = new Date(range.to.getTime() - 24 * 60 * 60_000).toISOString().slice(0, 10);

  const [resultsInWeek, blockedRows, currentDirection, lastCompletedRow] = await Promise.all([
    database.db
      .select({
        actionId: schema.actionResults.actionId,
        result: schema.actionResults.result,
        actualFocusMinutes: schema.actionResults.actualFocusMinutes,
        focusSessionCount: schema.actionResults.focusSessionCount,
        title: schema.actions.title,
        outcomeId: schema.actions.outcomeId
      })
      .from(schema.actionResults)
      .innerJoin(schema.actions, eq(schema.actions.id, schema.actionResults.actionId))
      .where(
        and(
          eq(schema.actionResults.userId, userId),
          gte(schema.actionResults.recordedAt, range.from),
          lt(schema.actionResults.recordedAt, range.to)
        )
      ),
    database.db
      .select({ id: schema.actions.id, title: schema.actions.title, outcomeId: schema.actions.outcomeId })
      .from(schema.actions)
      .where(and(eq(schema.actions.userId, userId), eq(schema.actions.status, "blocked"))),
    findCurrentDirection(database, userId),
    database.db
      .select({ last: max(schema.lifeEvents.occurredAt) })
      .from(schema.lifeEvents)
      .where(and(eq(schema.lifeEvents.userId, userId), eq(schema.lifeEvents.type, "weekly_reset.completed")))
  ]);

  const dailyCloseRows = await database.db
    .select({ date: schema.dailyCloses.date })
    .from(schema.dailyCloses)
    .where(and(eq(schema.dailyCloses.userId, userId), inArray(schema.dailyCloses.date, weekDates(weekStart))));

  const resultCounts = Object.fromEntries(ACTION_RESULTS.map((result) => [result, 0])) as Record<
    (typeof ACTION_RESULTS)[number],
    number
  >;
  let focusMinutes = 0;
  let focusSessionCount = 0;
  const advanced: WeeklyResetMovementItem[] = [];
  const intentionallyDropped: WeeklyResetMovementItem[] = [];

  for (const row of resultsInWeek) {
    const result = row.result as (typeof ACTION_RESULTS)[number];
    resultCounts[result] += 1;
    focusMinutes += row.actualFocusMinutes;
    focusSessionCount += row.focusSessionCount;
    if (!row.outcomeId) continue;
    const item: WeeklyResetMovementItem = { id: row.actionId as ActionId, title: row.title, outcomeId: row.outcomeId as OutcomeId };
    if (result === "completed") advanced.push(item);
    if (result === "dropped") intentionallyDropped.push(item);
  }

  const blocked: WeeklyResetMovementItem[] = blockedRows
    .filter((row): row is typeof row & { outcomeId: string } => row.outcomeId !== null)
    .map((row) => ({ id: row.id as ActionId, title: row.title, outcomeId: row.outcomeId as OutcomeId }));

  const lastCompletedAt = lastCompletedRow[0]?.last ?? null;

  return {
    status: "ok",
    view: {
      generatedAt: generatedAt.toISOString(),
      weekStart,
      weekEnd,
      reality: {
        focusMinutes,
        focusSessionCount,
        resultCounts,
        dailyClosesCompleted: dailyCloseRows.length
      },
      movement: { advanced, blocked, intentionallyDropped },
      nextWeek: currentDirection
        ? { hasDirection: true, directionTitle: currentDirection.direction.title, seasonTitle: currentDirection.season.title }
        : { hasDirection: false },
      unavailableSections: [...WEEKLY_RESET_UNAVAILABLE_SECTIONS],
      ...(lastCompletedAt ? { lastCompletedAt: lastCompletedAt.toISOString() } : {})
    }
  };
}

export type CompleteWeeklyResetOutcome = { status: "completed"; completedAt: string } | { status: "invalid_range" };

export async function completeWeeklyReset(
  database: DatabaseClient,
  userId: string,
  input: CompleteWeeklyResetInput,
  completedAt: Date
): Promise<CompleteWeeklyResetOutcome> {
  const range = localWeekRange(input.weekStart, input.offsetMinutes);
  if (!range) return { status: "invalid_range" };

  await database.db.insert(schema.lifeEvents).values({
    userId,
    type: "weekly_reset.completed",
    source: "user",
    entityType: null,
    entityId: null,
    payload: { weekStart: input.weekStart },
    occurredAt: completedAt
  });

  return { status: "completed", completedAt: completedAt.toISOString() };
}

function weekDates(weekStart: string): string[] {
  const [year, month, day] = weekStart.split("-").map(Number) as [number, number, number];
  const dates: string[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(Date.UTC(year, month - 1, day + offset));
    dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
}
