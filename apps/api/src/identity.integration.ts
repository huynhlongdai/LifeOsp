import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseClient } from "@lifeos/db";
import type { FastifyRequest } from "fastify";
import { buildApp } from "./app.js";
import { hashSessionToken, resolveActorUserId, SESSION_COOKIE_NAME } from "./identity.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for identity integration tests");
}

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

function requestWithCookie(cookie: string): FastifyRequest {
  return { headers: { cookie } } as unknown as FastifyRequest;
}

async function deleteUsers(database: ReturnType<typeof createDatabaseClient>, userIds: Set<string>) {
  for (const userId of userIds) {
    await database.pool.query("delete from users where id = $1", [userId]);
  }
}

test("anonymous session bootstrap stores only token hash and isolates browser actors", async () => {
  const app = buildApp({ databaseUrl, identity: { cookieSecure: true } });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const firstBootstrap = await app.inject({ method: "POST", url: "/v1/session/bootstrap" });
    assert.equal(firstBootstrap.statusCode, 201);
    assert.deepEqual(firstBootstrap.json().status, "active");

    const firstCookie = sessionCookieFromResponse(firstBootstrap.headers["set-cookie"]);
    const setCookie = Array.isArray(firstBootstrap.headers["set-cookie"])
      ? firstBootstrap.headers["set-cookie"][0]
      : firstBootstrap.headers["set-cookie"];
    assert.match(setCookie ?? "", /HttpOnly/);
    assert.match(setCookie ?? "", /SameSite=Lax/);
    assert.match(setCookie ?? "", /Secure/);

    const firstHash = hashSessionToken(firstCookie.token);
    const firstSessionResult = await database.pool.query<{ user_id: string; token_hash: string }>(
      "select user_id, token_hash from sessions where token_hash = $1",
      [firstHash]
    );
    assert.equal(firstSessionResult.rowCount, 1);
    const firstUserId = firstSessionResult.rows[0]?.user_id;
    assert.ok(firstUserId);
    createdUserIds.add(firstUserId);
    assert.equal(firstSessionResult.rows[0]?.token_hash, firstHash);

    const rawTokenResult = await database.pool.query("select token_hash from sessions where token_hash = $1", [
      firstCookie.token
    ]);
    assert.equal(rawTokenResult.rowCount, 0, "raw session token must never be persisted");

    const actorUserId = await resolveActorUserId(requestWithCookie(firstCookie.header), database, new Date());
    assert.equal(actorUserId, firstUserId, "private routes must derive ownership only from the server session");

    const invalidActor = await resolveActorUserId(
      requestWithCookie(`${SESSION_COOKIE_NAME}=invalid-token`),
      database,
      new Date()
    );
    assert.equal(invalidActor, null);

    const firstStatus = await app.inject({
      method: "GET",
      url: "/v1/session",
      headers: { cookie: firstCookie.header }
    });
    assert.equal(firstStatus.statusCode, 200);
    assert.equal(firstStatus.json().status, "active");

    const repeatedBootstrap = await app.inject({
      method: "POST",
      url: "/v1/session/bootstrap",
      headers: { cookie: firstCookie.header }
    });
    assert.equal(repeatedBootstrap.statusCode, 200);
    assert.equal(repeatedBootstrap.headers["set-cookie"], undefined);

    const secondBootstrap = await app.inject({ method: "POST", url: "/v1/session/bootstrap" });
    assert.equal(secondBootstrap.statusCode, 201);
    const secondCookie = sessionCookieFromResponse(secondBootstrap.headers["set-cookie"]);
    const secondHash = hashSessionToken(secondCookie.token);
    assert.notEqual(secondHash, firstHash);

    const secondSessionResult = await database.pool.query<{ user_id: string }>(
      "select user_id from sessions where token_hash = $1",
      [secondHash]
    );
    assert.equal(secondSessionResult.rowCount, 1);
    const secondUserId = secondSessionResult.rows[0]?.user_id;
    assert.ok(secondUserId);
    createdUserIds.add(secondUserId);
    assert.notEqual(secondUserId, firstUserId, "each anonymous browser must own a distinct user");

    const invalidStatus = await app.inject({
      method: "GET",
      url: "/v1/session",
      headers: { cookie: `${SESSION_COOKIE_NAME}=invalid-token` }
    });
    assert.equal(invalidStatus.statusCode, 401);
    assert.deepEqual(invalidStatus.json(), { status: "unauthenticated" });

    const expiredUser = await database.pool.query<{ id: string }>("insert into users default values returning id");
    const expiredUserId = expiredUser.rows[0]?.id;
    assert.ok(expiredUserId);
    createdUserIds.add(expiredUserId);

    const expiredToken = `expired-${"x".repeat(40)}`;
    await database.pool.query(
      "insert into sessions (token_hash, user_id, expires_at) values ($1, $2, now() - interval '1 minute')",
      [hashSessionToken(expiredToken), expiredUserId]
    );

    const expiredStatus = await app.inject({
      method: "GET",
      url: "/v1/session",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${expiredToken}` }
    });
    assert.equal(expiredStatus.statusCode, 401);
  } finally {
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
    await app.close();
  }
});

test("user creation rolls back when session persistence fails", async () => {
  const collisionToken = `collision-${"y".repeat(40)}`;
  const app = buildApp({
    databaseUrl,
    identity: {
      tokenFactory: () => collisionToken
    }
  });
  const database = createDatabaseClient(databaseUrl);
  const collisionHash = hashSessionToken(collisionToken);
  let createdUserId: string | undefined;

  try {
    const first = await app.inject({ method: "POST", url: "/v1/session/bootstrap" });
    assert.equal(first.statusCode, 201);

    const persisted = await database.pool.query<{ user_id: string }>(
      "select user_id from sessions where token_hash = $1",
      [collisionHash]
    );
    createdUserId = persisted.rows[0]?.user_id;
    assert.ok(createdUserId);

    const before = await database.pool.query<{ count: string }>("select count(*)::text as count from users");
    const second = await app.inject({ method: "POST", url: "/v1/session/bootstrap" });
    assert.equal(second.statusCode, 500);
    const after = await database.pool.query<{ count: string }>("select count(*)::text as count from users");

    assert.equal(after.rows[0]?.count, before.rows[0]?.count, "failed session insert must roll back user insert");
  } finally {
    if (createdUserId) {
      await database.pool.query("delete from users where id = $1", [createdUserId]);
    }
    await database.pool.end();
    await app.close();
  }
});
