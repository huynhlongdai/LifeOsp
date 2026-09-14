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
if (!databaseUrl) throw new Error("DATABASE_URL is required for EXECUTE board integration tests");

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

test("EXECUTE returns the active Season board grouped by Outcome, Project and Action, and stays private", async () => {
  const app: App = buildApp({ databaseUrl, interpretation: { provider, timeoutMs: 500 } });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const stranger = await bootstrap(app);
    const strangerUserId = await userIdForToken(database, stranger.token);
    createdUserIds.add(strangerUserId);

    const emptyBoard = await app.inject({ method: "GET", url: "/v1/execute", headers: { cookie: owner.header } });
    assert.equal(emptyBoard.statusCode, 404, "EXECUTE must not invent a Season before one is confirmed");

    const seasonId = await createConfirmedSeason(app, owner.header);

    const created = await app.inject({
      method: "POST",
      url: "/v1/execution-context",
      headers: { cookie: owner.header },
      payload: contextPayload(seasonId)
    });
    assert.equal(created.statusCode, 201);
    const outcomeId = created.json().outcome.id as string;
    const projectId = created.json().project.id as string;

    await database.pool.query(
      `insert into actions (user_id, project_id, outcome_id, title, done_condition, status, priority, estimated_minutes)
       values ($1, $2, $3, 'Ship the execute board', 'The board renders real Actions.', 'ready', 8, 40)`,
      [ownerUserId, projectId, outcomeId]
    );
    await database.pool.query(
      `insert into actions (user_id, outcome_id, title, status, priority)
       values ($1, $2, 'Outcome-level action without a Project', 'candidate', 3)`,
      [ownerUserId, outcomeId]
    );

    const board = await app.inject({ method: "GET", url: "/v1/execute", headers: { cookie: owner.header } });
    assert.equal(board.statusCode, 200);
    assert.equal(board.headers["cache-control"], "no-store");
    const view = board.json();
    assert.equal(view.seasonId, seasonId);
    assert.equal(view.outcomes.length, 1);
    assert.equal(view.outcomes[0].outcome.id, outcomeId);
    assert.equal(view.outcomes[0].projects.length, 1);
    assert.equal(view.outcomes[0].projects[0].project.id, projectId);
    assert.equal(view.outcomes[0].projects[0].actions.length, 1);
    assert.equal(view.outcomes[0].projects[0].actions[0].title, "Ship the execute board");
    assert.equal(view.outcomes[0].projects[0].actions[0].estimatedMinutes, 40);
    assert.equal(
      view.outcomes[0].unassignedActions.length,
      1,
      "Actions without a Project must stay visible at the Outcome level"
    );

    const strangerBoard = await app.inject({ method: "GET", url: "/v1/execute", headers: { cookie: stranger.header } });
    assert.equal(strangerBoard.statusCode, 404, "another session must not read a private Season board");

    const anonymous = await app.inject({ method: "GET", url: "/v1/execute" });
    assert.equal(anonymous.statusCode, 401);
  } finally {
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
    await app.close();
  }
});
