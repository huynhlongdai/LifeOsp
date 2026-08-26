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
if (!databaseUrl) throw new Error("DATABASE_URL is required for Clarity promotion integration tests");

type App = ReturnType<typeof buildApp>;
type Database = ReturnType<typeof createDatabaseClient>;

const rawText = "I want to build LifeOS now. I need to maintain health. AOP can wait.";

const content: CaptureInterpretationContentV1 = {
  concerns: [],
  ideas: [],
  commitments: [
    {
      text: "Maintain health",
      confidence: "high",
      sourceExcerpt: "maintain health"
    }
  ],
  possibleProjects: [
    {
      text: "AOP",
      confidence: "high",
      sourceExcerpt: "AOP"
    }
  ],
  possibleDirections: [
    {
      text: "Build LifeOS now",
      confidence: "high",
      sourceExcerpt: "build LifeOS now"
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
      runtime: { provider: "fixture", model: "a4-fixture", latencyMs: 1 }
    };
  }
};

function sessionCookieFromResponse(setCookieHeader: string | string[] | undefined): {
  header: string;
  token: string;
} {
  const setCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(setCookie, "expected Set-Cookie header");
  const match = new RegExp(`^${SESSION_COOKIE_NAME}=([^;]+)`).exec(setCookie);
  assert.ok(match?.[1], "expected LifeOS session cookie");
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
  assert.ok(userId, "expected session-owned user");
  return userId;
}

async function createInterpretedCapture(app: App, cookie: string): Promise<string> {
  const capture = await app.inject({
    method: "POST",
    url: "/v1/captures",
    headers: { cookie },
    payload: { rawText }
  });
  assert.equal(capture.statusCode, 201);
  const captureId = capture.json().id as string;
  assert.ok(captureId);

  const generated = await app.inject({
    method: "POST",
    url: `/v1/captures/${captureId}/interpretations/generate`,
    headers: { cookie }
  });
  assert.equal(generated.statusCode, 201);
  assert.equal(generated.json().version, 1);
  return captureId;
}

function promotionPayload(overrides: Record<string, unknown> = {}) {
  return {
    interpretationVersion: 1,
    activeText: "Build LifeOS now",
    maintainTexts: ["Maintain health"],
    notNowItems: [{ text: "AOP", kind: "project_candidate" }],
    direction: {
      title: "Build LifeOS",
      description: "Make LifeOS the primary direction for this season."
    },
    season: {
      title: "Ship the first LifeOS loop",
      purpose: "Turn clarity into a real usable operating loop.",
      primaryFocusText: "Build LifeOS now",
      startsOn: "2026-08-26",
      targetEndsOn: "2026-11-30"
    },
    ...overrides
  };
}

async function prepare(app: App, cookie: string, captureId: string) {
  return app.inject({
    method: "POST",
    url: `/v1/captures/${captureId}/promotion/prepare`,
    headers: { cookie },
    payload: promotionPayload()
  });
}

async function deleteUsers(database: Database, userIds: Set<string>) {
  for (const userId of userIds) await database.pool.query("delete from users where id = $1", [userId]);
}

test("A4 prepares from reviewed evidence, keeps ownership private, confirms atomically and reloads Current Direction", async () => {
  const app = buildApp({ databaseUrl, interpretation: { provider, timeoutMs: 500 } });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const stranger = await bootstrap(app);
    const strangerUserId = await userIdForToken(database, stranger.token);
    createdUserIds.add(strangerUserId);

    const captureId = await createInterpretedCapture(app, owner.header);

    const fabricated = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/promotion/prepare`,
      headers: { cookie: owner.header },
      payload: promotionPayload({ activeText: "A completely unrelated direction" })
    });
    assert.equal(fabricated.statusCode, 400, "trade-off items must come from the reviewed interpretation");

    const prepared = await prepare(app, owner.header, captureId);
    assert.equal(prepared.statusCode, 201);
    const draft = prepared.json();
    assert.equal(draft.direction.status, "draft");
    assert.equal(draft.season.status, "draft");
    assert.equal(draft.recommendationStatus, "shown");
    const recommendationId = draft.recommendationId as string;
    const directionId = draft.direction.id as string;
    const seasonId = draft.season.id as string;

    const beforeConfirm = await database.pool.query<{
      capture_status: string;
      recommendation_status: string;
      incubator_count: string;
    }>(
      `select
         (select processing_status from captures where id = $1) as capture_status,
         (select status from recommendations where id = $2) as recommendation_status,
         (select count(*)::text from incubator_items where source_capture_id = $1) as incubator_count`,
      [captureId, recommendationId]
    );
    assert.equal(beforeConfirm.rows[0]?.capture_status, "interpreted");
    assert.equal(beforeConfirm.rows[0]?.recommendation_status, "shown");
    assert.equal(beforeConfirm.rows[0]?.incubator_count, "0", "Not Now remains a proposal until confirmation");

    const crossOwnerConfirm = await app.inject({
      method: "POST",
      url: `/v1/clarity-promotions/${recommendationId}/confirm`,
      headers: { cookie: stranger.header },
      payload: {
        direction: { title: "steal" },
        season: { title: "steal", purpose: "steal" },
        notNowItems: []
      }
    });
    assert.equal(crossOwnerConfirm.statusCode, 404);

    const confirmed = await app.inject({
      method: "POST",
      url: `/v1/clarity-promotions/${recommendationId}/confirm`,
      headers: { cookie: owner.header },
      payload: {
        direction: {
          title: "Build LifeOS into a real product",
          description: "Edited by the user before confirmation."
        },
        season: {
          title: "Ship a real LifeOS vertical loop",
          purpose: "Reach founder dogfood with a complete clarity-to-action path.",
          primaryFocusText: "Build LifeOS now",
          startsOn: "2026-08-26",
          targetEndsOn: "2026-11-30"
        },
        notNowItems: [{ text: "AOP", kind: "project_candidate" }]
      }
    });
    assert.equal(confirmed.statusCode, 200);
    const confirmedBody = confirmed.json();
    assert.equal(confirmedBody.direction.status, "active");
    assert.equal(confirmedBody.direction.id, directionId);
    assert.equal(confirmedBody.direction.title, "Build LifeOS into a real product");
    assert.equal(confirmedBody.season.status, "active");
    assert.equal(confirmedBody.season.id, seasonId);
    assert.equal(confirmedBody.incubatorItems.length, 1);
    assert.equal(confirmedBody.incubatorItems[0].title, "AOP");
    assert.equal(confirmedBody.incubatorItems[0].status, "incubated");

    const persisted = await database.pool.query<{
      capture_status: string;
      direction_status: string;
      season_status: string;
      recommendation_status: string;
      incubator_count: string;
    }>(
      `select
         (select processing_status from captures where id = $1) as capture_status,
         (select status from directions where id = $2) as direction_status,
         (select status from seasons where id = $3) as season_status,
         (select status from recommendations where id = $4) as recommendation_status,
         (select count(*)::text from incubator_items where source_capture_id = $1) as incubator_count`,
      [captureId, directionId, seasonId, recommendationId]
    );
    assert.deepEqual(persisted.rows[0], {
      capture_status: "promoted",
      direction_status: "active",
      season_status: "active",
      recommendation_status: "accepted",
      incubator_count: "1"
    });

    const eventTypes = await database.pool.query<{ type: string }>(
      "select type from life_events where user_id = $1 and type in ('direction.confirmed','season.started','capture.promoted','recommendation.accepted','incubator.item.created') order by type",
      [ownerUserId]
    );
    assert.deepEqual(
      eventTypes.rows.map((row) => row.type),
      ["capture.promoted", "direction.confirmed", "incubator.item.created", "recommendation.accepted", "season.started"]
    );

    const current = await app.inject({ method: "GET", url: "/v1/direction/current", headers: { cookie: owner.header } });
    assert.equal(current.statusCode, 200);
    assert.equal(current.json().direction.id, directionId);
    assert.equal(current.json().season.id, seasonId);

    const strangerCurrent = await app.inject({
      method: "GET",
      url: "/v1/direction/current",
      headers: { cookie: stranger.header }
    });
    assert.equal(strangerCurrent.statusCode, 404);
  } finally {
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
    await app.close();
  }
});

test("A4 refuses a second active Current Season and preserves the first confirmed direction", async () => {
  const app = buildApp({ databaseUrl, interpretation: { provider, timeoutMs: 500 } });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const userId = await userIdForToken(database, owner.token);
    createdUserIds.add(userId);

    const firstCaptureId = await createInterpretedCapture(app, owner.header);
    const firstPrepared = await prepare(app, owner.header, firstCaptureId);
    assert.equal(firstPrepared.statusCode, 201);
    const firstRecommendation = firstPrepared.json().recommendationId as string;
    const firstDirectionId = firstPrepared.json().direction.id as string;

    const firstConfirm = await app.inject({
      method: "POST",
      url: `/v1/clarity-promotions/${firstRecommendation}/confirm`,
      headers: { cookie: owner.header },
      payload: {
        direction: { title: "First active Direction" },
        season: { title: "First Season", purpose: "Protect the first active season." },
        notNowItems: [{ text: "AOP", kind: "project_candidate" }]
      }
    });
    assert.equal(firstConfirm.statusCode, 200);

    const secondCaptureId = await createInterpretedCapture(app, owner.header);
    const secondPrepared = await prepare(app, owner.header, secondCaptureId);
    assert.equal(secondPrepared.statusCode, 201);
    const secondRecommendation = secondPrepared.json().recommendationId as string;
    const secondDirectionId = secondPrepared.json().direction.id as string;
    const secondSeasonId = secondPrepared.json().season.id as string;

    const secondConfirm = await app.inject({
      method: "POST",
      url: `/v1/clarity-promotions/${secondRecommendation}/confirm`,
      headers: { cookie: owner.header },
      payload: {
        direction: { title: "Second Direction" },
        season: { title: "Second Season", purpose: "This must not silently replace the active season." },
        notNowItems: []
      }
    });
    assert.equal(secondConfirm.statusCode, 409);
    assert.equal(secondConfirm.json().error, "active_season_conflict");

    const secondState = await database.pool.query<{ direction_status: string; season_status: string; recommendation_status: string }>(
      `select
        (select status from directions where id = $1) as direction_status,
        (select status from seasons where id = $2) as season_status,
        (select status from recommendations where id = $3) as recommendation_status`,
      [secondDirectionId, secondSeasonId, secondRecommendation]
    );
    assert.deepEqual(secondState.rows[0], {
      direction_status: "draft",
      season_status: "draft",
      recommendation_status: "shown"
    });

    const current = await app.inject({ method: "GET", url: "/v1/direction/current", headers: { cookie: owner.header } });
    assert.equal(current.statusCode, 200);
    assert.equal(current.json().direction.id, firstDirectionId);

    const activeCount = await database.pool.query<{ count: string }>(
      "select count(*)::text as count from seasons where user_id = $1 and status = 'active'",
      [userId]
    );
    assert.equal(activeCount.rows[0]?.count, "1");
  } finally {
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
    await app.close();
  }
});

test("A4 reject keeps Capture reviewable while whole-proposal Not Now protects focus in Incubator", async () => {
  const app = buildApp({ databaseUrl, interpretation: { provider, timeoutMs: 500 } });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const userId = await userIdForToken(database, owner.token);
    createdUserIds.add(userId);

    const rejectCaptureId = await createInterpretedCapture(app, owner.header);
    const rejectPrepared = await prepare(app, owner.header, rejectCaptureId);
    assert.equal(rejectPrepared.statusCode, 201);
    const rejectRecommendation = rejectPrepared.json().recommendationId as string;
    const rejectDirection = rejectPrepared.json().direction.id as string;
    const rejectSeason = rejectPrepared.json().season.id as string;

    const rejected = await app.inject({
      method: "POST",
      url: `/v1/clarity-promotions/${rejectRecommendation}/reject`,
      headers: { cookie: owner.header }
    });
    assert.equal(rejected.statusCode, 200);
    assert.equal(rejected.json().status, "rejected");

    const rejectedState = await database.pool.query<{
      capture_status: string;
      direction_count: string;
      season_count: string;
      recommendation_status: string;
    }>(
      `select
        (select processing_status from captures where id = $1) as capture_status,
        (select count(*)::text from directions where id = $2) as direction_count,
        (select count(*)::text from seasons where id = $3) as season_count,
        (select status from recommendations where id = $4) as recommendation_status`,
      [rejectCaptureId, rejectDirection, rejectSeason, rejectRecommendation]
    );
    assert.deepEqual(rejectedState.rows[0], {
      capture_status: "interpreted",
      direction_count: "0",
      season_count: "0",
      recommendation_status: "rejected"
    });

    const notNowCaptureId = await createInterpretedCapture(app, owner.header);
    const notNowPrepared = await prepare(app, owner.header, notNowCaptureId);
    assert.equal(notNowPrepared.statusCode, 201);
    const notNowRecommendation = notNowPrepared.json().recommendationId as string;
    const notNowDirection = notNowPrepared.json().direction.id as string;
    const notNowSeason = notNowPrepared.json().season.id as string;

    const deferred = await app.inject({
      method: "POST",
      url: `/v1/clarity-promotions/${notNowRecommendation}/not-now`,
      headers: { cookie: owner.header }
    });
    assert.equal(deferred.statusCode, 200);
    assert.equal(deferred.json().status, "not_now");
    assert.equal(deferred.json().incubatorItem.status, "incubated");

    const deferredState = await database.pool.query<{
      capture_status: string;
      direction_count: string;
      season_count: string;
      recommendation_status: string;
      incubator_count: string;
    }>(
      `select
        (select processing_status from captures where id = $1) as capture_status,
        (select count(*)::text from directions where id = $2) as direction_count,
        (select count(*)::text from seasons where id = $3) as season_count,
        (select status from recommendations where id = $4) as recommendation_status,
        (select count(*)::text from incubator_items where source_capture_id = $1) as incubator_count`,
      [notNowCaptureId, notNowDirection, notNowSeason, notNowRecommendation]
    );
    assert.deepEqual(deferredState.rows[0], {
      capture_status: "promoted",
      direction_count: "0",
      season_count: "0",
      recommendation_status: "not_now",
      incubator_count: "1"
    });
  } finally {
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
    await app.close();
  }
});

test("A4 confirmation rolls back Direction, Season, Capture, Recommendation and Incubator when audit persistence fails", async () => {
  const app = buildApp({ databaseUrl, interpretation: { provider, timeoutMs: 500 } });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const userId = await userIdForToken(database, owner.token);
    createdUserIds.add(userId);
    const captureId = await createInterpretedCapture(app, owner.header);
    const prepared = await prepare(app, owner.header, captureId);
    assert.equal(prepared.statusCode, 201);
    const recommendationId = prepared.json().recommendationId as string;
    const directionId = prepared.json().direction.id as string;
    const seasonId = prepared.json().season.id as string;

    await database.pool.query(`
      create or replace function test_fail_a4_season_started_event()
      returns trigger
      language plpgsql
      as $$
      begin
        if new.type = 'season.started' then
          raise exception 'forced A4 season.started failure';
        end if;
        return new;
      end;
      $$
    `);
    await database.pool.query(`
      create trigger test_fail_a4_season_started_event_trigger
      before insert on life_events
      for each row execute function test_fail_a4_season_started_event()
    `);

    const confirmation = await app.inject({
      method: "POST",
      url: `/v1/clarity-promotions/${recommendationId}/confirm`,
      headers: { cookie: owner.header },
      payload: {
        direction: { title: "Rollback Direction" },
        season: { title: "Rollback Season", purpose: "The event failure must roll everything back." },
        notNowItems: [{ text: "AOP", kind: "project_candidate" }]
      }
    });
    assert.equal(confirmation.statusCode, 500);

    const state = await database.pool.query<{
      capture_status: string;
      direction_status: string;
      season_status: string;
      recommendation_status: string;
      incubator_count: string;
    }>(
      `select
        (select processing_status from captures where id = $1) as capture_status,
        (select status from directions where id = $2) as direction_status,
        (select status from seasons where id = $3) as season_status,
        (select status from recommendations where id = $4) as recommendation_status,
        (select count(*)::text from incubator_items where source_capture_id = $1) as incubator_count`,
      [captureId, directionId, seasonId, recommendationId]
    );
    assert.deepEqual(state.rows[0], {
      capture_status: "interpreted",
      direction_status: "draft",
      season_status: "draft",
      recommendation_status: "shown",
      incubator_count: "0"
    });

    const current = await app.inject({ method: "GET", url: "/v1/direction/current", headers: { cookie: owner.header } });
    assert.equal(current.statusCode, 404);
  } finally {
    await database.pool.query("drop trigger if exists test_fail_a4_season_started_event_trigger on life_events");
    await database.pool.query("drop function if exists test_fail_a4_season_started_event()");
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
    await app.close();
  }
});
