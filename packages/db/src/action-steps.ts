import type { DatabaseClient } from "./index.js";

export type ActionStepRecord = {
  id: string;
  actionId: string;
  title: string;
  position: number;
  done: boolean;
};

type Row = { id: string; action_id: string; title: string; position: number; done_at: Date | null };

const toRecord = (row: Row): ActionStepRecord => ({
  id: row.id,
  actionId: row.action_id,
  title: row.title,
  position: Number(row.position),
  done: row.done_at !== null
});

/** Ownership is checked server-side on every read and write; the client never decides it. */
export async function findActionSteps(
  database: DatabaseClient,
  userId: string,
  actionId: string
): Promise<ActionStepRecord[]> {
  const result = await database.pool.query<Row>(
    `select id, action_id, title, position, done_at
       from action_steps
      where user_id = $1 and action_id = $2
      order by position asc, created_at asc`,
    [userId, actionId]
  );
  return result.rows.map(toRecord);
}

export async function insertActionStep(
  database: DatabaseClient,
  userId: string,
  actionId: string,
  title: string
): Promise<ActionStepRecord | null> {
  const owns = await database.pool.query(`select 1 from actions where id = $1 and user_id = $2`, [actionId, userId]);
  if (owns.rowCount === 0) return null;

  const result = await database.pool.query<Row>(
    `insert into action_steps (user_id, action_id, title, position)
     values ($1, $2, $3, coalesce((select max(position) + 1 from action_steps where action_id = $2), 0))
     returning id, action_id, title, position, done_at`,
    [userId, actionId, title]
  );
  return result.rows[0] ? toRecord(result.rows[0]) : null;
}

export async function setActionStepDone(
  database: DatabaseClient,
  userId: string,
  stepId: string,
  done: boolean
): Promise<ActionStepRecord | null> {
  const result = await database.pool.query<Row>(
    `update action_steps set done_at = case when $3 then now() else null end
      where id = $1 and user_id = $2
      returning id, action_id, title, position, done_at`,
    [stepId, userId, done]
  );
  return result.rows[0] ? toRecord(result.rows[0]) : null;
}

export async function deleteActionStep(database: DatabaseClient, userId: string, stepId: string): Promise<boolean> {
  const result = await database.pool.query(`delete from action_steps where id = $1 and user_id = $2`, [stepId, userId]);
  return (result.rowCount ?? 0) > 0;
}
