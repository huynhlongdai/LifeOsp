import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseClient } from "@lifeos/db";
import { buildApp } from "./app.js";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./identity.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for Insight integration tests");

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
    "insert into directions (user_id, title, status, confirmed_at) values ($1, 'Insight test direction', 'active', now()) returning id",
    [userId]
  );
  const directionId = direction.rows[0]?.id;
  assert.ok(directionId);
  const season = await database.pool.query<{ id: string }>(
    "insert into seasons (user_id, direction_id, title, purpose, status, primary_focus_text) values ($1, $2, 'Insight test season', 'Ship it.', 'active', 'Insight') returning id",
    [userId, directionId]
  );
  const seasonId = season.rows[0]?.id;
  assert.ok(seasonId);
  const outcome = await database.pool.query<{ id: string }>(
    "insert into outcomes (user_id, season_id, title, status) values ($1, $2, 'Insight outcome', 'active') returning id",
    [userId, seasonId]
  );
  const outcomeId = outcome.rows[0]?.id;
  assert.ok(outcomeId);
  const project = await database.pool.query<{ id: string }>(
    "insert into projects (user_id, outcome_id, title, status) values ($1, $2, 'Insight project', 'active') returning id",
    [userId, outcomeId]
  );
  const projectId = project.rows[0]?.id;
  assert.ok(projectId);
  return { seasonId, outcomeId, projectId };
}

async function insertActionWithResult(
  database: Database,
  userId: string,
  ids: ExecutionIds,
  estimatedMinutes: number,
  result: "completed" | "postponed"
): Promise<void> {
  const action = await database.pool.query<{ id: string }>(
    `insert into actions (user_id, outcome_id, project_id, title, done_condition, estimated_minutes, status, created_at, updated_at)
     values ($1, $2, $3, 'Insight test action.', 'Insight test action done.', $4, $5, now(), now()) returning id`,
    [userId, ids.outcomeId, ids.projectId, estimatedMinutes, result === "completed" ? "completed" : "ready"]
  );
  const actionId = action.rows[0]?.id;
  assert.ok(actionId);
  await database.pool.query(
    `insert into action_results (user_id, action_id, result, recorded_at) values ($1, $2, $3, now())`,
    [userId, actionId, result]
  );
}

async function deleteUsers(database: Database, userIds: Set<string>) {
  for (const userId of userIds) await database.pool.query("delete from users where id = $1", [userId]);
}

async function seedDurationPatternEvidence(database: Database, userId: string, ids: ExecutionIds): Promise<void> {
  for (let index = 0; index < 6; index += 1) await insertActionWithResult(database, userId, ids, 20, "completed");
  for (let index = 0; index < 6; index += 1) await insertActionWithResult(database, userId, ids, 90, "postponed");
}

test("GET /v1/insights detects the duration/completion pattern, persists it, and never regenerates after resolution", async () => {
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
    await seedDurationPatternEvidence(database, ownerUserId, ids);

    const list = await app.inject({ method: "GET", url: "/v1/insights", headers: { cookie: owner.header } });
    assert.equal(list.statusCode, 200);
    const candidates = list.json().candidates;
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].patternKey, "duration_completion_rate");
    assert.equal(candidates[0].proposedPreference.key, "next_action.target_max_minutes");
    assert.equal(candidates[0].proposedPreference.value, 45);
    assert.equal(typeof candidates[0].proposedPreference.effect, "string");
    assert.ok(candidates[0].proposedPreference.effect.length > 0, "spec §13.5 requires an effect preview");
    const insightId = candidates[0].id as string;

    const strangerList = await app.inject({ method: "GET", url: "/v1/insights", headers: { cookie: stranger.header } });
    assert.equal(strangerList.statusCode, 200);
    assert.equal(strangerList.json().candidates.length, 0, "evidence never leaks across users");

    const resolve = await app.inject({
      method: "POST",
      url: `/v1/insights/${insightId}/resolve`,
      headers: { cookie: owner.header },
      payload: { resolution: "reject" }
    });
    assert.equal(resolve.statusCode, 200);
    assert.equal(resolve.json().status, "rejected");

    const relist = await app.inject({ method: "GET", url: "/v1/insights", headers: { cookie: owner.header } });
    assert.equal(relist.statusCode, 200);
    assert.equal(relist.json().candidates.length, 0, "a rejected Insight is never regenerated for the same patternKey");

    const doubleResolve = await app.inject({
      method: "POST",
      url: `/v1/insights/${insightId}/resolve`,
      headers: { cookie: owner.header },
      payload: { resolution: "confirm" }
    });
    assert.equal(doubleResolve.statusCode, 409);
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("Confirming an Insight creates an active Operating Preference, and partly_accurate stores the edited value", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const ids = await setupExecutionContext(database, ownerUserId);
    await seedDurationPatternEvidence(database, ownerUserId, ids);

    const list = await app.inject({ method: "GET", url: "/v1/insights", headers: { cookie: owner.header } });
    const insightId = list.json().candidates[0].id as string;

    const resolve = await app.inject({
      method: "POST",
      url: `/v1/insights/${insightId}/resolve`,
      headers: { cookie: owner.header },
      payload: { resolution: "partly_accurate", editedValue: 30 }
    });
    assert.equal(resolve.statusCode, 200, JSON.stringify(resolve.json()));
    assert.equal(resolve.json().status, "corrected");

    const preferences = await app.inject({ method: "GET", url: "/v1/operating-preferences", headers: { cookie: owner.header } });
    assert.equal(preferences.statusCode, 200);
    const pref = preferences.json().preferences.find((p: { key: string }) => p.key === "next_action.target_max_minutes");
    assert.ok(pref, "expected a stored preference");
    assert.equal(pref.value, 30, "partly_accurate must store the edited value, not the proposed one");
    assert.equal(pref.source, "confirmed_insight");
    assert.equal(pref.status, "active");

    const events = await database.pool.query<{ type: string }>(
      "select type from life_events where user_id = $1 and type = 'insight.resolved'",
      [ownerUserId]
    );
    assert.equal(events.rows.length, 1);
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("A confirmed duration preference influences Next Action ranking via an explainable factor", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const ids = await setupExecutionContext(database, ownerUserId);
    await seedDurationPatternEvidence(database, ownerUserId, ids);

    const list = await app.inject({ method: "GET", url: "/v1/insights", headers: { cookie: owner.header } });
    const insightId = list.json().candidates[0].id as string;
    await app.inject({
      method: "POST",
      url: `/v1/insights/${insightId}/resolve`,
      headers: { cookie: owner.header },
      payload: { resolution: "confirm" }
    });

    await database.pool.query(
      `insert into actions (user_id, outcome_id, project_id, title, done_condition, estimated_minutes, status, created_at, updated_at)
       values ($1, $2, $3, 'Ranking candidate within target', 'Done.', 20, 'ready', now(), now())`,
      [ownerUserId, ids.outcomeId, ids.projectId]
    );

    const generated = await app.inject({
      method: "POST",
      url: "/v1/recommendations/next-action",
      headers: { cookie: owner.header }
    });
    assert.equal(generated.statusCode, 200, JSON.stringify(generated.json()));
    const durationFactor = generated
      .json()
      .factors.find((factor: { key: string }) => factor.key === "duration_preference");
    assert.ok(durationFactor, "expected the confirmed preference to appear as an explainable ranking factor");
    assert.equal(durationFactor.value.targetMaxMinutes, 45);
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("GET/POST insight routes require an active session", async () => {
  const app = buildApp({ databaseUrl });
  try {
    const list = await app.inject({ method: "GET", url: "/v1/insights" });
    assert.equal(list.statusCode, 401);
    const resolve = await app.inject({
      method: "POST",
      url: "/v1/insights/00000000-0000-0000-0000-000000000000/resolve",
      payload: { resolution: "confirm" }
    });
    assert.equal(resolve.statusCode, 401);
  } finally {
    await app.close();
  }
});
