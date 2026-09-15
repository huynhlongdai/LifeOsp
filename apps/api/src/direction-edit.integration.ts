import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseClient } from "@lifeos/db";
import { buildApp } from "./app.js";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./identity.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for Direction edit integration tests");

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

async function confirmDirection(database: Database, userId: string): Promise<{ directionId: string; seasonId: string }> {
  const direction = await database.pool.query<{ id: string }>(
    "insert into directions (user_id, title, description, status, confirmed_at) values ($1, 'Original title', 'Original description', 'active', now()) returning id",
    [userId]
  );
  const directionId = direction.rows[0]?.id;
  assert.ok(directionId);

  const season = await database.pool.query<{ id: string }>(
    "insert into seasons (user_id, direction_id, title, purpose, status, primary_focus_text) values ($1, $2, 'Direction edit test season', 'Ship the edit.', 'active', 'Direction edit') returning id",
    [userId, directionId]
  );
  const seasonId = season.rows[0]?.id;
  assert.ok(seasonId);

  return { directionId, seasonId };
}

async function deleteUsers(database: Database, userIds: Set<string>) {
  for (const userId of userIds) await database.pool.query("delete from users where id = $1", [userId]);
}

test("Editing the current Direction updates title/description, logs an audit event, and never leaks across users", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const stranger = await bootstrap(app);
    createdUserIds.add(await userIdForToken(database, stranger.token));

    const { directionId } = await confirmDirection(database, ownerUserId);

    const edit = await app.inject({
      method: "PATCH",
      url: "/v1/direction/current",
      headers: { cookie: owner.header },
      payload: { title: "Renamed direction", description: "Updated description" }
    });
    assert.equal(edit.statusCode, 200, JSON.stringify(edit.json()));
    assert.equal(edit.json().direction.title, "Renamed direction");
    assert.equal(edit.json().direction.description, "Updated description");

    const reload = await app.inject({ method: "GET", url: "/v1/direction/current", headers: { cookie: owner.header } });
    assert.equal(reload.statusCode, 200);
    assert.equal(reload.json().direction.title, "Renamed direction");

    const events = await database.pool.query<{ payload: { previousTitle: string } }>(
      "select payload from life_events where user_id = $1 and type = 'direction.edited'",
      [ownerUserId]
    );
    assert.equal(events.rows.length, 1);
    assert.equal(events.rows[0]?.payload.previousTitle, "Original title");

    const strangerEdit = await app.inject({
      method: "PATCH",
      url: "/v1/direction/current",
      headers: { cookie: stranger.header },
      payload: { title: "Should not apply" }
    });
    assert.equal(strangerEdit.statusCode, 404, "a stranger with no confirmed Direction cannot edit one");

    const strangerReload = await app.inject({ method: "GET", url: "/v1/direction/current", headers: { cookie: owner.header } });
    assert.equal(strangerReload.json().direction.id, directionId, "the owner's Direction is untouched by the stranger's attempt");
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("Editing the current Direction rejects a blank title and requires an active session", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    await confirmDirection(database, ownerUserId);

    const blank = await app.inject({
      method: "PATCH",
      url: "/v1/direction/current",
      headers: { cookie: owner.header },
      payload: { title: "   " }
    });
    assert.equal(blank.statusCode, 400);

    const unauthenticated = await app.inject({ method: "PATCH", url: "/v1/direction/current", payload: { title: "x" } });
    assert.equal(unauthenticated.statusCode, 401);
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});
