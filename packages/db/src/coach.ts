import type { DatabaseClient } from "./index.js";

export type CoachFacts = {
  focusSessionsLast7Days: number;
  focusMinutesLast7Days: number;
  interruptedSessionsLast7Days: number;
  abandonedSessionsLast7Days: number;
  actionsCompletedLast7Days: number;
  actionsPartialLast7Days: number;
  actionsPostponedLast7Days: number;
  dailyClosesLast7Days: number;
  scheduledMinutesNext7Days: number;
  bestFocusHour: number | null;
};

/**
 * Counts the raw facts the coach is allowed to talk about. Everything is a plain
 * aggregate over rows the user produced; no model, no inference, no estimation.
 */
export async function findCoachFacts(database: DatabaseClient, userId: string): Promise<CoachFacts> {
  const totals = await database.pool.query<{
    focus_sessions: string;
    focus_minutes: string;
    interrupted: string;
    abandoned: string;
    completed: string;
    partial: string;
    postponed: string;
    closes: string;
    scheduled_minutes: string;
  }>(
    `select
       (select count(*) from focus_sessions where user_id = $1 and started_at >= now() - interval '7 days') as focus_sessions,
       (select coalesce(sum(extract(epoch from (coalesce(ended_at, now()) - started_at)) / 60), 0)::bigint
          from focus_sessions where user_id = $1 and started_at >= now() - interval '7 days') as focus_minutes,
       (select count(*) from focus_sessions
         where user_id = $1 and started_at >= now() - interval '7 days' and status = 'interrupted') as interrupted,
       (select count(*) from focus_sessions
         where user_id = $1 and started_at >= now() - interval '7 days' and status = 'abandoned') as abandoned,
       (select count(*) from actions
         where user_id = $1 and status = 'completed' and completed_at >= now() - interval '7 days') as completed,
       (select count(*) from actions
         where user_id = $1 and status = 'partial' and updated_at >= now() - interval '7 days') as partial,
       (select count(*) from actions
         where user_id = $1 and status = 'postponed' and updated_at >= now() - interval '7 days') as postponed,
       (select count(*) from daily_closes
         where user_id = $1 and closed_at >= now() - interval '7 days') as closes,
       (select coalesce(sum(estimated_minutes), 0)::bigint from actions
         where user_id = $1 and scheduled_for between now() and now() + interval '7 days') as scheduled_minutes`,
    [userId]
  );

  const bestHour = await database.pool.query<{ hour: string }>(
    `select extract(hour from started_at)::int::text as hour
       from focus_sessions
      where user_id = $1 and started_at >= now() - interval '30 days' and status = 'completed'
      group by 1
      order by count(*) desc, 1
      limit 1`,
    [userId]
  );

  const row = totals.rows[0];
  return {
    focusSessionsLast7Days: Number(row?.focus_sessions ?? 0),
    focusMinutesLast7Days: Number(row?.focus_minutes ?? 0),
    interruptedSessionsLast7Days: Number(row?.interrupted ?? 0),
    abandonedSessionsLast7Days: Number(row?.abandoned ?? 0),
    actionsCompletedLast7Days: Number(row?.completed ?? 0),
    actionsPartialLast7Days: Number(row?.partial ?? 0),
    actionsPostponedLast7Days: Number(row?.postponed ?? 0),
    dailyClosesLast7Days: Number(row?.closes ?? 0),
    scheduledMinutesNext7Days: Number(row?.scheduled_minutes ?? 0),
    bestFocusHour: bestHour.rows[0] ? Number(bestHour.rows[0].hour) : null
  };
}
