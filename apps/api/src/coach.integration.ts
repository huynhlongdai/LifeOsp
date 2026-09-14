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
if (!databaseUrl) throw new Error("DATABASE_URL is required for coach integration tests");

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

test("coach reports counted facts only and stays private", async () => {
  const app: App = buildApp({ databaseUrl, interpretation: { provider, timeoutMs: 500 } });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const anonymous = await app.inject({ method: "GET", url: "/v1/coach" });
    assert.equal(anonymous.statusCode, 401);

    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);

    const empty = await app.inject({ method: "GET", url: "/v1/coach", headers: { cookie: owner.header } });
    assert.equal(empty.statusCode, 200);
    assert.equal(empty.headers["cache-control"], "no-store");
    assert.equal(empty.json().capacity.focusSessionsLast7Days, 0);
    assert.equal(empty.json().insights[0].id, "no-focus-data", "with no data the coach says so instead of guessing");

    const seasonId = await createConfirmedSeason(app, owner.header);
    const created = await app.inject({
      method: "POST",
      url: "/v1/execution-context",
      headers: { cookie: owner.header },
      payload: contextPayload(seasonId)
    });
    const outcomeId = created.json().outcome.id as string;

    const action = await database.pool.query<{ id: string }>(
      `insert into actions (user_id, outcome_id, title, status, completed_at)
       values ($1, $2, 'Đã xong', 'completed', now()) returning id`,
      [ownerUserId, outcomeId]
    );
    const actionId = action.rows[0]?.id;
    assert.ok(actionId);

    await database.pool.query(
      `insert into focus_sessions (user_id, action_id, planned_minutes, status, started_at, ended_at)
       values ($1, $2, 40, 'completed', now() - interval '2 hours', now() - interval '80 minutes'),
              ($1, $2, 40, 'interrupted', now() - interval '1 day', now() - interval '1 day' + interval '10 minutes')`,
      [ownerUserId, actionId]
    );
    await database.pool.query(
      `insert into daily_closes (user_id, local_date, tz_offset_minutes, summary)
       values ($1, current_date, 420, '{}'::jsonb)`,
      [ownerUserId]
    );

    const coach = await app.inject({ method: "GET", url: "/v1/coach", headers: { cookie: owner.header } });
    assert.equal(coach.statusCode, 200);
    const view = coach.json();
    assert.equal(view.capacity.focusSessionsLast7Days, 2);
    assert.ok(view.capacity.focusMinutesLast7Days >= 50, "focus minutes are summed from the stored sessions");
    assert.equal(view.capacity.interruptedSessionsLast7Days, 1);
    assert.equal(view.facts.actionsCompletedLast7Days, 1);
    assert.equal(view.facts.dailyClosesLast7Days, 1);
    assert.equal(view.capacity.workDaysPerWeek, 5, "capacity uses the user's own work settings");
    assert.ok(
      view.insights.every((insight: { evidence: string[] }) => insight.evidence.length > 0),
      "every insight must carry the numbers it came from"
    );

    const stranger = await bootstrap(app);
    createdUserIds.add(await userIdForToken(database, stranger.token));
    const strangerCoach = await app.inject({ method: "GET", url: "/v1/coach", headers: { cookie: stranger.header } });
    assert.equal(strangerCoach.json().capacity.focusSessionsLast7Days, 0);
  } finally {
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
    await app.close();
  }
});
