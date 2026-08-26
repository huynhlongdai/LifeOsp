import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseClient } from "@lifeos/db";
import { buildApp } from "./app.js";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./identity.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for Capture integration tests");
}

type App = ReturnType<typeof buildApp>;
type Database = ReturnType<typeof createDatabaseClient>;

function sessionCookieFromResponse(setCookieHeader: string | string[] | undefined): {
  header: string;
  token: string;
} {
  const setCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(setCookie, "expected Set-Cookie header");

  const match = new RegExp(`^${SESSION_COOKIE_NAME}=([^;]+)`).exec(setCookie);
  assert.ok(match?.[1], "expected LifeOS session cookie");

  const token = decodeURIComponent(match[1]);
  return {
    header: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    token
  };
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
  assert.ok(userId, "expected session-owned user");
  return userId;
}

async function deleteUsers(database: Database, userIds: Set<string>) {
  for (const userId of userIds) {
    await database.pool.query("delete from users where id = $1", [userId]);
  }
}

test("text Brain Dump persists exact raw input, emits one event, survives app restart and stays ownership-scoped", async () => {
  let app: App | null = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const unauthenticated = await app.inject({
      method: "POST",
      url: "/v1/captures",
      payload: { rawText: "private thought" }
    });
    assert.equal(unauthenticated.statusCode, 401);

    const firstCookie = await bootstrap(app);
    const firstUserId = await userIdForToken(database, firstCookie.token);
    createdUserIds.add(firstUserId);

    const blank = await app.inject({
      method: "POST",
      url: "/v1/captures",
      headers: { cookie: firstCookie.header },
      payload: { rawText: "   \n\t" }
    });
    assert.equal(blank.statusCode, 400);

    const clientSuppliedOwnership = await app.inject({
      method: "POST",
      url: "/v1/captures",
      headers: { cookie: firstCookie.header },
      payload: {
        rawText: "do not accept a client-selected owner",
        userId: "00000000-0000-0000-0000-000000000001"
      }
    });
    assert.equal(clientSuppliedOwnership.statusCode, 400);

    const rawText = "  I have too many open loops.\nI want to decide what matters first.  ";
    const created = await app.inject({
      method: "POST",
      url: "/v1/captures",
      headers: { cookie: firstCookie.header },
      payload: { rawText }
    });

    assert.equal(created.statusCode, 201);
    const createdBody = created.json();
    assert.equal(createdBody.kind, "text");
    assert.equal(createdBody.rawText, rawText);
    assert.equal(createdBody.processingStatus, "unprocessed");
    assert.match(createdBody.id, /^[0-9a-f-]{36}$/i);
    const captureId = createdBody.id as string;

    const persisted = await database.pool.query<{
      user_id: string;
      kind: string;
      raw_text: string;
      processing_status: string;
    }>(
      "select user_id, kind, raw_text, processing_status from captures where id = $1",
      [captureId]
    );
    assert.equal(persisted.rowCount, 1);
    assert.equal(persisted.rows[0]?.user_id, firstUserId);
    assert.equal(persisted.rows[0]?.kind, "text");
    assert.equal(persisted.rows[0]?.raw_text, rawText, "raw input must be stored byte-for-byte as submitted");
    assert.equal(persisted.rows[0]?.processing_status, "unprocessed");

    const events = await database.pool.query<{
      source: string;
      entity_type: string;
      entity_id: string;
      payload: unknown;
    }>(
      "select source, entity_type, entity_id, payload from life_events where user_id = $1 and type = 'capture.created' and entity_id = $2",
      [firstUserId, captureId]
    );
    assert.equal(events.rowCount, 1);
    assert.equal(events.rows[0]?.source, "user");
    assert.equal(events.rows[0]?.entity_type, "capture");
    assert.equal(events.rows[0]?.entity_id, captureId);
    assert.deepEqual(events.rows[0]?.payload, {
      kind: "text",
      processingStatus: "unprocessed"
    });
    assert.equal(JSON.stringify(events.rows[0]?.payload).includes(rawText), false, "event payload must not duplicate rawText");

    const sameOwnerRead = await app.inject({
      method: "GET",
      url: `/v1/captures/${captureId}`,
      headers: { cookie: firstCookie.header }
    });
    assert.equal(sameOwnerRead.statusCode, 200);
    assert.equal(sameOwnerRead.json().rawText, rawText);

    const invalidId = await app.inject({
      method: "GET",
      url: "/v1/captures/not-a-uuid",
      headers: { cookie: firstCookie.header }
    });
    assert.equal(invalidId.statusCode, 400);

    const secondCookie = await bootstrap(app);
    const secondUserId = await userIdForToken(database, secondCookie.token);
    createdUserIds.add(secondUserId);

    const crossOwnerRead = await app.inject({
      method: "GET",
      url: `/v1/captures/${captureId}`,
      headers: { cookie: secondCookie.header }
    });
    assert.equal(crossOwnerRead.statusCode, 404, "another session must not be able to read the Capture");

    await app.close();
    app = buildApp({ databaseUrl });

    const afterRestart = await app.inject({
      method: "GET",
      url: `/v1/captures/${captureId}`,
      headers: { cookie: firstCookie.header }
    });
    assert.equal(afterRestart.statusCode, 200);
    assert.equal(afterRestart.json().rawText, rawText, "raw input must survive application restart unchanged");
  } finally {
    if (app) {
      await app.close();
    }
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("Capture creation rolls back when capture.created LifeEvent persistence fails", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();
  const rawText = "this Capture must roll back with its event";

  try {
    const cookie = await bootstrap(app);
    const userId = await userIdForToken(database, cookie.token);
    createdUserIds.add(userId);

    await database.pool.query(`
      create or replace function test_fail_capture_created_event()
      returns trigger
      language plpgsql
      as $$
      begin
        if new.type = 'capture.created' then
          raise exception 'forced capture.created failure';
        end if;
        return new;
      end;
      $$
    `);
    await database.pool.query(`
      create trigger test_fail_capture_created_event_trigger
      before insert on life_events
      for each row execute function test_fail_capture_created_event()
    `);

    const response = await app.inject({
      method: "POST",
      url: "/v1/captures",
      headers: { cookie: cookie.header },
      payload: { rawText }
    });
    assert.equal(response.statusCode, 500);

    const captures = await database.pool.query<{ count: string }>(
      "select count(*)::text as count from captures where user_id = $1 and raw_text = $2",
      [userId, rawText]
    );
    assert.equal(captures.rows[0]?.count, "0", "failed event insert must roll back Capture insert");
  } finally {
    await database.pool.query("drop trigger if exists test_fail_capture_created_event_trigger on life_events");
    await database.pool.query("drop function if exists test_fail_capture_created_event()");
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
    await app.close();
  }
});
