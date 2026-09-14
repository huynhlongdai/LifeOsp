import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseClient } from "@lifeos/db";
import { buildApp } from "./app.js";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./identity.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for B5 Result + Daily Close integration tests");

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

async function insertReadyAction(
  database: Database,
  userId: string,
  ids: ExecutionIds,
  title: string,
  priority = 5
): Promise<string> {
  const result = await database.pool.query<{ id: string }>(
    `insert into actions
      (user_id, outcome_id, project_id, title, done_condition, estimated_minutes, status, priority, created_at, updated_at)
     values ($1, $2, $3, $4, 'Result recorded for this action.', 30, 'ready', $5, now(), now()) returning id`,
    [userId, ids.outcomeId, ids.projectId, title, priority]
  );
  const id = result.rows[0]?.id;
  assert.ok(id);
  return id;
}

async function acceptedNowRecommendation(
  app: App,
  owner: SessionCookie
): Promise<string> {
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
  return recommendationId;
}

async function deleteUsers(database: Database, userIds: Set<string>) {
  for (const userId of userIds) await database.pool.query("delete from users where id = $1", [userId]);
}

function localDateFor(date: Date, tzOffsetMinutes: number): string {
  return new Date(date.getTime() + tzOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

test("B5 commits Action result together with Focus and resolves the NOW recommendation", async () => {
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
    const actionId = await insertReadyAction(database, ownerUserId, ids, "Ship B5 result contract");
    const recommendationId = await acceptedNowRecommendation(app, owner);

    const started = await app.inject({
      method: "POST",
      url: "/v1/focus/start",
      headers: { cookie: owner.header },
      payload: { recommendationId }
    });
    assert.equal(started.statusCode, 201);
    const focusSessionId = started.json().id as string;

    const crossOwner = await app.inject({
      method: "POST",
      url: `/v1/actions/${actionId}/result`,
      headers: { cookie: stranger.header },
      payload: { outcome: "completed" }
    });
    assert.equal(crossOwner.statusCode, 404, "cross-owner Action must not receive a result");

    const recorded = await app.inject({
      method: "POST",
      url: `/v1/actions/${actionId}/result`,
      headers: { cookie: owner.header },
      payload: { outcome: "completed", note: "Contract merged", focusSessionId }
    });
    assert.equal(recorded.statusCode, 201);
    const result = recorded.json();
    assert.equal(result.outcome, "completed");
    assert.equal(result.actionStatus, "completed");
    assert.equal(result.previousActionStatus, "ready");
    assert.equal(result.focusSessionId, focusSessionId);
    assert.equal(result.plannedMinutes, 30);
    assert.equal(typeof result.focusMinutes, "number");

    const action = await database.pool.query<{ status: string; completed_at: Date | null; scheduled_for: Date | null }>(
      "select status, completed_at, scheduled_for from actions where id = $1",
      [actionId]
    );
    assert.equal(action.rows[0]?.status, "completed");
    assert.ok(action.rows[0]?.completed_at);
    assert.equal(action.rows[0]?.scheduled_for, null);

    const focus = await database.pool.query<{ status: string; ended_at: Date | null }>(
      "select status, ended_at from focus_sessions where id = $1",
      [focusSessionId]
    );
    assert.equal(focus.rows[0]?.status, "completed");
    assert.ok(focus.rows[0]?.ended_at);

    const recommendation = await database.pool.query<{ status: string; resolved_at: Date | null }>(
      "select status, resolved_at from recommendations where id = $1",
      [recommendationId]
    );
    assert.equal(recommendation.rows[0]?.status, "accepted");
    assert.ok(recommendation.rows[0]?.resolved_at, "result must resolve the open NOW recommendation");

    const repeated = await app.inject({
      method: "POST",
      url: `/v1/actions/${actionId}/result`,
      headers: { cookie: owner.header },
      payload: { outcome: "partial" }
    });
    assert.equal(repeated.statusCode, 409);
    assert.equal(repeated.json().error, "already_recorded");

    const stillOneResult = await database.pool.query<{ count: string }>(
      "select count(*)::text as count from action_results where action_id = $1",
      [actionId]
    );
    assert.equal(stillOneResult.rows[0]?.count, "1", "repeated transition must not create partial state");

    const events = await database.pool.query<{ type: string; payload: { outcome?: string; focusSessionId?: string } }>(
      "select type, payload from life_events where user_id = $1 and type = 'action.result.recorded'",
      [ownerUserId]
    );
    assert.equal(events.rows.length, 1);
    assert.equal(events.rows[0]?.payload.outcome, "completed");
    assert.equal(events.rows[0]?.payload.focusSessionId, focusSessionId);

    const now = await app.inject({ method: "GET", url: "/v1/now", headers: { cookie: owner.header } });
    assert.equal(now.statusCode, 200);
    assert.notEqual(now.json().state, "ready", "a completed Action must not stay the primary NOW recommendation");
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("B5 validates every result transition without creating partial state or overdue debt", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const ids = await setupExecutionContext(database, ownerUserId);

    const blockedAction = await insertReadyAction(database, ownerUserId, ids, "Blocked action", 4);
    const missingReason = await app.inject({
      method: "POST",
      url: `/v1/actions/${blockedAction}/result`,
      headers: { cookie: owner.header },
      payload: { outcome: "blocked" }
    });
    assert.equal(missingReason.statusCode, 400);
    const noRowsYet = await database.pool.query<{ count: string }>(
      "select count(*)::text as count from action_results where action_id = $1",
      [blockedAction]
    );
    assert.equal(noRowsYet.rows[0]?.count, "0");

    const blocked = await app.inject({
      method: "POST",
      url: `/v1/actions/${blockedAction}/result`,
      headers: { cookie: owner.header },
      payload: { outcome: "blocked", reason: "Waiting for API credentials" }
    });
    assert.equal(blocked.statusCode, 201);
    const blockedRow = await database.pool.query<{ status: string; blocked_reason: string | null }>(
      "select status, blocked_reason from actions where id = $1",
      [blockedAction]
    );
    assert.equal(blockedRow.rows[0]?.status, "blocked");
    assert.equal(blockedRow.rows[0]?.blocked_reason, "Waiting for API credentials");

    const postponedAction = await insertReadyAction(database, ownerUserId, ids, "Postponed action", 3);
    const postponed = await app.inject({
      method: "POST",
      url: `/v1/actions/${postponedAction}/result`,
      headers: { cookie: owner.header },
      payload: { outcome: "postponed" }
    });
    assert.equal(postponed.statusCode, 201);
    const postponedRow = await database.pool.query<{ status: string; scheduled_for: Date | null }>(
      "select status, scheduled_for from actions where id = $1",
      [postponedAction]
    );
    assert.equal(postponedRow.rows[0]?.status, "postponed");
    assert.equal(postponedRow.rows[0]?.scheduled_for, null, "postponing must not create synthetic overdue debt");

    const droppedAction = await insertReadyAction(database, ownerUserId, ids, "Dropped action", 2);
    const dropped = await app.inject({
      method: "POST",
      url: `/v1/actions/${droppedAction}/result`,
      headers: { cookie: owner.header },
      payload: { outcome: "dropped", note: "No longer relevant this season" }
    });
    assert.equal(dropped.statusCode, 201);

    const candidate = await database.pool.query<{ id: string }>(
      `insert into actions (user_id, outcome_id, project_id, title, status, created_at, updated_at)
       values ($1, $2, $3, 'Candidate action', 'candidate', now(), now()) returning id`,
      [ownerUserId, ids.outcomeId, ids.projectId]
    );
    const candidateId = candidate.rows[0]?.id;
    assert.ok(candidateId);
    const candidateResult = await app.inject({
      method: "POST",
      url: `/v1/actions/${candidateId}/result`,
      headers: { cookie: owner.header },
      payload: { outcome: "completed" }
    });
    assert.equal(candidateResult.statusCode, 409);
    assert.equal(candidateResult.json().error, "invalid_status");

    const partialAction = await insertReadyAction(database, ownerUserId, ids, "Partial action", 1);
    const unknownFocus = await app.inject({
      method: "POST",
      url: `/v1/actions/${partialAction}/result`,
      headers: { cookie: owner.header },
      payload: { outcome: "partial", focusSessionId: "00000000-0000-4000-8000-000000000000" }
    });
    assert.equal(unknownFocus.statusCode, 409);
    assert.equal(unknownFocus.json().error, "invalid_focus");
    const partialUntouched = await database.pool.query<{ status: string }>("select status from actions where id = $1", [
      partialAction
    ]);
    assert.equal(partialUntouched.rows[0]?.status, "ready", "a rejected result must leave the Action untouched");
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("B5 Daily Close summarizes only recorded facts and survives restart", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();
  const tzOffsetMinutes = 420;

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const ids = await setupExecutionContext(database, ownerUserId);

    const actionId = await insertReadyAction(database, ownerUserId, ids, "Daily close action");
    const recommendationId = await acceptedNowRecommendation(app, owner);

    const started = await app.inject({
      method: "POST",
      url: "/v1/focus/start",
      headers: { cookie: owner.header },
      payload: { recommendationId }
    });
    assert.equal(started.statusCode, 201);
    const focusSessionId = started.json().id as string;

    const distraction = await app.inject({
      method: "POST",
      url: `/v1/focus/${focusSessionId}/distractions`,
      headers: { cookie: owner.header },
      payload: { rawText: "Check invoices later" }
    });
    assert.equal(distraction.statusCode, 201);

    const recorded = await app.inject({
      method: "POST",
      url: `/v1/actions/${actionId}/result`,
      headers: { cookie: owner.header },
      payload: { outcome: "partial", note: "Half of the draft is written", focusSessionId }
    });
    assert.equal(recorded.statusCode, 201);
    assert.equal(recorded.json().outcome, "partial");

    const localDate = localDateFor(new Date(), tzOffsetMinutes);
    const preview = await app.inject({
      method: "GET",
      url: `/v1/daily-close?date=${localDate}&tzOffsetMinutes=${tzOffsetMinutes}`,
      headers: { cookie: owner.header }
    });
    assert.equal(preview.statusCode, 200);
    const previewBody = preview.json();
    assert.equal(previewBody.localDate, localDate);
    assert.equal(previewBody.summary.resultsRecorded, 1);
    assert.equal(previewBody.summary.partial, 1);
    assert.equal(previewBody.summary.completed, 0);
    assert.equal(previewBody.summary.focusSessions, 1);
    assert.equal(previewBody.summary.distractionsCaptured, 1);
    assert.equal(previewBody.results.length, 1);
    assert.equal(previewBody.closed, undefined);

    const closed = await app.inject({
      method: "POST",
      url: "/v1/daily-close",
      headers: { cookie: owner.header },
      payload: { localDate, tzOffsetMinutes, note: "Short day, but the draft moved." }
    });
    assert.equal(closed.statusCode, 201);
    assert.equal(closed.json().closed.note, "Short day, but the draft moved.");
    assert.equal(closed.json().summary.partial, 1);

    const duplicate = await app.inject({
      method: "POST",
      url: "/v1/daily-close",
      headers: { cookie: owner.header },
      payload: { localDate, tzOffsetMinutes }
    });
    assert.equal(duplicate.statusCode, 409);
    assert.equal(duplicate.json().error, "already_closed");

    const closeEvents = await database.pool.query<{ payload: { localDate?: string } }>(
      "select payload from life_events where user_id = $1 and type = 'daily_close.recorded'",
      [ownerUserId]
    );
    assert.equal(closeEvents.rows.length, 1);
    assert.equal(closeEvents.rows[0]?.payload.localDate, localDate);

    await app.close();
    const restartedApp = buildApp({ databaseUrl });
    try {
      const reloaded = await restartedApp.inject({
        method: "GET",
        url: `/v1/daily-close?date=${localDate}&tzOffsetMinutes=${tzOffsetMinutes}`,
        headers: { cookie: owner.header }
      });
      assert.equal(reloaded.statusCode, 200);
      assert.equal(reloaded.json().closed.note, "Short day, but the draft moved.");
      assert.equal(reloaded.json().results[0].outcome, "partial");
    } finally {
      await restartedApp.close();
    }
  } finally {
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("B5 result and Daily Close work while the AI provider is unavailable", async () => {
  const app = buildApp({ databaseUrl, interpretation: {} });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const ids = await setupExecutionContext(database, ownerUserId);
    const actionId = await insertReadyAction(database, ownerUserId, ids, "Manual loop action");

    const recorded = await app.inject({
      method: "POST",
      url: `/v1/actions/${actionId}/result`,
      headers: { cookie: owner.header },
      payload: { outcome: "completed" }
    });
    assert.equal(recorded.statusCode, 201);

    const localDate = localDateFor(new Date(), 0);
    const closed = await app.inject({
      method: "POST",
      url: "/v1/daily-close",
      headers: { cookie: owner.header },
      payload: { localDate }
    });
    assert.equal(closed.statusCode, 201);
    assert.equal(closed.json().summary.completed, 1);
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});
