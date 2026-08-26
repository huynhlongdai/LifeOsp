import assert from "node:assert/strict";
import test from "node:test";
import { checkDatabase, createDatabaseClient } from "./index.js";

test("database foundation supports transactional create and rollback", async () => {
  const connectionString = process.env.DATABASE_URL;
  assert.ok(connectionString, "DATABASE_URL is required for DB integration tests");

  const { pool } = createDatabaseClient(connectionString);
  const client = await pool.connect();
  let userId: string | undefined;

  try {
    assert.equal(await checkDatabase(pool), true);

    await client.query("begin");

    const userResult = await client.query<{ id: string }>(
      "insert into users default values returning id"
    );
    userId = userResult.rows[0]?.id;
    assert.ok(userId);

    const eventResult = await client.query<{ id: string; source: string }>(
      `insert into life_events (user_id, type, source, payload)
       values ($1, $2, $3, $4::jsonb)
       returning id, source`,
      [userId, "foundation.test.created", "system", JSON.stringify({ integration: true })]
    );

    assert.ok(eventResult.rows[0]?.id);
    assert.equal(eventResult.rows[0]?.source, "system");

    const visibleInsideTransaction = await client.query<{ count: string }>(
      "select count(*)::text as count from life_events where user_id = $1",
      [userId]
    );
    assert.equal(visibleInsideTransaction.rows[0]?.count, "1");

    await client.query("rollback");

    const visibleAfterRollback = await pool.query<{ count: string }>(
      "select count(*)::text as count from users where id = $1",
      [userId]
    );
    assert.equal(visibleAfterRollback.rows[0]?.count, "0");
  } finally {
    try {
      await client.query("rollback");
    } catch {
      // Transaction may already be closed; cleanup continues through pool shutdown.
    }
    client.release();
    await pool.end();
  }
});
