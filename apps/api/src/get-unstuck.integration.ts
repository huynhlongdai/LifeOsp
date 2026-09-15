import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseClient } from "@lifeos/db";
import { buildApp } from "./app.js";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./identity.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for Get Unstuck integration tests");

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
    "insert into directions (user_id, title, status, confirmed_at) values ($1, 'Get Unstuck direction', 'active', now()) returning id",
    [userId]
  );
  const directionId = direction.rows[0]?.id;
  assert.ok(directionId);

  const season = await database.pool.query<{ id: string }>(
    "insert into seasons (user_id, direction_id, title, purpose, status, primary_focus_text) values ($1, $2, 'Get Unstuck season', 'Prove the get-unstuck loop.', 'active', 'Get Unstuck V0') returning id",
    [userId, directionId]
  );
  const seasonId = season.rows[0]?.id;
  assert.ok(seasonId);

  const outcome = await database.pool.query<{ id: string }>(
    "insert into outcomes (user_id, season_id, title, success_definition, status) values ($1, $2, 'Get Unstuck outcome', 'A stuck action gets unstuck.', 'active') returning id",
    [userId, seasonId]
  );
  const outcomeId = outcome.rows[0]?.id;
  assert.ok(outcomeId);

  const project = await database.pool.query<{ id: string }>(
    "insert into projects (user_id, outcome_id, title, status) values ($1, $2, 'Get Unstuck project', 'active') returning id",
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
  blockedReason: string | null = null
): Promise<string> {
  const result = await database.pool.query<{ id: string }>(
    `insert into actions
      (user_id, outcome_id, project_id, title, done_condition, estimated_minutes, status, blocked_reason, priority, created_at, updated_at)
     values ($1, $2, $3, $4, 'Get Unstuck test action.', 60, $5, $6, 5, now(), now()) returning id`,
    [userId, ids.outcomeId, ids.projectId, title, status, blockedReason]
  );
  const id = result.rows[0]?.id;
  assert.ok(id);
  return id;
}

async function recordResult(app: App, owner: SessionCookie, actionId: string, result: string) {
  const payload: Record<string, unknown> = { result };
  if (result === "blocked") payload.blockedReason = "Waiting on something external.";
  const response = await app.inject({
    method: "POST",
    url: `/v1/actions/${actionId}/result`,
    headers: { cookie: owner.header },
    payload
  });
  assert.equal(response.statusCode, 201, JSON.stringify(response.json()));
}

async function deleteUsers(database: Database, userIds: Set<string>) {
  for (const userId of userIds) await database.pool.query("delete from users where id = $1", [userId]);
}

test("Get Unstuck surfaces evidence-qualifying Actions and hides everything else", async () => {
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

    const freshReady = await insertAction(database, ownerUserId, ids, "Freshly ready action", "ready");
    const blockedAction = await insertAction(database, ownerUserId, ids, "Blocked once is already evidence", "blocked", "Waiting on legal.");

    const repeatedlyDelayed = await insertAction(database, ownerUserId, ids, "Postponed twice via revive", "ready");
    await recordResult(app, owner, repeatedlyDelayed, "postponed");
    const revive1 = await app.inject({ method: "POST", url: `/v1/actions/${repeatedlyDelayed}/get-unstuck/revive`, headers: { cookie: owner.header } });
    assert.equal(revive1.statusCode, 200);
    assert.equal(revive1.json().status, "ready");
    await recordResult(app, owner, repeatedlyDelayed, "postponed");

    const list = await app.inject({ method: "GET", url: "/v1/get-unstuck", headers: { cookie: owner.header } });
    assert.equal(list.statusCode, 200);
    const ids_ = list.json().candidates.map((c: { action: { id: string } }) => c.action.id);
    assert.ok(!ids_.includes(freshReady), "a fresh ready Action is not stuck");
    assert.ok(ids_.includes(blockedAction), "a blocked Action is evidence on its own");
    assert.ok(ids_.includes(repeatedlyDelayed), "two postponements across a revive cycle qualify");
    assert.equal(list.json().candidates[0].action.id, blockedAction, "blocked sorts first");

    const strangerList = await app.inject({ method: "GET", url: "/v1/get-unstuck", headers: { cookie: stranger.header } });
    assert.equal(strangerList.statusCode, 200);
    assert.equal(strangerList.json().candidates.length, 0, "facts never leak across users");
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("Get Unstuck never diagnoses before evidence, and resolves through one explicit intervention", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const ids = await setupExecutionContext(database, ownerUserId);

    const freshReady = await insertAction(database, ownerUserId, ids, "Not stuck yet", "ready");
    const tooEarly = await app.inject({
      method: "POST",
      url: `/v1/actions/${freshReady}/get-unstuck/diagnose`,
      headers: { cookie: owner.header },
      payload: { friction: "too_large" }
    });
    assert.equal(tooEarly.statusCode, 409);
    assert.equal(tooEarly.json().error, "not_stuck");

    const blockedAction = await insertAction(database, ownerUserId, ids, "Create launch strategy", "blocked", "Waiting on legal.");

    const badFriction = await app.inject({
      method: "POST",
      url: `/v1/actions/${blockedAction}/get-unstuck/diagnose`,
      headers: { cookie: owner.header },
      payload: { friction: "invented" }
    });
    assert.equal(badFriction.statusCode, 400);

    const diagnosis = await app.inject({
      method: "POST",
      url: `/v1/actions/${blockedAction}/get-unstuck/diagnose`,
      headers: { cookie: owner.header },
      payload: { friction: "too_large" }
    });
    assert.equal(diagnosis.statusCode, 201);
    const diagnosisBody = diagnosis.json();
    assert.equal(diagnosisBody.friction, "too_large");
    assert.equal(diagnosisBody.intervention, "resize");
    assert.equal(diagnosisBody.canRevive, true);
    assert.equal(diagnosisBody.canRecordResult, false);

    const resize = await app.inject({
      method: "POST",
      url: `/v1/actions/${blockedAction}/get-unstuck/edit`,
      headers: { cookie: owner.header },
      payload: { intervention: "resize", title: "List the 3 launch audiences we would test first", estimatedMinutes: 15 }
    });
    assert.equal(resize.statusCode, 200);
    assert.equal(resize.json().title, "List the 3 launch audiences we would test first");
    assert.equal(resize.json().status, "blocked", "editing text alone must not silently change status");

    const revive = await app.inject({ method: "POST", url: `/v1/actions/${blockedAction}/get-unstuck/revive`, headers: { cookie: owner.header } });
    assert.equal(revive.statusCode, 200);
    assert.equal(revive.json().status, "ready");
    assert.equal(revive.json().blockedReason, undefined, "revive clears the old blocked reason");

    const events = await database.pool.query<{ type: string }>(
      "select type from life_events where user_id = $1 and type like 'get_unstuck.%' order by occurred_at",
      [ownerUserId]
    );
    assert.deepEqual(events.rows.map((row) => row.type), [
      "get_unstuck.friction_selected",
      "get_unstuck.intervention_applied",
      "get_unstuck.intervention_applied"
    ]);

    const doubleRevive = await app.inject({ method: "POST", url: `/v1/actions/${blockedAction}/get-unstuck/revive`, headers: { cookie: owner.header } });
    assert.equal(doubleRevive.statusCode, 409, "a ready Action cannot be revived again");
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});
