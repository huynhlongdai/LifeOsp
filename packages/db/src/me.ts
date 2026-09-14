import { countClosingStreak } from "@lifeos/domain";
import type { DatabaseClient } from "./index.js";

export type MeSnapshot = {
  memberSince: Date;
  season?: {
    id: string;
    title: string;
    purpose: string;
    startsOn: string | null;
    targetEndsOn: string | null;
  };
  directionTitle?: string;
  stats: {
    focusSessionsTotal: number;
    focusMinutesLast7Days: number;
    actionsCompletedLast7Days: number;
    actionsOpen: number;
    capturesTotal: number;
    dailyCloseStreak: number;
    lastDailyCloseOn: string | null;
  };
};

/**
 * Reads the ME snapshot straight from recorded rows. Returns null when the user row is
 * gone; every counter is a plain aggregate so the screen can never show an invented number.
 */
export async function findMeSnapshot(database: DatabaseClient, userId: string): Promise<MeSnapshot | null> {
  const user = await database.pool.query<{ created_at: Date }>("select created_at from users where id = $1", [userId]);
  const memberSince = user.rows[0]?.created_at;
  if (!memberSince) return null;

  const season = await database.pool.query<{
    id: string;
    title: string;
    purpose: string;
    starts_on: string | null;
    target_ends_on: string | null;
    direction_title: string | null;
  }>(
    `select s.id, s.title, s.purpose, s.starts_on, s.target_ends_on, d.title as direction_title
       from seasons s
       left join directions d on d.id = s.direction_id
      where s.user_id = $1 and s.status = 'active'
      limit 1`,
    [userId]
  );

  const stats = await database.pool.query<{
    focus_total: string;
    focus_minutes: string;
    completed_7d: string;
    actions_open: string;
    captures_total: string;
  }>(
    `select
       (select count(*) from focus_sessions where user_id = $1) as focus_total,
       (select coalesce(sum(extract(epoch from (coalesce(ended_at, now()) - started_at)) / 60), 0)::bigint
          from focus_sessions
         where user_id = $1 and started_at >= now() - interval '7 days') as focus_minutes,
       (select count(*) from actions
         where user_id = $1 and status = 'completed' and completed_at >= now() - interval '7 days') as completed_7d,
       (select count(*) from actions
         where user_id = $1 and status in ('candidate', 'ready', 'active', 'partial', 'postponed', 'blocked')) as actions_open,
       (select count(*) from captures where user_id = $1) as captures_total`,
    [userId]
  );

  const closes = await database.pool.query<{ local_date: string }>(
    "select local_date::text as local_date from daily_closes where user_id = $1 order by local_date desc limit 400",
    [userId]
  );

  const row = stats.rows[0];
  const seasonRow = season.rows[0];

  return {
    memberSince,
    ...(seasonRow
      ? {
          season: {
            id: seasonRow.id,
            title: seasonRow.title,
            purpose: seasonRow.purpose,
            startsOn: seasonRow.starts_on,
            targetEndsOn: seasonRow.target_ends_on
          },
          ...(seasonRow.direction_title ? { directionTitle: seasonRow.direction_title } : {})
        }
      : {}),
    stats: {
      focusSessionsTotal: Number(row?.focus_total ?? 0),
      focusMinutesLast7Days: Number(row?.focus_minutes ?? 0),
      actionsCompletedLast7Days: Number(row?.completed_7d ?? 0),
      actionsOpen: Number(row?.actions_open ?? 0),
      capturesTotal: Number(row?.captures_total ?? 0),
      dailyCloseStreak: countClosingStreak(closes.rows.map((close) => close.local_date)),
      lastDailyCloseOn: closes.rows[0]?.local_date ?? null
    }
  };
}
