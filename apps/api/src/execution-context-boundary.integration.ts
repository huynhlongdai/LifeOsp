import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseClient } from "@lifeos/db";
import { buildApp } from "./app.js";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./identity.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for B0 execution-context boundary tests");

type App = ReturnType<typeof buildApp>;
type Database = ReturnType<typeof createDatabaseClient>;

function sessionCookieFromResponse(setCookieHeader: string | string[] | undefined): { header: string; token: string } {
  const setCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(setCookie);
  const match = new RegExp(`^${SESSION_COOKIE_NAME}=([^;]+)`).exec(setCookie);
  assert.ok(match?.[1]);
  const token = decodeURIComponent(match[1]);
  return { header: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`, token };
}

async function bootstrap(app: App) {
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

async function createActiveSeason(database: Database, userId: string): Promise<string> {
  const direction = await database.pool.query<{ id: string }>(
    "insert into directions (user_id, title, status, confirmed_at) values ($1, 'B0 boundary direction', 'active', now()) returning id",
    [userId]
  );
  const directionId = direction.rows[0]?.id;
  assert.ok(directionId);
  const season = await database.pool.query<{ id: string }>(
    "insert into seasons (user_id, direction_id, title, purpose, status) values ($1, $2, 'B0 boundary season', 'Validate explicit execution context', 'active') returning id",
    [userId, directionId]
  );
  const seasonId = season.rows[0]?.id;
  assert.ok(seasonId);
  return seasonId;
}

test("B0 rejects client-supplied ownership and supports explicit Outcome without inventing a Project", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  let userId: string | null = null;

  try {
    const owner = await bootstrap(app);
    userId = await userIdForToken(database, owner.token);
    const seasonId = await createActiveSeason(database, userId);

    const forgedOwnership = await app.inject({
      method: "POST",
      url: "/v1/execution-context",
      headers: { cookie: owner.header },
      payload: {
        userId: "11111111-1111-4111-8111-111111111111",
        seasonId,
        outcome: { title: "Must not be accepted" }
      }
    });
    assert.equal(forgedOwnership.statusCode, 400, "ownership must come only from the server-side session");

    const afterForgedRequest = await database.pool.query<{ count: string }>(
      "select count(*)::text as count from outcomes where user_id = $1",
      [userId]
    );
    assert.equal(afterForgedRequest.rows[0]?.count, "0");

    const outcomeOnly = await app.inject({
      method: "POST",
      url: "/v1/execution-context",
      headers: { cookie: owner.header },
      payload: {
        seasonId,
        outcome: {
          title: "Prove one useful result",
          successDefinition: "One explicit Outcome exists without an invented Project."
        }
      }
    });
    assert.equal(outcomeOnly.statusCode, 201);
    assert.equal(outcomeOnly.json().outcome.status, "active");
    assert.equal(Object.hasOwn(outcomeOnly.json(), "project"), false);

    const state = await database.pool.query<{ outcomes: string; projects: string; outcome_events: string; project_events: string }>(
      `select
         (select count(*)::text from outcomes where user_id = $1) as outcomes,
         (select count(*)::text from projects where user_id = $1) as projects,
         (select count(*)::text from life_events where user_id = $1 and type = 'outcome.created') as outcome_events,
         (select count(*)::text from life_events where user_id = $1 and type = 'project.started') as project_events`,
      [userId]
    );
    assert.deepEqual(state.rows[0], {
      outcomes: "1",
      projects: "0",
      outcome_events: "1",
      project_events: "0"
    });
  } finally {
    if (userId) await database.pool.query("delete from users where id = $1", [userId]);
    await database.pool.end();
    await app.close();
  }
});
