import type { DatabaseClient } from "./index.js";

export type DirectionOutlookFacts = {
  outcomes: {
    outcomeId: string;
    title: string;
    successDefinition?: string;
    status: string;
    actionsTotal: number;
    actionsCompleted: number;
    nextActionTitle?: string;
  }[];
  recentWins: { actionId: string; title: string; completedAt: string }[];
  actionsCompletedLast14Days: number;
  focusMinutesLast14Days: number;
};

/** Outcomes of the active Season with their real Action counts. Nothing is estimated. */
export async function findDirectionOutlook(database: DatabaseClient, userId: string): Promise<DirectionOutlookFacts> {
  const outcomes = await database.pool.query<{
    id: string;
    title: string;
    success_definition: string | null;
    status: string;
    actions_total: string;
    actions_completed: string;
    next_action_title: string | null;
  }>(
    `select o.id, o.title, o.success_definition, o.status,
            (select count(*) from actions a where a.outcome_id = o.id and a.user_id = $1) as actions_total,
            (select count(*) from actions a where a.outcome_id = o.id and a.user_id = $1 and a.status = 'completed') as actions_completed,
            (select a.title from actions a
               where a.outcome_id = o.id and a.user_id = $1 and a.status not in ('completed', 'dropped')
               order by a.created_at asc limit 1) as next_action_title
       from outcomes o
       join seasons s on s.id = o.season_id
      where o.user_id = $1 and s.status = 'active'
      order by coalesce(o.priority, 1000), o.created_at asc`,
    [userId]
  );

  const wins = await database.pool.query<{ id: string; title: string; completed_at: string }>(
    `select a.id, a.title, a.completed_at::text as completed_at
       from actions a
      where a.user_id = $1 and a.status = 'completed' and a.completed_at >= now() - interval '14 days'
      order by a.completed_at desc
      limit 3`,
    [userId]
  );

  const totals = await database.pool.query<{ completed: string; focus_minutes: string }>(
    `select
       (select count(*) from actions where user_id = $1 and status = 'completed' and completed_at >= now() - interval '14 days') as completed,
       (select coalesce(sum(extract(epoch from (coalesce(ended_at, now()) - started_at)) / 60), 0)::bigint
          from focus_sessions where user_id = $1 and started_at >= now() - interval '14 days') as focus_minutes`,
    [userId]
  );

  return {
    outcomes: outcomes.rows.map((row) => ({
      outcomeId: row.id,
      title: row.title,
      ...(row.success_definition ? { successDefinition: row.success_definition } : {}),
      status: row.status,
      actionsTotal: Number(row.actions_total),
      actionsCompleted: Number(row.actions_completed),
      ...(row.next_action_title ? { nextActionTitle: row.next_action_title } : {})
    })),
    recentWins: wins.rows.map((row) => ({ actionId: row.id, title: row.title, completedAt: row.completed_at })),
    actionsCompletedLast14Days: Number(totals.rows[0]?.completed ?? 0),
    focusMinutesLast14Days: Number(totals.rows[0]?.focus_minutes ?? 0)
  };
}
