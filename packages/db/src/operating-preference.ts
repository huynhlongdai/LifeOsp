import { and, eq } from "drizzle-orm";
import {
  isValidOperatingPreferenceValue,
  type InsightId,
  type OperatingPreferenceId,
  type OperatingPreferenceView,
  type UpdateOperatingPreferenceInput
} from "@lifeos/domain";
import type { DatabaseClient } from "./index.js";
import * as schema from "./schema.js";

function toOperatingPreferenceView(row: schema.OperatingPreferenceRow): OperatingPreferenceView {
  return {
    id: row.id as OperatingPreferenceId,
    key: row.key as OperatingPreferenceView["key"],
    value: row.value as number,
    source: row.source as OperatingPreferenceView["source"],
    status: row.status as OperatingPreferenceView["status"],
    ...(row.sourceInsightId ? { sourceInsightId: row.sourceInsightId as InsightId } : {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function listOperatingPreferences(database: DatabaseClient, userId: string): Promise<OperatingPreferenceView[]> {
  const rows = await database.db
    .select()
    .from(schema.operatingPreferences)
    .where(eq(schema.operatingPreferences.userId, userId))
    .orderBy(schema.operatingPreferences.createdAt);
  return rows.map(toOperatingPreferenceView);
}

export type UpdateOperatingPreferenceOutcome =
  | { status: "updated"; preference: OperatingPreferenceView }
  | { status: "not_found" }
  | { status: "invalid_value" };

export async function updateOperatingPreference(
  database: DatabaseClient,
  userId: string,
  preferenceId: string,
  input: UpdateOperatingPreferenceInput,
  updatedAt: Date
): Promise<UpdateOperatingPreferenceOutcome> {
  return database.db.transaction(async (transaction) => {
    const [existing] = await transaction
      .select()
      .from(schema.operatingPreferences)
      .where(and(eq(schema.operatingPreferences.userId, userId), eq(schema.operatingPreferences.id, preferenceId)))
      .limit(1)
      .for("update");
    if (!existing) return { status: "not_found" };

    if (input.value !== undefined && !isValidOperatingPreferenceValue(existing.key as OperatingPreferenceView["key"], input.value)) {
      return { status: "invalid_value" };
    }

    const [updated] = await transaction
      .update(schema.operatingPreferences)
      .set({
        updatedAt,
        ...(input.value === undefined ? {} : { value: input.value }),
        ...(input.status === undefined ? {} : { status: input.status })
      })
      .where(eq(schema.operatingPreferences.id, existing.id))
      .returning();
    if (!updated) throw new Error("Failed to update Operating Preference");

    await transaction.insert(schema.lifeEvents).values({
      userId,
      type: "operating_preference.updated",
      source: "user",
      entityType: "operating_preference",
      entityId: existing.id,
      payload: { key: existing.key, previousValue: existing.value, previousStatus: existing.status },
      occurredAt: updatedAt
    });

    return { status: "updated", preference: toOperatingPreferenceView(updated) };
  });
}

export type DeleteOperatingPreferenceOutcome = { status: "deleted" } | { status: "not_found" };

export async function deleteOperatingPreference(
  database: DatabaseClient,
  userId: string,
  preferenceId: string,
  deletedAt: Date
): Promise<DeleteOperatingPreferenceOutcome> {
  return database.db.transaction(async (transaction) => {
    const [existing] = await transaction
      .select()
      .from(schema.operatingPreferences)
      .where(and(eq(schema.operatingPreferences.userId, userId), eq(schema.operatingPreferences.id, preferenceId)))
      .limit(1)
      .for("update");
    if (!existing) return { status: "not_found" };

    await transaction.delete(schema.operatingPreferences).where(eq(schema.operatingPreferences.id, existing.id));

    await transaction.insert(schema.lifeEvents).values({
      userId,
      type: "operating_preference.deleted",
      source: "user",
      entityType: "operating_preference",
      entityId: existing.id,
      payload: { key: existing.key, value: existing.value },
      occurredAt: deletedAt
    });

    return { status: "deleted" };
  });
}
