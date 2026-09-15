import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseClient } from "@lifeos/db";
import { buildApp } from "./app.js";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./identity.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for Execute board integration tests");

type App = ReturnType<typeof buildApp>;
type Database = ReturnType<typeof createDatabaseClient>;
type SessionCookie = { header: string; token: string };
type ExecutionIds = { seasonId: string; outcomeId: string; projectId: string };

function sessionCookieFromResponse(setCookieHeader: string | string[] | undefined): SessionCookie {
  const setCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(setCookie);
  const match = new RegExp(`^${SESSION_COOKIE_NAME}=([^;]+)`).exec(setCookie);
  assert.ok(match?.[1]);
  const token = decodeURIComponent(match[1]);
  return { header: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`, token };
}

async function bootstrap(app: App): Promise<SessionCookie> {
  const response = await app.inject({ method: "POST", url: "/v1/session/bootstrap" });
  assert.equal(response.statusCode, 201);
  return sessionCookieFromResponse(response.headers["set-cookie"]);
}

async function userIdForToken(database: Database, token: string): Promise<string> {
  const result = await database.pool.query<{ user_id: string }>(
    "select user_id from sessions where token_hash = $1",
    [hashSessionToken(token)]
  );
  const userId = result.rows[0]?.user_id;
  assert.ok(userId);
  return userId;
}

async function setupExecutionContext(database: Database, userId: string): Promise<ExecutionIds> {
  const direction = await database.pool.query<{ id: string }>(
    "insert into directions (user_id, title, status, confirmed_at) values ($1, 'Execute test direction', 'active', now()) returning id",
    [userId]
  );
  const directionId = direction.rows[0]?.id;
  assert.ok(directionId);

  const season = await database.pool.query<{ id: string }>(
    "insert into seasons (user_id, direction_id, title, purpose, status, primary_focus_text) values ($1, $2, 'Execute test season', 'Ship the Execute landing.', 'active', 'Execute board') returning id",
    [userId, directionId]
  );
  const seasonId = season.rows[0]?.id;
  assert.ok(seasonId);

  const outcome = await database.pool.query<{ id: string }>(
    "insert into outcomes (user_id, season_id, title, status) values ($1, $2, 'Execute board ships', 'active') returning id",
    [userId, seasonId]
  );
  const outcomeId = outcome.rows[0]?.id;
  assert.ok(outcomeId);

  const project = await database.pool.query<{ id: string }>(
    "insert into projects (user_id, outcome_id, title, status) values ($1, $2, 'Execute test project', 'active') returning id",
    [userId, outcomeId]
  );
  const projectId = project.rows[0]?.id;
  assert.ok(projectId);

  return { seasonId, outcomeId, projectId };
}

async function insertAction(
  database: Database,
  userId: string,
  ids: ExecutionIds,
  title: string,
  status: string,
  extra: { completedAt?: string } = {}
): Promise<string> {
  const result = await database.pool.query<{ id: string }>(
    `insert into actions
      (user_id, outcome_id, project_id, title, done_condition, estimated_minutes, status, completed_at, priority, created_at, updated_at)
     values ($1, $2, $3, $4, 'Execute test action.', 30, $5, $6, 5, now(), now()) returning id`,
    [userId, ids.outcomeId, ids.projectId, title, status, extra.completedAt ?? null]
  );
  const id = result.rows[0]?.id;
  assert.ok(id);
  return id;
}

async function deleteUsers(database: Database, userIds: Set<string>) {
  for (const userId of userIds) await database.pool.query("delete from users where id = $1", [userId]);
}

test("Execute board groups Actions by status, drops candidates awaiting completion cap, and never leaks across users", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const stranger = await bootstrap(app);
    createdUserIds.add(await userIdForToken(database, stranger.token));

    const ids = await setupExecutionContext(database, ownerUserId);

    const ready = await insertAction(database, ownerUserId, ids, "Ready action", "ready");
    const candidate = await insertAction(database, ownerUserId, ids, "Candidate awaiting confirmation", "candidate");
    const blocked = await insertAction(database, ownerUserId, ids, "Blocked action", "blocked");
    const finished = await insertAction(database, ownerUserId, ids, "Completed action", "completed", { completedAt: new Date().toISOString() });
    const dropped = await insertAction(database, ownerUserId, ids, "Dropped action", "dropped");

    const response = await app.inject({ method: "GET", url: "/v1/execute", headers: { cookie: owner.header } });
    assert.equal(response.statusCode, 200);
    const board = response.json();

    assert.deepEqual(board.ready.map((a: { id: string }) => a.id), [ready]);
    assert.deepEqual(board.candidates.map((a: { id: string }) => a.id), [candidate]);
    assert.deepEqual(board.blocked.map((a: { id: string }) => a.id), [blocked]);
    assert.deepEqual(board.recentlyFinished.map((a: { id: string }) => a.id), [finished]);
    const allIds = [...board.ready, ...board.candidates, ...board.blocked, ...board.recentlyFinished].map((a: { id: string }) => a.id);
    assert.ok(!allIds.includes(dropped), "dropped Actions are not part of any Execute section");

    assert.equal(board.outcomes.length, 1);
    assert.equal(board.outcomes[0].id, ids.outcomeId);
    assert.equal(board.projects.length, 1);
    assert.equal(board.projects[0].id, ids.projectId);
    assert.equal(board.projects[0].outcomeId, ids.outcomeId);

    const strangerResponse = await app.inject({ method: "GET", url: "/v1/execute", headers: { cookie: stranger.header } });
    assert.equal(strangerResponse.statusCode, 200);
    const strangerBoard = strangerResponse.json();
    assert.equal(strangerBoard.ready.length, 0);
    assert.equal(strangerBoard.candidates.length, 0);
    assert.equal(strangerBoard.blocked.length, 0);
    assert.equal(strangerBoard.recentlyFinished.length, 0);
    assert.equal(strangerBoard.outcomes.length, 0);
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("Execute board requires an active session", async () => {
  const app = buildApp({ databaseUrl });
  try {
    const response = await app.inject({ method: "GET", url: "/v1/execute" });
    assert.equal(response.statusCode, 401);
  } finally {
    await app.close();
  }
});
