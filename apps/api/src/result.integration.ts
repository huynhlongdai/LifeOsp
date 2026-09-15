import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseClient } from "@lifeos/db";
import { buildApp } from "./app.js";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./identity.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for B5 result integration tests");

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
  const result = await database.pool.query<{ user_id: string }>("select user_id from sessions where token_hash = $1", [
    hashSessionToken(token)
  ]);
  const userId = result.rows[0]?.user_id;
  assert.ok(userId);
  return userId;
}

async function setupExecutionContext(database: Database, userId: string): Promise<ExecutionIds> {
  const direction = await database.pool.query<{ id: string }>(
    "insert into directions (user_id, title, status, confirmed_at) values ($1, 'B5 direction', 'active', now()) returning id",
    [userId]
  );
  const directionId = direction.rows[0]?.id;
  assert.ok(directionId);

  const season = await database.pool.query<{ id: string }>(
    "insert into seasons (user_id, direction_id, title, purpose, status, primary_focus_text) values ($1, $2, 'Result season', 'Prove B5 result loop.', 'active', 'Result V0') returning id",
    [userId, directionId]
  );
  const seasonId = season.rows[0]?.id;
  assert.ok(seasonId);

  const outcome = await database.pool.query<{ id: string }>(
    "insert into outcomes (user_id, season_id, title, success_definition, status) values ($1, $2, 'Result outcome', 'One result is recorded.', 'active') returning id",
    [userId, seasonId]
  );
  const outcomeId = outcome.rows[0]?.id;
  assert.ok(outcomeId);

  const project = await database.pool.query<{ id: string }>(
    "insert into projects (user_id, outcome_id, title, status) values ($1, $2, 'Result project', 'active') returning id",
    [userId, outcomeId]
  );
  const projectId = project.rows[0]?.id;
  assert.ok(projectId);

  return { seasonId, outcomeId, projectId };
}

async function insertReadyAction(database: Database, userId: string, ids: ExecutionIds, title: string): Promise<string> {
  const result = await database.pool.query<{ id: string }>(
    `insert into actions
      (user_id, outcome_id, project_id, title, done_condition, estimated_minutes, status, priority, created_at, updated_at)
     values ($1, $2, $3, $4, 'Result recorded.', 25, 'ready', 5, now(), now()) returning id`,
    [userId, ids.outcomeId, ids.projectId, title]
  );
  const id = result.rows[0]?.id;
  assert.ok(id);
  return id;
}

async function acceptNowAndStartFocus(app: App, database: Database, owner: SessionCookie, userId: string) {
  const ids = await setupExecutionContext(database, userId);
  const actionId = await insertReadyAction(database, userId, ids, "Record the first B5 result");

  const refreshed = await app.inject({ method: "POST", url: "/v1/now/refresh", headers: { cookie: owner.header } });
  assert.equal(refreshed.statusCode, 200);
  assert.equal(refreshed.json().state, "ready");
  const recommendationId = refreshed.json().recommendation.id as string;

  const accepted = await app.inject({
    method: "POST",
    url: `/v1/now/recommendations/${recommendationId}/resolve`,
    headers: { cookie: owner.header },
    payload: { resolution: "accepted" }
  });
  assert.equal(accepted.statusCode, 200);

  const started = await app.inject({
    method: "POST",
    url: "/v1/focus/start",
    headers: { cookie: owner.header },
    payload: { recommendationId }
  });
  assert.equal(started.statusCode, 201);
  const focusSessionId = started.json().id as string;

  return { ids, actionId, recommendationId, focusSessionId };
}

async function deleteUsers(database: Database, userIds: Set<string>) {
  for (const userId of userIds) await database.pool.query("delete from users where id = $1", [userId]);
}

const TODAY_UTC = new Date().toISOString().slice(0, 10);

test("B5 records a completed result, ends Focus only by explicit choice, and moves NOW on", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const stranger = await bootstrap(app);
    createdUserIds.add(await userIdForToken(database, stranger.token));

    const { actionId, recommendationId, focusSessionId } = await acceptNowAndStartFocus(app, database, owner, ownerUserId);

    const strangerAttempt = await app.inject({
      method: "POST",
      url: `/v1/actions/${actionId}/result`,
      headers: { cookie: stranger.header },
      payload: { result: "completed" }
    });
    assert.equal(strangerAttempt.statusCode, 404, "cross-owner Action is invisible");

    const withoutChoice = await app.inject({
      method: "POST",
      url: `/v1/actions/${actionId}/result`,
      headers: { cookie: owner.header },
      payload: { result: "completed" }
    });
    assert.equal(withoutChoice.statusCode, 409);
    assert.equal(withoutChoice.json().error, "active_focus_exists");
    assert.equal(withoutChoice.json().focusSessionId, focusSessionId);

    const stillReady = await database.pool.query<{ status: string }>("select status from actions where id = $1", [actionId]);
    assert.equal(stillReady.rows[0]?.status, "ready", "a rejected result must not touch the Action");

    const recorded = await app.inject({
      method: "POST",
      url: `/v1/actions/${actionId}/result`,
      headers: { cookie: owner.header },
      payload: { result: "completed", note: "Three sentences written.", focusOutcome: "completed" }
    });
    assert.equal(recorded.statusCode, 201);
    const view = recorded.json();
    assert.equal(view.result, "completed");
    assert.equal(view.action.status, "completed");
    assert.equal(view.recommendationId, recommendationId);
    assert.equal(view.focusSessionId, focusSessionId);
    assert.equal(view.focus.status, "completed");
    assert.equal(view.plannedMinutes, 25);
    assert.equal(view.focusSessionCount, 1);
    assert.equal(typeof view.actualFocusMinutes, "number");

    const actionRow = await database.pool.query<{ status: string; completed_at: Date | null }>(
      "select status, completed_at from actions where id = $1",
      [actionId]
    );
    assert.equal(actionRow.rows[0]?.status, "completed");
    assert.ok(actionRow.rows[0]?.completed_at);

    const focusRow = await database.pool.query<{ status: string; ended_at: Date | null }>(
      "select status, ended_at from focus_sessions where id = $1",
      [focusSessionId]
    );
    assert.equal(focusRow.rows[0]?.status, "completed");
    assert.ok(focusRow.rows[0]?.ended_at);

    const events = await database.pool.query<{ type: string }>(
      "select type from life_events where user_id = $1 and type in ('action.result.recorded', 'focus.completed') order by type",
      [ownerUserId]
    );
    assert.deepEqual(
      events.rows.map((row) => row.type),
      ["action.result.recorded", "focus.completed"]
    );

    const second = await app.inject({
      method: "POST",
      url: `/v1/actions/${actionId}/result`,
      headers: { cookie: owner.header },
      payload: { result: "dropped" }
    });
    assert.equal(second.statusCode, 409);
    assert.equal(second.json().error, "invalid_status");
    assert.equal(second.json().currentStatus, "completed");

    const now = await app.inject({ method: "GET", url: "/v1/now", headers: { cookie: owner.header } });
    assert.equal(now.statusCode, 200);
    assert.equal(now.json().state, "no_ready_action", "NOW must not keep showing a completed Action");
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("B5 validates result payloads and keeps blocked/postponed/dropped free of overdue debt", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const ids = await setupExecutionContext(database, ownerUserId);

    const blockedAction = await insertReadyAction(database, ownerUserId, ids, "Blocked without reason");
    const missingReason = await app.inject({
      method: "POST",
      url: `/v1/actions/${blockedAction}/result`,
      headers: { cookie: owner.header },
      payload: { result: "blocked" }
    });
    assert.equal(missingReason.statusCode, 400, "blocked requires blockedReason");

    const blocked = await app.inject({
      method: "POST",
      url: `/v1/actions/${blockedAction}/result`,
      headers: { cookie: owner.header },
      payload: { result: "blocked", blockedReason: "Waiting for the mail account." }
    });
    assert.equal(blocked.statusCode, 201);
    assert.equal(blocked.json().action.status, "blocked");
    assert.equal(blocked.json().blockedReason, "Waiting for the mail account.");
    const blockedRow = await database.pool.query<{ blocked_reason: string | null }>(
      "select blocked_reason from actions where id = $1",
      [blockedAction]
    );
    assert.equal(blockedRow.rows[0]?.blocked_reason, "Waiting for the mail account.");

    const postponedAction = await insertReadyAction(database, ownerUserId, ids, "Postpone me");
    const badDate = await app.inject({
      method: "POST",
      url: `/v1/actions/${postponedAction}/result`,
      headers: { cookie: owner.header },
      payload: { result: "postponed", postponeUntil: "2026-02-30" }
    });
    assert.equal(badDate.statusCode, 400);

    const postponed = await app.inject({
      method: "POST",
      url: `/v1/actions/${postponedAction}/result`,
      headers: { cookie: owner.header },
      payload: { result: "postponed", postponeUntil: "2026-09-20", note: "Not today." }
    });
    assert.equal(postponed.statusCode, 201);
    assert.equal(postponed.json().postponeUntil, "2026-09-20");
    assert.equal(postponed.json().focusSessionCount, 0);

    const noFocus = await insertReadyAction(database, ownerUserId, ids, "No focus here");
    const focusNotActive = await app.inject({
      method: "POST",
      url: `/v1/actions/${noFocus}/result`,
      headers: { cookie: owner.header },
      payload: { result: "dropped", focusOutcome: "abandoned" }
    });
    assert.equal(focusNotActive.statusCode, 409);
    assert.equal(focusNotActive.json().error, "focus_not_active");

    const unknownKey = await app.inject({
      method: "POST",
      url: `/v1/actions/${noFocus}/result`,
      headers: { cookie: owner.header },
      payload: { result: "dropped", score: 3 }
    });
    assert.equal(unknownKey.statusCode, 400, "unknown keys are rejected");

    const dropped = await app.inject({
      method: "POST",
      url: `/v1/actions/${noFocus}/result`,
      headers: { cookie: owner.header },
      payload: { result: "dropped" }
    });
    assert.equal(dropped.statusCode, 201);
    assert.equal(dropped.json().action.status, "dropped");
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("B5 Daily Close summarizes recorded facts for a local day and stores optional input once per date", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const stranger = await bootstrap(app);
    createdUserIds.add(await userIdForToken(database, stranger.token));

    const { actionId } = await acceptNowAndStartFocus(app, database, owner, ownerUserId);
    const recorded = await app.inject({
      method: "POST",
      url: `/v1/actions/${actionId}/result`,
      headers: { cookie: owner.header },
      payload: { result: "partial", remainingText: "One sentence left.", focusOutcome: "interrupted" }
    });
    assert.equal(recorded.statusCode, 201);

    const badQuery = await app.inject({ method: "GET", url: "/v1/daily-close?date=2026-9-1&offsetMinutes=0", headers: { cookie: owner.header } });
    assert.equal(badQuery.statusCode, 400);

    const summary = await app.inject({
      method: "GET",
      url: `/v1/daily-close?date=${TODAY_UTC}&offsetMinutes=0`,
      headers: { cookie: owner.header }
    });
    assert.equal(summary.statusCode, 200);
    const view = summary.json();
    assert.equal(view.date, TODAY_UTC);
    assert.equal(view.close, null);
    assert.equal(view.summary.results.partial, 1);
    assert.equal(view.summary.results.completed, 0);
    assert.equal(view.summary.resultItems.length, 1);
    assert.equal(view.summary.resultItems[0].actionId, actionId);
    assert.equal(view.summary.focusSessions.count, 1);
    assert.equal(view.summary.outcomesMoved, 1);
    assert.equal(view.summary.distractionsCaptured, 0);

    const strangerSummary = await app.inject({
      method: "GET",
      url: `/v1/daily-close?date=${TODAY_UTC}&offsetMinutes=0`,
      headers: { cookie: stranger.header }
    });
    assert.equal(strangerSummary.statusCode, 200);
    assert.equal(strangerSummary.json().summary.resultItems.length, 0, "facts never leak across users");

    const badFriction = await app.inject({
      method: "POST",
      url: "/v1/daily-close",
      headers: { cookie: owner.header },
      payload: { date: TODAY_UTC, offsetMinutes: 0, frictionCode: "lazy" }
    });
    assert.equal(badFriction.statusCode, 400, "friction vocabulary is closed and never judgmental");

    const closed = await app.inject({
      method: "POST",
      url: "/v1/daily-close",
      headers: { cookie: owner.header },
      payload: { date: TODAY_UTC, offsetMinutes: 0, meaningfulProgressText: "Started writing.", frictionCode: "interrupted" }
    });
    assert.equal(closed.statusCode, 201);
    assert.equal(closed.json().close.frictionCode, "interrupted");
    assert.equal(closed.json().close.meaningfulProgressText, "Started writing.");
    assert.equal(closed.json().summary.results.partial, 1);

    const updated = await app.inject({
      method: "POST",
      url: "/v1/daily-close",
      headers: { cookie: owner.header },
      payload: { date: TODAY_UTC, offsetMinutes: 0, note: "Good enough." }
    });
    assert.equal(updated.statusCode, 200, "second close of the same date updates instead of duplicating");
    assert.equal(updated.json().close.note, "Good enough.");
    assert.equal(updated.json().close.meaningfulProgressText, undefined, "close input is replaced as a whole");

    const rows = await database.pool.query<{ count: string }>("select count(*) from daily_closes where user_id = $1", [ownerUserId]);
    assert.equal(rows.rows[0]?.count, "1");

    const events = await database.pool.query<{ type: string }>(
      "select type from life_events where user_id = $1 and type like 'daily_close.%' order by occurred_at",
      [ownerUserId]
    );
    assert.deepEqual(
      events.rows.map((row) => row.type),
      ["daily_close.recorded", "daily_close.updated"]
    );

    // Restart: a fresh app instance reads the same close and the same facts (ported case).
    const restarted = buildApp({ databaseUrl });
    try {
      const afterRestart = await restarted.inject({
        method: "GET",
        url: `/v1/daily-close?date=${TODAY_UTC}&offsetMinutes=0`,
        headers: { cookie: owner.header }
      });
      assert.equal(afterRestart.statusCode, 200);
      assert.equal(afterRestart.json().close.note, "Good enough.");
      assert.equal(afterRestart.json().summary.results.partial, 1);
    } finally {
      await restarted.close();
    }
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});
