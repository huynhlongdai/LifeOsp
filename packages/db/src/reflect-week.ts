import type { DatabaseClient } from "./index.js";

export type ReflectWeekDay = {
  localDate: string;
  focusMinutes: number;
  focusSessions: number;
  actionsCompleted: number;
  closed: boolean;
};

/**
 * Seven real days ending today, in the user's own timezone offset. Days without data
 * come back as zeros — the week view never interpolates.
 */
export async function findReflectWeek(
  database: DatabaseClient,
  userId: string,
  tzOffsetMinutes: number
): Promise<ReflectWeekDay[]> {
  const result = await database.pool.query<{
    local_date: string;
    focus_minutes: string;
    focus_sessions: string;
    actions_completed: string;
    closed: boolean;
  }>(
    `with days as (
       select (current_date + make_interval(mins => $2) - make_interval(days => offset_days))::date as local_date
         from generate_series(0, 6) as offset_days
     )
     select
       d.local_date::text as local_date,
       coalesce((
         select sum(extract(epoch from (coalesce(f.ended_at, now()) - f.started_at)) / 60)
           from focus_sessions f
          where f.user_id = $1
            and (f.started_at + make_interval(mins => $2))::date = d.local_date
       ), 0)::bigint as focus_minutes,
       coalesce((
         select count(*) from focus_sessions f
          where f.user_id = $1
            and (f.started_at + make_interval(mins => $2))::date = d.local_date
       ), 0)::bigint as focus_sessions,
       coalesce((
         select count(*) from actions a
          where a.user_id = $1 and a.status = 'completed'
            and (a.completed_at + make_interval(mins => $2))::date = d.local_date
       ), 0)::bigint as actions_completed,
       exists(select 1 from daily_closes c where c.user_id = $1 and c.local_date = d.local_date) as closed
     from days d
     order by d.local_date`,
    [userId, tzOffsetMinutes]
  );

  return result.rows.map((row) => ({
    localDate: row.local_date,
    focusMinutes: Number(row.focus_minutes),
    focusSessions: Number(row.focus_sessions),
    actionsCompleted: Number(row.actions_completed),
    closed: row.closed
  }));
}
