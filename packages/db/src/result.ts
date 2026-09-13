import { and, desc, eq, gte, lte } from "drizzle-orm";
import type { DatabaseClient } from "./index.js";
import * as schema from "./schema.js";

export type ActionResultInput = {
  actionId: string;
  resultType: "completed" | "partial" | "postponed" | "blocked" | "dropped";
  note?: string;
};

export type FocusResultInput = {
  focusSessionId: string;
  resultType: "completed" | "interrupted" | "abandoned";
  actualMinutes?: number;
  note?: string;
};

export type DailyCloseInput = {
  date: string;
  note?: string;
};

export type ActionResultView = {
  id: string;
  actionId: string;
  resultType: "completed" | "partial" | "postponed" | "blocked" | "dropped";
  note?: string;
  createdAt: string;
};

export type FocusResultView = {
  id: string;
  focusSessionId: string;
  resultType: "completed" | "interrupted" | "abandoned";
  actualMinutes?: number;
  note?: string;
  createdAt: string;
};

export type DailyCloseView = {
  id: string;
  date: string;
  note?: string;
  createdAt: string;
  actionsCompleted: number;
  actionsPartial: number;
  actionsPostponed: number;
  actionsBlocked: number;
  actionsDropped: number;
  focusSessionsCompleted: number;
  focusSessionsInterrupted: number;
  focusSessionsAbandoned: number;
  totalFocusMinutes: number;
};

function nu<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value ?? undefined;
}

export async function recordActionResult(
  database: DatabaseClient,
  userId: string,
  input: ActionResultInput
): Promise<ActionResultView> {
  return database.db.transaction(async (tx) => {
    const [action] = await tx
      .select()
      .from(schema.actions)
      .where(and(eq(schema.actions.id, input.actionId), eq(schema.actions.userId, userId)))
      .limit(1)
      .for("update");

    if (!action) {
      throw new Error("Action not found or access denied");
    }
    if (action.status !== "ready" && action.status !== "active") {
      throw new Error(`Action result cannot be recorded from status ${action.status}`);
    }

    const [result] = await tx
      .insert(schema.actionResults)
      .values({
        actionId: input.actionId,
        userId,
        resultType: input.resultType,
        note: input.note ?? null
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create action result");
    }

    let newStatus: schema.ActionRow["status"];
    switch (input.resultType) {
      case "completed":
        newStatus = "completed";
        break;
      case "dropped":
        newStatus = "dropped";
        break;
      case "postponed":
        newStatus = "postponed";
        break;
      case "blocked":
        newStatus = "blocked";
        break;
      case "partial":
        newStatus = "partial";
        break;
      default:
        newStatus = action.status;
    }

    const now = new Date();
    await tx
      .update(schema.actions)
      .set({
        status: newStatus,
        updatedAt: now,
        completedAt: input.resultType === "completed" ? now : null,
        ...(input.resultType === "blocked" ? { blockedReason: input.note ?? "Blocked" } : { blockedReason: null }),
        ...(input.resultType === "postponed" ? { scheduledFor: null } : {})
      })
      .where(and(eq(schema.actions.id, input.actionId), eq(schema.actions.userId, userId)));

    await tx.insert(schema.lifeEvents).values({
      userId,
      type: "action.result.recorded",
      occurredAt: new Date(),
      source: "user",
      entityType: "action",
      entityId: input.actionId,
      payload: {
        resultId: result.id,
        resultType: input.resultType,
        note: input.note ?? null
      }
    });

    const noteValue = nu(result.note);
    return {
      id: result.id,
      actionId: result.actionId,
      resultType: result.resultType as ActionResultView["resultType"],
      ...(noteValue !== undefined ? { note: noteValue } : {}),
      createdAt: result.createdAt.toISOString()
    };
  });
}

export async function recordFocusResult(
  database: DatabaseClient,
  userId: string,
  input: FocusResultInput
): Promise<FocusResultView> {
  return database.db.transaction(async (tx) => {
    const [focus] = await tx
      .select()
      .from(schema.focusSessions)
      .where(and(eq(schema.focusSessions.id, input.focusSessionId), eq(schema.focusSessions.userId, userId)))
      .limit(1)
      .for("update");

    if (!focus) {
      throw new Error("Focus session not found or access denied");
    }

    if (focus.status !== "completed" && focus.status !== "interrupted" && focus.status !== "abandoned") {
      throw new Error("Focus session must be ended before recording result");
    }
    if (focus.status !== input.resultType) {
      throw new Error(`Focus result must match ended session status ${focus.status}`);
    }

    const [existingResult] = await tx
      .select({ id: schema.focusResults.id })
      .from(schema.focusResults)
      .where(eq(schema.focusResults.focusSessionId, input.focusSessionId))
      .limit(1);
    if (existingResult) {
      throw new Error("Focus result has already been recorded");
    }

    const [result] = await tx
      .insert(schema.focusResults)
      .values({
        focusSessionId: input.focusSessionId,
        userId,
        resultType: input.resultType,
        actualMinutes: input.actualMinutes ?? null,
        note: input.note ?? null
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create focus result");
    }

    await tx.insert(schema.lifeEvents).values({
      userId,
      type: "focus.result.recorded",
      occurredAt: new Date(),
      source: "user",
      entityType: "focus_session",
      entityId: input.focusSessionId,
      payload: {
        resultId: result.id,
        resultType: input.resultType,
        actualMinutes: input.actualMinutes ?? null,
        note: input.note ?? null
      }
    });

    const actualMinutesValue = nu(result.actualMinutes);
    const noteValue = nu(result.note);
    return {
      id: result.id,
      focusSessionId: result.focusSessionId,
      resultType: result.resultType as FocusResultView["resultType"],
      ...(actualMinutesValue !== undefined ? { actualMinutes: actualMinutesValue } : {}),
      ...(noteValue !== undefined ? { note: noteValue } : {}),
      createdAt: result.createdAt.toISOString()
    };
  });
}

export async function recordDailyClose(
  database: DatabaseClient,
  userId: string,
  input: DailyCloseInput
): Promise<DailyCloseView> {
  return database.db.transaction(async (tx) => {
    const dateObj = new Date(input.date);
    const startOfDay = new Date(dateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 59, 999);

    const actionResultsList = await tx
      .select({
        resultType: schema.actionResults.resultType
      })
      .from(schema.actionResults)
      .where(
        and(
          eq(schema.actionResults.userId, userId),
          gte(schema.actionResults.createdAt, startOfDay),
          lte(schema.actionResults.createdAt, endOfDay)
        )
      );

    const focusResultsList = await tx
      .select({
        resultType: schema.focusResults.resultType,
        actualMinutes: schema.focusResults.actualMinutes
      })
      .from(schema.focusResults)
      .where(
        and(
          eq(schema.focusResults.userId, userId),
          gte(schema.focusResults.createdAt, startOfDay),
          lte(schema.focusResults.createdAt, endOfDay)
        )
      );

    const actionCounts = {
      completed: 0,
      partial: 0,
      postponed: 0,
      blocked: 0,
      dropped: 0,
      total: actionResultsList.length
    };

    for (const r of actionResultsList) {
      if (r.resultType === "completed") actionCounts.completed++;
      else if (r.resultType === "partial") actionCounts.partial++;
      else if (r.resultType === "postponed") actionCounts.postponed++;
      else if (r.resultType === "blocked") actionCounts.blocked++;
      else if (r.resultType === "dropped") actionCounts.dropped++;
    }

    const focusCounts = {
      completed: 0,
      interrupted: 0,
      abandoned: 0,
      total: focusResultsList.length,
      totalMinutes: 0
    };

    for (const r of focusResultsList) {
      if (r.resultType === "completed") focusCounts.completed++;
      else if (r.resultType === "interrupted") focusCounts.interrupted++;
      else if (r.resultType === "abandoned") focusCounts.abandoned++;
      if (r.actualMinutes) focusCounts.totalMinutes += r.actualMinutes;
    }

    const [dailyClose] = await tx
      .insert(schema.dailyCloses)
      .values({
        userId,
        date: input.date,
        note: input.note ?? null
      })
      .returning();

    if (!dailyClose) {
      throw new Error("Failed to create daily close");
    }

    await tx.insert(schema.lifeEvents).values({
      userId,
      type: "daily.close.recorded",
      occurredAt: new Date(),
      source: "user",
      entityType: "daily_close",
      entityId: dailyClose.id,
      payload: {
        date: input.date,
        note: input.note ?? null,
        actionCounts,
        focusCounts
      }
    });

    const noteValue = nu(dailyClose.note);
    return {
      id: dailyClose.id,
      date: dailyClose.date,
      ...(noteValue !== undefined ? { note: noteValue } : {}),
      createdAt: dailyClose.createdAt.toISOString(),
      actionsCompleted: actionCounts.completed,
      actionsPartial: actionCounts.partial,
      actionsPostponed: actionCounts.postponed,
      actionsBlocked: actionCounts.blocked,
      actionsDropped: actionCounts.dropped,
      focusSessionsCompleted: focusCounts.completed,
      focusSessionsInterrupted: focusCounts.interrupted,
      focusSessionsAbandoned: focusCounts.abandoned,
      totalFocusMinutes: focusCounts.totalMinutes
    };
  });
}

export async function getDailyClose(
  database: DatabaseClient,
  userId: string,
  date: string
): Promise<DailyCloseView | null> {
  const [dailyClose] = await database.db
    .select()
    .from(schema.dailyCloses)
    .where(and(eq(schema.dailyCloses.userId, userId), eq(schema.dailyCloses.date, date)))
    .limit(1);

  if (!dailyClose) {
    return null;
  }

  const dateObj = new Date(date);
  const startOfDay = new Date(dateObj);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dateObj);
  endOfDay.setHours(23, 59, 59, 999);

  const actionResultsList = await database.db
    .select({
      resultType: schema.actionResults.resultType
    })
    .from(schema.actionResults)
    .where(
      and(
        eq(schema.actionResults.userId, userId),
        gte(schema.actionResults.createdAt, startOfDay),
        lte(schema.actionResults.createdAt, endOfDay)
      )
    );

  const focusResultsList = await database.db
    .select({
      resultType: schema.focusResults.resultType,
      actualMinutes: schema.focusResults.actualMinutes
    })
    .from(schema.focusResults)
    .where(
      and(
        eq(schema.focusResults.userId, userId),
        gte(schema.focusResults.createdAt, startOfDay),
        lte(schema.focusResults.createdAt, endOfDay)
      )
    );

  const actionCounts = {
    completed: 0,
    partial: 0,
    postponed: 0,
    blocked: 0,
    dropped: 0,
    total: actionResultsList.length
  };

  for (const r of actionResultsList) {
    if (r.resultType === "completed") actionCounts.completed++;
    else if (r.resultType === "partial") actionCounts.partial++;
    else if (r.resultType === "postponed") actionCounts.postponed++;
    else if (r.resultType === "blocked") actionCounts.blocked++;
    else if (r.resultType === "dropped") actionCounts.dropped++;
  }

  const focusCounts = {
    completed: 0,
    interrupted: 0,
    abandoned: 0,
    total: focusResultsList.length,
    totalMinutes: 0
  };

  for (const r of focusResultsList) {
    if (r.resultType === "completed") focusCounts.completed++;
    else if (r.resultType === "interrupted") focusCounts.interrupted++;
    else if (r.resultType === "abandoned") focusCounts.abandoned++;
    if (r.actualMinutes) focusCounts.totalMinutes += r.actualMinutes;
  }

  const noteValue = nu(dailyClose.note);
  return {
    id: dailyClose.id,
    date: dailyClose.date,
    ...(noteValue !== undefined ? { note: noteValue } : {}),
    createdAt: dailyClose.createdAt.toISOString(),
    actionsCompleted: actionCounts.completed,
    actionsPartial: actionCounts.partial,
    actionsPostponed: actionCounts.postponed,
    actionsBlocked: actionCounts.blocked,
    actionsDropped: actionCounts.dropped,
    focusSessionsCompleted: focusCounts.completed,
    focusSessionsInterrupted: focusCounts.interrupted,
    focusSessionsAbandoned: focusCounts.abandoned,
    totalFocusMinutes: focusCounts.totalMinutes
  };
}

export async function getActionResults(
  database: DatabaseClient,
  userId: string,
  actionId: string
): Promise<ActionResultView[]> {
  const results = await database.db
    .select({
      result: schema.actionResults,
      action: schema.actions
    })
    .from(schema.actionResults)
    .innerJoin(schema.actions, eq(schema.actionResults.actionId, schema.actions.id))
    .where(and(eq(schema.actionResults.actionId, actionId), eq(schema.actionResults.userId, userId)))
    .orderBy(desc(schema.actionResults.createdAt));

  return results.map(({ result, action }) => {
    const noteValue = nu(result.note);
    return {
      id: result.id,
      actionId: result.actionId,
      resultType: result.resultType as ActionResultView["resultType"],
      ...(noteValue !== undefined ? { note: noteValue } : {}),
      createdAt: result.createdAt.toISOString()
    };
  });
}

export async function getFocusResults(
  database: DatabaseClient,
  userId: string,
  focusSessionId: string
): Promise<FocusResultView[]> {
  const results = await database.db
    .select({
      result: schema.focusResults,
      focusSession: schema.focusSessions
    })
    .from(schema.focusResults)
    .innerJoin(schema.focusSessions, eq(schema.focusResults.focusSessionId, schema.focusSessions.id))
    .where(and(eq(schema.focusResults.focusSessionId, focusSessionId), eq(schema.focusResults.userId, userId)))
    .orderBy(desc(schema.focusResults.createdAt));

  return results.map(({ result, focusSession }) => {
    const actualMinutesValue = nu(result.actualMinutes);
    const noteValue = nu(result.note);
    return {
      id: result.id,
      focusSessionId: result.focusSessionId,
      resultType: result.resultType as FocusResultView["resultType"],
      ...(actualMinutesValue !== undefined ? { actualMinutes: actualMinutesValue } : {}),
      ...(noteValue !== undefined ? { note: noteValue } : {}),
      createdAt: result.createdAt.toISOString()
    };
  });
}
