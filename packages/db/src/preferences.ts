import { eq } from "drizzle-orm";
import type { DatabaseClient } from "./index.js";
import * as schema from "./schema.js";

export type PreferencesUpdate = {
  timezone?: string;
  workStartMinute?: number;
  workEndMinute?: number;
  workDays?: number[];
  focusMinutes?: number;
  breakMinutes?: number;
  aiSuggestsActions?: boolean;
  aiDailySummary?: boolean;
};

/** Reads the user's preferences row, creating the default row on first read. */
export async function findOrCreatePreferences(
  database: DatabaseClient,
  userId: string
): Promise<schema.UserPreferencesRow> {
  const [existing] = await database.db
    .select()
    .from(schema.userPreferences)
    .where(eq(schema.userPreferences.userId, userId))
    .limit(1);
  if (existing) return existing;

  const [created] = await database.db
    .insert(schema.userPreferences)
    .values({ userId })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  const [row] = await database.db
    .select()
    .from(schema.userPreferences)
    .where(eq(schema.userPreferences.userId, userId))
    .limit(1);
  if (!row) throw new Error("Failed to create user preferences");
  return row;
}

/**
 * Applies a partial update. The work window is validated against the merged row so a
 * one-sided change can never produce an impossible window.
 */
export async function updatePreferences(
  database: DatabaseClient,
  userId: string,
  update: PreferencesUpdate
): Promise<schema.UserPreferencesRow | { status: "invalid_window" }> {
  const current = await findOrCreatePreferences(database, userId);
  const start = update.workStartMinute ?? current.workStartMinute;
  const end = update.workEndMinute ?? current.workEndMinute;
  if (start >= end) return { status: "invalid_window" };

  const [row] = await database.db
    .update(schema.userPreferences)
    .set({
      ...(update.timezone === undefined ? {} : { timezone: update.timezone }),
      workStartMinute: start,
      workEndMinute: end,
      ...(update.workDays === undefined ? {} : { workDays: update.workDays.join(",") }),
      ...(update.focusMinutes === undefined ? {} : { focusMinutes: update.focusMinutes }),
      ...(update.breakMinutes === undefined ? {} : { breakMinutes: update.breakMinutes }),
      ...(update.aiSuggestsActions === undefined ? {} : { aiSuggestsActions: update.aiSuggestsActions }),
      ...(update.aiDailySummary === undefined ? {} : { aiDailySummary: update.aiDailySummary }),
      updatedAt: new Date()
    })
    .where(eq(schema.userPreferences.userId, userId))
    .returning();
  if (!row) throw new Error("Failed to update user preferences");
  return row;
}

export function parseWorkDays(value: string): number[] {
  return value
    .split(",")
    .map((day) => Number.parseInt(day.trim(), 10))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
}
