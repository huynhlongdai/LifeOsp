import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseClient } from "@lifeos/db";
import { buildApp } from "./app.js";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./identity.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for ME integration tests");

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

async function deleteUsers(database: Database, userIds: Set<string>) {
  for (const userId of userIds) await database.pool.query("delete from users where id = $1", [userId]);
}

test("ME overview reports no Direction and every §14.1 section as unavailable for a fresh user", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    createdUserIds.add(await userIdForToken(database, owner.token));

    const response = await app.inject({ method: "GET", url: "/v1/me", headers: { cookie: owner.header } });
    assert.equal(response.statusCode, 200);
    const overview = response.json();

    assert.equal(overview.personalContext.hasDirection, false);
    assert.equal(overview.personalContext.activeOutcomeCount, 0);
    assert.deepEqual(
      new Set(overview.unavailableSections),
      new Set(["operatingPreferences", "patternCandidates", "personalizationStatus", "dataSources"])
    );
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("ME overview surfaces the confirmed Direction/Season and counts only active Outcomes", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);

    const direction = await database.pool.query<{ id: string }>(
      "insert into directions (user_id, title, status, confirmed_at) values ($1, 'ME test direction', 'active', now()) returning id",
      [ownerUserId]
    );
    const directionId = direction.rows[0]?.id;
    assert.ok(directionId);

    const season = await database.pool.query<{ id: string }>(
      "insert into seasons (user_id, direction_id, title, purpose, status, primary_focus_text) values ($1, $2, 'ME test season', 'Ship the ME page.', 'active', 'ME overview') returning id",
      [ownerUserId, directionId]
    );
    const seasonId = season.rows[0]?.id;
    assert.ok(seasonId);

    await database.pool.query(
      "insert into outcomes (user_id, season_id, title, status) values ($1, $2, 'Active outcome', 'active')",
      [ownerUserId, seasonId]
    );
    await database.pool.query(
      "insert into outcomes (user_id, season_id, title, status) values ($1, $2, 'Dropped outcome', 'dropped')",
      [ownerUserId, seasonId]
    );

    const response = await app.inject({ method: "GET", url: "/v1/me", headers: { cookie: owner.header } });
    assert.equal(response.statusCode, 200);
    const overview = response.json();

    assert.equal(overview.personalContext.hasDirection, true);
    assert.equal(overview.personalContext.directionTitle, "ME test direction");
    assert.equal(overview.personalContext.seasonTitle, "ME test season");
    assert.equal(overview.personalContext.primaryFocusText, "ME overview");
    assert.equal(overview.personalContext.activeOutcomeCount, 1, "the dropped Outcome must not count");
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("ME overview requires an active session", async () => {
  const app = buildApp({ databaseUrl });
  try {
    const response = await app.inject({ method: "GET", url: "/v1/me" });
    assert.equal(response.statusCode, 401);
  } finally {
    await app.close();
  }
});
