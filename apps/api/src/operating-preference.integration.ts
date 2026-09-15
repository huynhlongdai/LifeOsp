import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseClient } from "@lifeos/db";
import { buildApp } from "./app.js";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./identity.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for Operating Preference integration tests");

type App = ReturnType<typeof buildApp>;
type Database = ReturnType<typeof createDatabaseClient>;
type SessionCookie = { header: string; token: string };

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

async function insertPreference(database: Database, userId: string, key: string, value: number): Promise<string> {
  const result = await database.pool.query<{ id: string }>(
    "insert into operating_preferences (user_id, key, value, source, status) values ($1, $2, $3, 'explicit_user', 'active') returning id",
    [userId, key, value]
  );
  const id = result.rows[0]?.id;
  assert.ok(id);
  return id;
}

async function deleteUsers(database: Database, userIds: Set<string>) {
  for (const userId of userIds) await database.pool.query("delete from users where id = $1", [userId]);
}

test("Operating Preferences can be edited, disabled and deleted, and never leak or apply across users", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const stranger = await bootstrap(app);
    createdUserIds.add(await userIdForToken(database, stranger.token));

    const preferenceId = await insertPreference(database, ownerUserId, "next_action.target_max_minutes", 45);

    const strangerEdit = await app.inject({
      method: "PATCH",
      url: `/v1/operating-preferences/${preferenceId}`,
      headers: { cookie: stranger.header },
      payload: { value: 10 }
    });
    assert.equal(strangerEdit.statusCode, 404, "a stranger cannot edit someone else's preference");

    const edit = await app.inject({
      method: "PATCH",
      url: `/v1/operating-preferences/${preferenceId}`,
      headers: { cookie: owner.header },
      payload: { value: 30 }
    });
    assert.equal(edit.statusCode, 200);
    assert.equal(edit.json().value, 30);

    const invalidEdit = await app.inject({
      method: "PATCH",
      url: `/v1/operating-preferences/${preferenceId}`,
      headers: { cookie: owner.header },
      payload: { value: 4 }
    });
    assert.equal(invalidEdit.statusCode, 400, "5-480 is the valid range for this key");

    const disable = await app.inject({
      method: "PATCH",
      url: `/v1/operating-preferences/${preferenceId}`,
      headers: { cookie: owner.header },
      payload: { status: "disabled" }
    });
    assert.equal(disable.statusCode, 200);
    assert.equal(disable.json().status, "disabled");

    const list = await app.inject({ method: "GET", url: "/v1/operating-preferences", headers: { cookie: owner.header } });
    assert.equal(list.statusCode, 200);
    assert.equal(list.json().preferences.length, 1);

    const strangerList = await app.inject({ method: "GET", url: "/v1/operating-preferences", headers: { cookie: stranger.header } });
    assert.equal(strangerList.json().preferences.length, 0);

    const strangerDelete = await app.inject({
      method: "DELETE",
      url: `/v1/operating-preferences/${preferenceId}`,
      headers: { cookie: stranger.header }
    });
    assert.equal(strangerDelete.statusCode, 404);

    const del = await app.inject({
      method: "DELETE",
      url: `/v1/operating-preferences/${preferenceId}`,
      headers: { cookie: owner.header }
    });
    assert.equal(del.statusCode, 200);
    assert.equal(del.json().status, "deleted");

    const finalList = await app.inject({ method: "GET", url: "/v1/operating-preferences", headers: { cookie: owner.header } });
    assert.equal(finalList.json().preferences.length, 0);
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("A disabled Operating Preference does not influence Next Action ranking", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);

    const direction = await database.pool.query<{ id: string }>(
      "insert into directions (user_id, title, status, confirmed_at) values ($1, 'Pref test direction', 'active', now()) returning id",
      [ownerUserId]
    );
    const season = await database.pool.query<{ id: string }>(
      "insert into seasons (user_id, direction_id, title, purpose, status, primary_focus_text) values ($1, $2, 'Pref test season', 'x', 'active', 'x') returning id",
      [ownerUserId, direction.rows[0]?.id]
    );
    const outcome = await database.pool.query<{ id: string }>(
      "insert into outcomes (user_id, season_id, title, status) values ($1, $2, 'Pref outcome', 'active') returning id",
      [ownerUserId, season.rows[0]?.id]
    );
    await database.pool.query(
      `insert into actions (user_id, outcome_id, title, done_condition, estimated_minutes, status, created_at, updated_at)
       values ($1, $2, 'Pref ranking action', 'Done.', 20, 'ready', now(), now())`,
      [ownerUserId, outcome.rows[0]?.id]
    );
    await insertPreference(database, ownerUserId, "next_action.target_max_minutes", 45);
    await database.pool.query("update operating_preferences set status = 'disabled' where user_id = $1", [ownerUserId]);

    const generated = await app.inject({
      method: "POST",
      url: "/v1/recommendations/next-action",
      headers: { cookie: owner.header }
    });
    assert.equal(generated.statusCode, 200, JSON.stringify(generated.json()));
    const durationFactor = generated
      .json()
      .factors.find((factor: { key: string }) => factor.key === "duration_preference");
    assert.equal(durationFactor, undefined, "a disabled preference must not affect ranking");
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("Operating Preference routes require an active session", async () => {
  const app = buildApp({ databaseUrl });
  try {
    const list = await app.inject({ method: "GET", url: "/v1/operating-preferences" });
    assert.equal(list.statusCode, 401);
  } finally {
    await app.close();
  }
});
