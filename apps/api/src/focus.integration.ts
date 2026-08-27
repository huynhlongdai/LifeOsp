import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseClient } from "@lifeos/db";
import { buildApp } from "./app.js";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./identity.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for B4 Focus integration tests");

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
    "insert into directions (user_id, title, status, confirmed_at) values ($1, 'B4 direction', 'active', now()) returning id",
    [userId]
  );
  const directionId = direction.rows[0]?.id;
  assert.ok(directionId);

  const season = await database.pool.query<{ id: string }>(
    "insert into seasons (user_id, direction_id, title, purpose, status, primary_focus_text) values ($1, $2, 'Focus season', 'Prove B4 focus loop.', 'active', 'Focus V0') returning id",
    [userId, directionId]
  );
  const seasonId = season.rows[0]?.id;
  assert.ok(seasonId);

  const outcome = await database.pool.query<{ id: string }>(
    "insert into outcomes (user_id, season_id, title, success_definition, status) values ($1, $2, 'Focus outcome', 'One focus session is captured.', 'active') returning id",
    [userId, seasonId]
  );
  const outcomeId = outcome.rows[0]?.id;
  assert.ok(outcomeId);

  const project = await database.pool.query<{ id: string }>(
    "insert into projects (user_id, outcome_id, title, status) values ($1, $2, 'Focus project', 'active') returning id",
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
     values ($1, $2, $3, $4, 'Focus session started and evidence preserved.', 30, 'ready', 5, now(), now()) returning id`,
    [userId, ids.outcomeId, ids.projectId, title]
  );
  const id = result.rows[0]?.id;
  assert.ok(id);
  return id;
}

async function createAcceptedNowRecommendation(app: App, database: Database, owner: SessionCookie, userId: string): Promise<{ actionId: string; recommendationId: string }> {
  const ids = await setupExecutionContext(database, userId);
  const actionId = await insertReadyAction(database, userId, ids, "Start B4 focus implementation");

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
  assert.equal(accepted.json().state, "ready");
  assert.equal(accepted.json().recommendation.status, "accepted");

  return { actionId, recommendationId };
}

async function deleteUsers(database: Database, userIds: Set<string>) {
  for (const userId of userIds) await database.pool.query("delete from users where id = $1", [userId]);
}

test("B4 starts Focus from accepted NOW recommendation and preserves Action state", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const stranger = await bootstrap(app);
    createdUserIds.add(await userIdForToken(database, stranger.token));

    const { actionId, recommendationId } = await createAcceptedNowRecommendation(app, database, owner, ownerUserId);

    const strangerStart = await app.inject({
      method: "POST",
      url: "/v1/focus/start",
      headers: { cookie: stranger.header },
      payload: { recommendationId }
    });
    assert.equal(strangerStart.statusCode, 404, "cross-owner recommendation cannot start Focus");

    const started = await app.inject({
      method: "POST",
      url: "/v1/focus/start",
      headers: { cookie: owner.header },
      payload: { recommendationId }
    });
    assert.equal(started.statusCode, 201);
    const focus = started.json();
    assert.equal(focus.status, "active");
    assert.equal(focus.actionId, actionId);
    assert.equal(focus.recommendationId, recommendationId);
    assert.equal(focus.plannedMinutes, 30);

    const duplicate = await app.inject({
      method: "POST",
      url: "/v1/focus/start",
      headers: { cookie: owner.header },
      payload: { recommendationId }
    });
    assert.equal(duplicate.statusCode, 409);
    assert.equal(duplicate.json().error, "active_focus_exists");

    const actionAfterStart = await database.pool.query<{ status: string }>("select status from actions where id = $1", [actionId]);
    assert.equal(actionAfterStart.rows[0]?.status, "ready", "Focus must not imply Action completion or active status");

    const state = await app.inject({ method: "GET", url: "/v1/focus", headers: { cookie: owner.header } });
    assert.equal(state.statusCode, 200);
    assert.equal(state.json().state, "active");
    assert.equal(state.json().focus.id, focus.id);

    const events = await database.pool.query<{ type: string; payload: { actionId?: string; recommendationId?: string } }>(
      "select type, payload from life_events where user_id = $1 and type = 'focus.started'",
      [ownerUserId]
    );
    assert.equal(events.rows.length, 1);
    assert.equal(events.rows[0]?.payload.actionId, actionId);
    assert.equal(events.rows[0]?.payload.recommendationId, recommendationId);
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("B4 captures distractions without changing Focus, Recommendation, or Action priority", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const { actionId, recommendationId } = await createAcceptedNowRecommendation(app, database, owner, ownerUserId);

    const started = await app.inject({
      method: "POST",
      url: "/v1/focus/start",
      headers: { cookie: owner.header },
      payload: { recommendationId }
    });
    assert.equal(started.statusCode, 201);
    const focusId = started.json().id as string;

    const distraction = await app.inject({
      method: "POST",
      url: `/v1/focus/${focusId}/distractions`,
      headers: { cookie: owner.header },
      payload: { rawText: "Remember to check deployment logs later" }
    });
    assert.equal(distraction.statusCode, 201);
    assert.equal(distraction.json().rawText, "Remember to check deployment logs later");
    assert.equal(distraction.json().focusSessionId, focusId);

    const persisted = await database.pool.query<{ kind: string; raw_text: string; processing_status: string }>(
      "select kind, raw_text, processing_status from captures where id = $1",
      [distraction.json().id]
    );
    assert.equal(persisted.rows[0]?.kind, "distraction");
    assert.equal(persisted.rows[0]?.raw_text, "Remember to check deployment logs later");
    assert.equal(persisted.rows[0]?.processing_status, "unprocessed");

    const unchanged = await database.pool.query<{ action_status: string; priority: number; focus_status: string; recommendation_status: string }>(
      `select actions.status as action_status, actions.priority, focus_sessions.status as focus_status, recommendations.status as recommendation_status
       from focus_sessions
       join actions on actions.id = focus_sessions.action_id
       join recommendations on recommendations.id = focus_sessions.recommendation_id
       where focus_sessions.id = $1`,
      [focusId]
    );
    assert.equal(unchanged.rows[0]?.action_status, "ready");
    assert.equal(unchanged.rows[0]?.priority, 5);
    assert.equal(unchanged.rows[0]?.focus_status, "active");
    assert.equal(unchanged.rows[0]?.recommendation_status, "accepted");

    const events = await database.pool.query<{ type: string; payload: { focusSessionId?: string; actionId?: string } }>(
      "select type, payload from life_events where user_id = $1 and type = 'distraction.captured'",
      [ownerUserId]
    );
    assert.equal(events.rows.length, 1);
    assert.equal(events.rows[0]?.payload.focusSessionId, focusId);
    assert.equal(events.rows[0]?.payload.actionId, actionId);
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("B4 ending Focus reloads recent session and never completes Action", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const { actionId, recommendationId } = await createAcceptedNowRecommendation(app, database, owner, ownerUserId);

    const started = await app.inject({
      method: "POST",
      url: "/v1/focus/start",
      headers: { cookie: owner.header },
      payload: { recommendationId }
    });
    assert.equal(started.statusCode, 201);
    const focusId = started.json().id as string;

    const ended = await app.inject({
      method: "POST",
      url: `/v1/focus/${focusId}/end`,
      headers: { cookie: owner.header },
      payload: { outcome: "interrupted" }
    });
    assert.equal(ended.statusCode, 200);
    assert.equal(ended.json().status, "interrupted");
    assert.ok(ended.json().endedAt);

    const actionAfterEnd = await database.pool.query<{ status: string; completed_at: Date | null }>(
      "select status, completed_at from actions where id = $1",
      [actionId]
    );
    assert.equal(actionAfterEnd.rows[0]?.status, "ready");
    assert.equal(actionAfterEnd.rows[0]?.completed_at, null);

    await app.close();
    const restartedApp = buildApp({ databaseUrl });
    try {
      const recent = await restartedApp.inject({ method: "GET", url: "/v1/focus", headers: { cookie: owner.header } });
      assert.equal(recent.statusCode, 200);
      assert.equal(recent.json().state, "recent");
      assert.equal(recent.json().focus.id, focusId);
      assert.equal(recent.json().focus.status, "interrupted");
    } finally {
      await restartedApp.close();
    }
  } finally {
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});
