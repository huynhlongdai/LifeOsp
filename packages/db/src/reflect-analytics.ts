import type { DatabaseClient } from "./index.js";

export type ReflectAnalyticsFacts = {
  /** Focus minutes per local hour of day (0..23) for today, in the user's offset. */
  focusMinutesTodayByHour: { hour: number; minutes: number }[];
  /** Focus minutes per local hour of day over the last 30 days, completed sessions only. */
  focusMinutesByHourLast30Days: { hour: number; minutes: number }[];
  focusMinutesLast7Days: number;
  focusMinutesPrevious7Days: number;
  /** Seven local dates ending today, oldest first, with the raw per-day habit signals. */
  days: {
    localDate: string;
    focusMinutes: number;
    completedFocusSessions: number;
    actionsWithResult: number;
    closed: boolean;
    captures: number;
  }[];
};

/**
 * Everything the REFLECT analytics tabs are allowed to show: counted rows only,
 * bucketed in the user's own timezone offset. No smoothing, no interpolation.
 */
export async function findReflectAnalytics(
  database: DatabaseClient,
  userId: string,
  tzOffsetMinutes: number
): Promise<ReflectAnalyticsFacts> {
  const hourly = await database.pool.query<{ scope: string; hour: number; minutes: string }>(
    `select 'today' as scope,
            extract(hour from (started_at + make_interval(mins => $2)))::int as hour,
            coalesce(sum(extract(epoch from (coalesce(ended_at, now()) - started_at)) / 60), 0)::bigint as minutes
       from focus_sessions
      where user_id = $1
        and (started_at + make_interval(mins => $2))::date = (now() + make_interval(mins => $2))::date
      group by 2
     union all
     select 'last30' as scope,
            extract(hour from (started_at + make_interval(mins => $2)))::int as hour,
            coalesce(sum(extract(epoch from (coalesce(ended_at, now()) - started_at)) / 60), 0)::bigint as minutes
       from focus_sessions
      where user_id = $1
        and status = 'completed'
        and started_at >= now() - interval '30 days'
      group by 2`,
    [userId, tzOffsetMinutes]
  );

  const windows = await database.pool.query<{ last7: string; previous7: string }>(
    `select
       (select coalesce(sum(extract(epoch from (coalesce(ended_at, now()) - started_at)) / 60), 0)::bigint
          from focus_sessions where user_id = $1 and started_at >= now() - interval '7 days') as last7,
       (select coalesce(sum(extract(epoch from (coalesce(ended_at, now()) - started_at)) / 60), 0)::bigint
          from focus_sessions where user_id = $1
           and started_at >= now() - interval '14 days' and started_at < now() - interval '7 days') as previous7`,
    [userId]
  );

  const days = await database.pool.query<{
    local_date: string;
    focus_minutes: string;
    completed_sessions: string;
    actions_with_result: string;
    closed: boolean;
    captures: string;
  }>(
    `with days as (
       select ((now() + make_interval(mins => $2))::date - offset_days)::date as local_date
         from generate_series(0, 6) as offset_days
     )
     select
       d.local_date::text as local_date,
       coalesce((
         select sum(extract(epoch from (coalesce(f.ended_at, now()) - f.started_at)) / 60)
           from focus_sessions f
          where f.user_id = $1 and (f.started_at + make_interval(mins => $2))::date = d.local_date
       ), 0)::bigint as focus_minutes,
       coalesce((
         select count(*) from focus_sessions f
          where f.user_id = $1 and f.status = 'completed'
            and (f.started_at + make_interval(mins => $2))::date = d.local_date
       ), 0)::bigint as completed_sessions,
       coalesce((
         select count(*) from actions a
          where a.user_id = $1 and a.status in ('completed', 'partial', 'postponed')
            and (a.updated_at + make_interval(mins => $2))::date = d.local_date
       ), 0)::bigint as actions_with_result,
       exists (
         select 1 from daily_closes c
          where c.user_id = $1 and c.local_date = d.local_date
       ) as closed,
       coalesce((
         select count(*) from captures cp
          where cp.user_id = $1 and (cp.created_at + make_interval(mins => $2))::date = d.local_date
       ), 0)::bigint as captures
     from days d
     order by d.local_date asc`,
    [userId, tzOffsetMinutes]
  );

  const byScope = (scope: string) =>
    hourly.rows
      .filter((row) => row.scope === scope)
      .map((row) => ({ hour: Number(row.hour), minutes: Number(row.minutes) }))
      .sort((left, right) => left.hour - right.hour);

  return {
    focusMinutesTodayByHour: byScope("today"),
    focusMinutesByHourLast30Days: byScope("last30"),
    focusMinutesLast7Days: Number(windows.rows[0]?.last7 ?? 0),
    focusMinutesPrevious7Days: Number(windows.rows[0]?.previous7 ?? 0),
    days: days.rows.map((row) => ({
      localDate: row.local_date,
      focusMinutes: Number(row.focus_minutes),
      completedFocusSessions: Number(row.completed_sessions),
      actionsWithResult: Number(row.actions_with_result),
      closed: row.closed,
      captures: Number(row.captures)
    }))
  };
}
