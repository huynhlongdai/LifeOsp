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
if (!databaseUrl) throw new Error("DATABASE_URL is required for ME integration tests");

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

test("ME reports only recorded facts and never leaks another session's data", async () => {
  const app: App = buildApp({ databaseUrl, interpretation: { provider, timeoutMs: 500 } });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const anonymous = await app.inject({ method: "GET", url: "/v1/me" });
    assert.equal(anonymous.statusCode, 401);

    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);

    const fresh = await app.inject({ method: "GET", url: "/v1/me", headers: { cookie: owner.header } });
    assert.equal(fresh.statusCode, 200);
    assert.equal(fresh.headers["cache-control"], "no-store");
    assert.equal(fresh.json().season, undefined, "ME must not show a Season before one is confirmed");
    assert.deepEqual(fresh.json().stats, {
      focusSessionsTotal: 0,
      focusMinutesLast7Days: 0,
      actionsCompletedLast7Days: 0,
      actionsOpen: 0,
      capturesTotal: 0,
      dailyCloseStreak: 0
    });

    const seasonId = await createConfirmedSeason(app, owner.header);
    const created = await app.inject({
      method: "POST",
      url: "/v1/execution-context",
      headers: { cookie: owner.header },
      payload: contextPayload(seasonId)
    });
    assert.equal(created.statusCode, 201);
    const outcomeId = created.json().outcome.id as string;

    await database.pool.query(
      `insert into actions (user_id, outcome_id, title, status, completed_at)
       values ($1, $2, 'Đã hoàn thành hôm nay', 'completed', now()), ($1, $2, 'Còn mở', 'ready', null)`,
      [ownerUserId, outcomeId]
    );
    await database.pool.query(
      `insert into daily_closes (user_id, local_date, tz_offset_minutes, summary)
       values ($1, current_date, 420, '{}'::jsonb), ($1, current_date - 1, 420, '{}'::jsonb)`,
      [ownerUserId]
    );

    const me = await app.inject({ method: "GET", url: "/v1/me", headers: { cookie: owner.header } });
    assert.equal(me.statusCode, 200);
    const view = me.json();
    assert.equal(view.season.id, seasonId);
    assert.equal(view.directionTitle, "Build LifeOS");
    assert.equal(view.stats.actionsCompletedLast7Days, 1);
    assert.equal(view.stats.actionsOpen, 1);
    assert.equal(view.stats.capturesTotal, 1);
    assert.equal(view.stats.dailyCloseStreak, 2);
    assert.ok(typeof view.stats.lastDailyCloseOn === "string");

    const stranger = await bootstrap(app);
    createdUserIds.add(await userIdForToken(database, stranger.token));
    const strangerMe = await app.inject({ method: "GET", url: "/v1/me", headers: { cookie: stranger.header } });
    assert.equal(strangerMe.statusCode, 200);
    assert.equal(strangerMe.json().season, undefined);
    assert.equal(strangerMe.json().stats.actionsOpen, 0);
  } finally {
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
    await app.close();
  }
});
