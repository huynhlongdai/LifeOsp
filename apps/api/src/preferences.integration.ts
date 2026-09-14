import assert from "node:assert/strict";
import test from "node:test";
import type { CaptureInterpretationProvider } from "@lifeos/ai";
import { createDatabaseClient } from "@lifeos/db";
import {
  CAPTURE_INTERPRETATION_CONTRACT_ID,
  CAPTURE_INTERPRETATION_CONTRACT_VERSION,
  type CaptureInterpretationContentV1
} from "@lifeos/domain";
import { buildApp } from "./app.js";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./identity.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for preferences integration tests");

type App = ReturnType<typeof buildApp>;
type Database = ReturnType<typeof createDatabaseClient>;

type SessionCookie = { header: string; token: string };

const content: CaptureInterpretationContentV1 = {
  concerns: [],
  ideas: [],
  commitments: [],
  possibleProjects: [],
  possibleDirections: [
    {
      text: "Build LifeOS now",
      confidence: "high",
      sourceExcerpt: "Build LifeOS now"
    }
  ],
  questions: [],
  uncertainties: []
};

const provider: CaptureInterpretationProvider = {
  async interpret() {
    return {
      output: {
        contractId: CAPTURE_INTERPRETATION_CONTRACT_ID,
        contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
        content
      },
      runtime: { provider: "fixture", model: "b0-execution-context", latencyMs: 1 }
    };
  }
};

function sessionCookieFromResponse(setCookieHeader: string | string[] | undefined): SessionCookie {
  const setCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(setCookie, "expected Set-Cookie header");
  const match = new RegExp(`^${SESSION_COOKIE_NAME}=([^;]+)`).exec(setCookie);
  assert.ok(match?.[1], "expected LifeOS session cookie");
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
  assert.ok(userId, "expected session-owned user");
  return userId;
}

async function deleteUsers(database: Database, userIds: Set<string>) {
  for (const userId of userIds) await database.pool.query("delete from users where id = $1", [userId]);
}

async function createConfirmedSeason(app: App, cookie: string): Promise<string> {
  const capture = await app.inject({
    method: "POST",
    url: "/v1/captures",
    headers: { cookie },
    payload: { rawText: "Build LifeOS now" }
  });
  assert.equal(capture.statusCode, 201);
  const captureId = capture.json().id as string;

  const interpretation = await app.inject({
    method: "POST",
    url: `/v1/captures/${captureId}/interpretations/generate`,
    headers: { cookie }
  });
  assert.equal(interpretation.statusCode, 201);

  const prepared = await app.inject({
    method: "POST",
    url: `/v1/captures/${captureId}/promotion/prepare`,
    headers: { cookie },
    payload: {
      interpretationVersion: 1,
      activeText: "Build LifeOS now",
      maintainTexts: [],
      notNowItems: [],
      direction: { title: "Build LifeOS" },
      season: {
        title: "Ship the execution loop",
        purpose: "Turn a confirmed direction into useful execution."
      }
    }
  });
  assert.equal(prepared.statusCode, 201);

  const confirmed = await app.inject({
    method: "POST",
    url: `/v1/clarity-promotions/${prepared.json().recommendationId as string}/confirm`,
    headers: { cookie },
    payload: {
      direction: { title: "Build LifeOS" },
      season: {
        title: "Ship the execution loop",
        purpose: "Turn a confirmed direction into useful execution."
      }
    }
  });
  assert.equal(confirmed.statusCode, 200);
  assert.equal(confirmed.json().season.status, "active");
  return confirmed.json().season.id as string;
}

function contextPayload(seasonId: string) {
  return {
    seasonId,
    outcome: {
      title: "Reach a usable execution loop",
      successDefinition: "A confirmed Direction produces an action that can be focused and resolved."
    },
    project: {
      title: "Vertical Slice B",
      description: "Build only the bounded execution path required by the active Season."
    }
  };
}

test("preferences default on first read, accept valid updates and reject impossible ones", async () => {
  const app: App = buildApp({ databaseUrl, interpretation: { provider, timeoutMs: 500 } });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const anonymous = await app.inject({ method: "GET", url: "/v1/me/preferences" });
    assert.equal(anonymous.statusCode, 401);

    const owner = await bootstrap(app);
    createdUserIds.add(await userIdForToken(database, owner.token));

    const defaults = await app.inject({ method: "GET", url: "/v1/me/preferences", headers: { cookie: owner.header } });
    assert.equal(defaults.statusCode, 200);
    assert.equal(defaults.headers["cache-control"], "no-store");
    assert.equal(defaults.json().timezone, "Asia/Ho_Chi_Minh");
    assert.equal(defaults.json().workStartMinute, 480);
    assert.equal(defaults.json().workEndMinute, 1080);
    assert.deepEqual(defaults.json().workDays, [1, 2, 3, 4, 5]);
    assert.equal(defaults.json().aiSuggestsActions, true);

    const updated = await app.inject({
      method: "PATCH",
      url: "/v1/me/preferences",
      headers: { cookie: owner.header },
      payload: { timezone: "Asia/Bangkok", workStartMinute: 540, workDays: [1, 3, 5, 5], focusMinutes: 25, aiSuggestsActions: false }
    });
    assert.equal(updated.statusCode, 200);
    assert.equal(updated.json().timezone, "Asia/Bangkok");
    assert.equal(updated.json().workStartMinute, 540);
    assert.deepEqual(updated.json().workDays, [1, 3, 5], "duplicate days are collapsed");
    assert.equal(updated.json().focusMinutes, 25);
    assert.equal(updated.json().aiSuggestsActions, false);

    const persisted = await app.inject({ method: "GET", url: "/v1/me/preferences", headers: { cookie: owner.header } });
    assert.equal(persisted.json().focusMinutes, 25);

    const impossibleWindow = await app.inject({
      method: "PATCH",
      url: "/v1/me/preferences",
      headers: { cookie: owner.header },
      payload: { workEndMinute: 300 }
    });
    assert.equal(impossibleWindow.statusCode, 400, "an end before the start must be refused");

    const outOfRange = await app.inject({
      method: "PATCH",
      url: "/v1/me/preferences",
      headers: { cookie: owner.header },
      payload: { focusMinutes: 999 }
    });
    assert.equal(outOfRange.statusCode, 400);

    const unknownField = await app.inject({
      method: "PATCH",
      url: "/v1/me/preferences",
      headers: { cookie: owner.header },
      payload: { somethingElse: true }
    });
    assert.equal(unknownField.statusCode, 400);

    const stranger = await bootstrap(app);
    createdUserIds.add(await userIdForToken(database, stranger.token));
    const strangerPreferences = await app.inject({ method: "GET", url: "/v1/me/preferences", headers: { cookie: stranger.header } });
    assert.equal(strangerPreferences.json().timezone, "Asia/Ho_Chi_Minh", "preferences never leak between sessions");
  } finally {
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
    await app.close();
  }
});
