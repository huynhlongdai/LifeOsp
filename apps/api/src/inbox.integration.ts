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
if (!databaseUrl) throw new Error("DATABASE_URL is required for INBOX integration tests");

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

test("INBOX lists the user's own captures and incubated items only", async () => {
  const app: App = buildApp({ databaseUrl, interpretation: { provider, timeoutMs: 500 } });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const anonymous = await app.inject({ method: "GET", url: "/v1/inbox" });
    assert.equal(anonymous.statusCode, 401);

    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);

    const empty = await app.inject({ method: "GET", url: "/v1/inbox", headers: { cookie: owner.header } });
    assert.equal(empty.statusCode, 200);
    assert.equal(empty.headers["cache-control"], "no-store");
    assert.deepEqual(empty.json(), { captures: [], incubated: [], counts: { captures: 0, incubated: 0 } });

    const capture = await app.inject({
      method: "POST",
      url: "/v1/captures",
      headers: { cookie: owner.header },
      payload: { rawText: "Build LifeOS now" }
    });
    assert.equal(capture.statusCode, 201);
    const captureId = capture.json().id as string;

    await database.pool.query(
      `insert into incubator_items (user_id, source_capture_id, title, notes, kind, status)
       values ($1, $2, 'Khoá học viết', 'Chưa phải bây giờ', 'idea', 'incubated')`,
      [ownerUserId, captureId]
    );
    await database.pool.query(
      `insert into incubator_items (user_id, title, kind, status)
       values ($1, 'Đã thành dự án', 'idea', 'promoted')`,
      [ownerUserId]
    );

    const inbox = await app.inject({ method: "GET", url: "/v1/inbox", headers: { cookie: owner.header } });
    assert.equal(inbox.statusCode, 200);
    const view = inbox.json();
    assert.equal(view.counts.captures, 1);
    assert.equal(view.counts.incubated, 1, "only items still incubated are counted");
    assert.equal(view.captures[0].rawText, "Build LifeOS now");
    assert.equal(view.captures[0].hasInterpretation, false);
    assert.equal(view.incubated.length, 1);
    assert.equal(view.incubated[0].title, "Khoá học viết");
    assert.equal(view.incubated[0].sourceCaptureId, captureId);

    const interpretation = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpretations/generate`,
      headers: { cookie: owner.header }
    });
    assert.equal(interpretation.statusCode, 201);

    const afterInterpretation = await app.inject({ method: "GET", url: "/v1/inbox", headers: { cookie: owner.header } });
    assert.equal(afterInterpretation.json().captures[0].hasInterpretation, true);

    const stranger = await bootstrap(app);
    createdUserIds.add(await userIdForToken(database, stranger.token));
    const strangerInbox = await app.inject({ method: "GET", url: "/v1/inbox", headers: { cookie: stranger.header } });
    assert.deepEqual(strangerInbox.json(), { captures: [], incubated: [], counts: { captures: 0, incubated: 0 } });
  } finally {
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
    await app.close();
  }
});
