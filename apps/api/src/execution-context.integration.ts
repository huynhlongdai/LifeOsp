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
if (!databaseUrl) throw new Error("DATABASE_URL is required for B0 execution-context integration tests");

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

test("B0 requires explicit execution context, keeps ownership private and reloads after app restart", async () => {
  let app: App | null = buildApp({ databaseUrl, interpretation: { provider, timeoutMs: 500 } });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const stranger = await bootstrap(app);
    createdUserIds.add(await userIdForToken(database, stranger.token));

    const seasonId = await createConfirmedSeason(app, owner.header);

    const beforeExplicitContext = await database.pool.query<{ outcomes: string; projects: string }>(
      `select
         (select count(*)::text from outcomes where user_id = $1) as outcomes,
         (select count(*)::text from projects where user_id = $1) as projects`,
      [ownerUserId]
    );
    assert.equal(beforeExplicitContext.rows[0]?.outcomes, "0", "confirming Direction/Season alone must create no Outcome");
    assert.equal(beforeExplicitContext.rows[0]?.projects, "0", "confirming Direction/Season alone must create no Project");

    const crossOwner = await app.inject({
      method: "POST",
      url: "/v1/execution-context",
      headers: { cookie: stranger.header },
      payload: contextPayload(seasonId)
    });
    assert.equal(crossOwner.statusCode, 404, "another session must not attach execution context to a private Season");

    const created = await app.inject({
      method: "POST",
      url: "/v1/execution-context",
      headers: { cookie: owner.header },
      payload: contextPayload(seasonId)
    });
    assert.equal(created.statusCode, 201);
    assert.equal(created.json().seasonId, seasonId);
    assert.equal(created.json().outcome.status, "active");
    assert.equal(created.json().project.status, "active");
    const outcomeId = created.json().outcome.id as string;
    const projectId = created.json().project.id as string;

    const current = await app.inject({
      method: "GET",
      url: "/v1/execution-context/current",
      headers: { cookie: owner.header }
    });
    assert.equal(current.statusCode, 200);
    assert.equal(current.json().seasonId, seasonId);
    assert.equal(current.json().outcomes.length, 1);
    assert.equal(current.json().outcomes[0].outcome.id, outcomeId);
    assert.equal(current.json().outcomes[0].projects[0].id, projectId);

    const strangerCurrent = await app.inject({
      method: "GET",
      url: "/v1/execution-context/current",
      headers: { cookie: stranger.header }
    });
    assert.equal(strangerCurrent.statusCode, 404);

    const events = await database.pool.query<{ type: string; entity_id: string | null }>(
      "select type, entity_id from life_events where user_id = $1 and type in ('outcome.created', 'project.started') order by occurred_at, id",
      [ownerUserId]
    );
    assert.deepEqual(
      events.rows.map((row) => ({ type: row.type, entityId: row.entity_id })),
      [
        { type: "outcome.created", entityId: outcomeId },
        { type: "project.started", entityId: projectId }
      ]
    );

    await app.close();
    app = buildApp({ databaseUrl, interpretation: { provider, timeoutMs: 500 } });

    const restored = await app.inject({
      method: "GET",
      url: "/v1/execution-context/current",
      headers: { cookie: owner.header }
    });
    assert.equal(restored.statusCode, 200);
    assert.equal(restored.json().outcomes[0].outcome.id, outcomeId);
    assert.equal(restored.json().outcomes[0].projects[0].id, projectId);

    await database.pool.query("update seasons set status = 'paused', updated_at = now() where id = $1 and user_id = $2", [
      seasonId,
      ownerUserId
    ]);
    const inactive = await app.inject({
      method: "POST",
      url: "/v1/execution-context",
      headers: { cookie: owner.header },
      payload: contextPayload(seasonId)
    });
    assert.equal(inactive.statusCode, 409, "paused Season must reject new execution context");

    const afterInvalidWrites = await database.pool.query<{ outcomes: string; projects: string }>(
      `select
         (select count(*)::text from outcomes where user_id = $1) as outcomes,
         (select count(*)::text from projects where user_id = $1) as projects`,
      [ownerUserId]
    );
    assert.equal(afterInvalidWrites.rows[0]?.outcomes, "1");
    assert.equal(afterInvalidWrites.rows[0]?.projects, "1");
  } finally {
    if (app) await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("B0 rolls back Outcome and Project when LifeEvent persistence fails", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);

    const direction = await database.pool.query<{ id: string }>(
      "insert into directions (user_id, title, status, confirmed_at) values ($1, 'B0 rollback direction', 'active', now()) returning id",
      [ownerUserId]
    );
    const directionId = direction.rows[0]?.id;
    assert.ok(directionId);
    const season = await database.pool.query<{ id: string }>(
      "insert into seasons (user_id, direction_id, title, purpose, status) values ($1, $2, 'B0 rollback season', 'Prove atomicity', 'active') returning id",
      [ownerUserId, directionId]
    );
    const seasonId = season.rows[0]?.id;
    assert.ok(seasonId);

    await database.pool.query(`
      create or replace function test_fail_b0_outcome_event() returns trigger as $$
      begin
        if NEW.type = 'outcome.created' then
          raise exception 'forced B0 outcome.created failure';
        end if;
        return NEW;
      end;
      $$ language plpgsql;
      create trigger test_fail_b0_outcome_event_trigger
      before insert on life_events
      for each row execute function test_fail_b0_outcome_event();
    `);

    const failed = await app.inject({
      method: "POST",
      url: "/v1/execution-context",
      headers: { cookie: owner.header },
      payload: contextPayload(seasonId)
    });
    assert.equal(failed.statusCode, 500);

    const counts = await database.pool.query<{ outcomes: string; projects: string }>(
      `select
         (select count(*)::text from outcomes where user_id = $1) as outcomes,
         (select count(*)::text from projects where user_id = $1) as projects`,
      [ownerUserId]
    );
    assert.equal(counts.rows[0]?.outcomes, "0", "Outcome write must roll back with audit failure");
    assert.equal(counts.rows[0]?.projects, "0", "Project write must roll back with audit failure");
  } finally {
    await database.pool.query("drop trigger if exists test_fail_b0_outcome_event_trigger on life_events").catch(() => undefined);
    await database.pool.query("drop function if exists test_fail_b0_outcome_event()").catch(() => undefined);
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
    await app.close();
  }
});
