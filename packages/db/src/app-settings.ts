import { eq, sql } from "drizzle-orm";
import type { DatabaseClient } from "./index.js";
import * as schema from "./schema.js";

export type AppSettingsUpdate = {
  aiProvider?: string | null;
  aiModel?: string | null;
  aiBaseUrl?: string | null;
  aiKeyCiphertext?: string | null;
  aiKeyHint?: string | null;
};

/** Admin settings row for one user, created empty on first read. */
export async function findOrCreateAppSettings(
  database: DatabaseClient,
  userId: string
): Promise<schema.AppSettingsRow> {
  const [existing] = await database.db
    .select()
    .from(schema.appSettings)
    .where(eq(schema.appSettings.userId, userId))
    .limit(1);
  if (existing) return existing;

  const [created] = await database.db
    .insert(schema.appSettings)
    .values({ userId })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  const [row] = await database.db
    .select()
    .from(schema.appSettings)
    .where(eq(schema.appSettings.userId, userId))
    .limit(1);
  if (!row) throw new Error("Failed to create app settings");
  return row;
}

export async function updateAppSettings(
  database: DatabaseClient,
  userId: string,
  update: AppSettingsUpdate
): Promise<schema.AppSettingsRow> {
  await findOrCreateAppSettings(database, userId);
  const [row] = await database.db
    .update(schema.appSettings)
    .set({ ...update, updatedAt: new Date() })
    .where(eq(schema.appSettings.userId, userId))
    .returning();
  if (!row) throw new Error("Failed to update app settings");
  return row;
}

export type AdminStatsRow = {
  captures: number;
  actionsTotal: number;
  actionsCompleted: number;
  focusSessions: number;
  focusMinutes: number;
  incubatorItems: number;
  dailyCloses: number;
  lastActivityAt: string | null;
};

/**
 * System numbers for the admin panel. Everything is scoped to the acting user —
 * the panel never exposes another account's data.
 */
export async function loadAdminStats(database: DatabaseClient, userId: string): Promise<AdminStatsRow> {
  const { rows } = await database.pool.query<{
    captures: string;
    actions_total: string;
    actions_completed: string;
    focus_sessions: string;
    focus_minutes: string;
    incubator_items: string;
    daily_closes: string;
    last_activity_at: Date | null;
  }>(
    `select
       (select count(*) from captures where user_id = $1) as captures,
       (select count(*) from actions where user_id = $1) as actions_total,
       (select count(*) from actions where user_id = $1 and status = 'completed') as actions_completed,
       (select count(*) from focus_sessions where user_id = $1) as focus_sessions,
       (select coalesce(sum(extract(epoch from (coalesce(ended_at, now()) - started_at)) / 60), 0)::int
          from focus_sessions where user_id = $1) as focus_minutes,
       (select count(*) from incubator_items where user_id = $1) as incubator_items,
       (select count(*) from daily_closes where user_id = $1) as daily_closes,
       (select max(created_at) from captures where user_id = $1) as last_activity_at`,
    [userId]
  );
  const row = rows[0];
  return {
    captures: Number(row?.captures ?? 0),
    actionsTotal: Number(row?.actions_total ?? 0),
    actionsCompleted: Number(row?.actions_completed ?? 0),
    focusSessions: Number(row?.focus_sessions ?? 0),
    focusMinutes: Number(row?.focus_minutes ?? 0),
    incubatorItems: Number(row?.incubator_items ?? 0),
    dailyCloses: Number(row?.daily_closes ?? 0),
    lastActivityAt: row?.last_activity_at ? new Date(row.last_activity_at).toISOString() : null
  };
}

export const APP_SETTINGS_TABLE = sql`app_settings`;
