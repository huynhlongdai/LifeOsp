import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseClient } from "@lifeos/db";
import { buildApp } from "./app.js";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./identity.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for Weekly Reset integration tests");

type App = ReturnType<typeof buildApp>;
type Database = ReturnType<typeof createDatabaseClient>;
type SessionCookie = { header: string; token: string };
type ExecutionIds = { seasonId: string; outcomeId: string };

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
    "insert into directions (user_id, title, status, confirmed_at) values ($1, 'Weekly reset test direction', 'active', now()) returning id",
    [userId]
  );
  const directionId = direction.rows[0]?.id;
  assert.ok(directionId);

  const season = await database.pool.query<{ id: string }>(
    "insert into seasons (user_id, direction_id, title, purpose, status, primary_focus_text) values ($1, $2, 'Weekly reset test season', 'Ship it.', 'active', 'Weekly Reset') returning id",
    [userId, directionId]
  );
  const seasonId = season.rows[0]?.id;
  assert.ok(seasonId);

  const outcome = await database.pool.query<{ id: string }>(
    "insert into outcomes (user_id, season_id, title, status) values ($1, $2, 'Weekly reset outcome', 'active') returning id",
    [userId, seasonId]
  );
  const outcomeId = outcome.rows[0]?.id;
  assert.ok(outcomeId);

  return { seasonId, outcomeId };
}

async function insertActionWithResult(
  database: Database,
  userId: string,
  ids: ExecutionIds,
  title: string,
  result: string,
  recordedAt: Date,
  extra: { status?: string; actualFocusMinutes?: number; focusSessionCount?: number } = {}
): Promise<string> {
  const action = await database.pool.query<{ id: string }>(
    `insert into actions (user_id, outcome_id, title, done_condition, estimated_minutes, status, created_at, updated_at)
     values ($1, $2, $3, 'Weekly reset test action.', 30, $4, now(), now()) returning id`,
    [userId, ids.outcomeId, title, extra.status ?? (result === "completed" ? "completed" : result === "dropped" ? "dropped" : "ready")]
  );
  const actionId = action.rows[0]?.id;
  assert.ok(actionId);

  await database.pool.query(
    `insert into action_results (user_id, action_id, result, actual_focus_minutes, focus_session_count, recorded_at, blocked_reason)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId,
      actionId,
      result,
      extra.actualFocusMinutes ?? 0,
      extra.focusSessionCount ?? 0,
      recordedAt,
      result === "blocked" ? "Waiting on something." : null
    ]
  );
  return actionId;
}

async function insertBlockedAction(database: Database, userId: string, ids: ExecutionIds, title: string): Promise<string> {
  const action = await database.pool.query<{ id: string }>(
    `insert into actions (user_id, outcome_id, title, done_condition, estimated_minutes, status, created_at, updated_at)
     values ($1, $2, $3, 'Weekly reset test action.', 30, 'blocked', now(), now()) returning id`,
    [userId, ids.outcomeId, title]
  );
  const actionId = action.rows[0]?.id;
  assert.ok(actionId);
  return actionId;
}

async function deleteUsers(database: Database, userIds: Set<string>) {
  for (const userId of userIds) await database.pool.query("delete from users where id = $1", [userId]);
}

test("Weekly Reset summarizes the week's Reality/Movement from recorded facts and never leaks across users", async () => {
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
    const weekStart = "2026-09-14"; // Monday
    const withinWeek = new Date("2026-09-16T10:00:00Z");

    const completed = await insertActionWithResult(database, ownerUserId, ids, "Advanced this week", "completed", withinWeek, {
      actualFocusMinutes: 90,
      focusSessionCount: 2
    });
    const dropped = await insertActionWithResult(database, ownerUserId, ids, "Dropped this week", "dropped", withinWeek);
    const blocked = await insertBlockedAction(database, ownerUserId, ids, "Blocked action");

    // Outside the week window entirely (should not count).
    await insertActionWithResult(database, ownerUserId, ids, "Last week's result", "completed", new Date("2026-09-01T10:00:00Z"), {
      actualFocusMinutes: 999
    });

    const response = await app.inject({
      method: "GET",
      url: `/v1/weekly-reset?weekStart=${weekStart}&offsetMinutes=-420`,
      headers: { cookie: owner.header }
    });
    assert.equal(response.statusCode, 200, JSON.stringify(response.json()));
    const view = response.json();

    assert.equal(view.weekStart, weekStart);
    assert.equal(view.reality.focusMinutes, 90);
    assert.equal(view.reality.focusSessionCount, 2);
    assert.equal(view.reality.resultCounts.completed, 1);
    assert.equal(view.reality.resultCounts.dropped, 1);
    assert.deepEqual(view.movement.advanced.map((a: { id: string }) => a.id), [completed]);
    assert.deepEqual(view.movement.intentionallyDropped.map((a: { id: string }) => a.id), [dropped]);
    assert.deepEqual(view.movement.blocked.map((a: { id: string }) => a.id), [blocked]);
    assert.deepEqual(new Set(view.unavailableSections), new Set(["patternCandidates", "adjustment"]));
    assert.equal(view.nextWeek.hasDirection, true);
    assert.equal(view.nextWeek.directionTitle, "Weekly reset test direction");

    const strangerResponse = await app.inject({
      method: "GET",
      url: `/v1/weekly-reset?weekStart=${weekStart}&offsetMinutes=-420`,
      headers: { cookie: stranger.header }
    });
    assert.equal(strangerResponse.statusCode, 200);
    const strangerView = strangerResponse.json();
    assert.equal(strangerView.reality.focusMinutes, 0);
    assert.equal(strangerView.movement.advanced.length, 0);
    assert.equal(strangerView.nextWeek.hasDirection, false);
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("Completing a Weekly Reset logs an audit event and is reflected on the next read; invalid input is rejected", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);

    const complete = await app.inject({
      method: "POST",
      url: "/v1/weekly-reset/complete",
      headers: { cookie: owner.header },
      payload: { weekStart: "2026-09-14", offsetMinutes: -420 }
    });
    assert.equal(complete.statusCode, 201, JSON.stringify(complete.json()));
    assert.equal(complete.json().status, "completed");

    const events = await database.pool.query<{ type: string }>(
      "select type from life_events where user_id = $1 and type = 'weekly_reset.completed'",
      [ownerUserId]
    );
    assert.equal(events.rows.length, 1);

    const reload = await app.inject({
      method: "GET",
      url: "/v1/weekly-reset?weekStart=2026-09-14&offsetMinutes=-420",
      headers: { cookie: owner.header }
    });
    assert.equal(reload.statusCode, 200);
    assert.ok(reload.json().lastCompletedAt);

    const badRequest = await app.inject({
      method: "POST",
      url: "/v1/weekly-reset/complete",
      headers: { cookie: owner.header },
      payload: { weekStart: "not-a-date", offsetMinutes: -420 }
    });
    assert.equal(badRequest.statusCode, 400);

    const unauthenticated = await app.inject({ method: "GET", url: "/v1/weekly-reset?weekStart=2026-09-14&offsetMinutes=-420" });
    assert.equal(unauthenticated.statusCode, 401);
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});
