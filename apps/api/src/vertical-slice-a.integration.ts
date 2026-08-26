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
if (!databaseUrl) throw new Error("DATABASE_URL is required for Vertical Slice A integration tests");

type App = ReturnType<typeof buildApp>;
type Database = ReturnType<typeof createDatabaseClient>;

type SessionCookie = { header: string; token: string };

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

function emptyContent(): CaptureInterpretationContentV1 {
  return {
    concerns: [],
    ideas: [],
    commitments: [],
    possibleProjects: [],
    possibleDirections: [],
    questions: [],
    uncertainties: []
  };
}

const generatedContent: CaptureInterpretationContentV1 = {
  concerns: [
    {
      text: "Too many open loops",
      confidence: "high",
      sourceExcerpt: "too many things in my head"
    }
  ],
  ideas: [],
  commitments: [
    {
      text: "Protect family time",
      confidence: "high",
      sourceExcerpt: "keep family time protected"
    }
  ],
  possibleProjects: [
    {
      text: "ThingsO experiment",
      confidence: "medium",
      sourceExcerpt: "ThingsO can wait"
    }
  ],
  possibleDirections: [
    {
      text: "Build LifeOS",
      confidence: "medium",
      sourceExcerpt: "focus on LifeOS"
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
        content: generatedContent
      },
      runtime: { provider: "fixture", model: "a5-e2e-fixture", requestId: "a5-happy-path", latencyMs: 1 }
    };
  }
};

const rawText = [
  "Need state: I have many things I want to do but I feel overloaded.",
  "Context: I only have a few focused hours each day.",
  "Brain Dump:",
  "There are too many things in my head. I want to focus on LifeOS, keep family time protected, and ThingsO can wait."
].join("\n");

test("Vertical Slice A reaches confirmed Direction/Season from unstructured input and survives app restart", async () => {
  let app: App | null = buildApp({ databaseUrl, interpretation: { provider, timeoutMs: 500 } });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);

    const captureResponse = await app.inject({
      method: "POST",
      url: "/v1/captures",
      headers: { cookie: owner.header },
      payload: { rawText }
    });
    assert.equal(captureResponse.statusCode, 201);
    const captureId = captureResponse.json().id as string;
    assert.equal(captureResponse.json().rawText, rawText);

    const generated = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpretations/generate`,
      headers: { cookie: owner.header }
    });
    assert.equal(generated.statusCode, 201);
    assert.equal(generated.json().version, 1);
    assert.equal(generated.json().author, "ai");

    const correctedContent = structuredClone(generatedContent);
    correctedContent.possibleDirections[0] = {
      text: "Build LifeOS into a product I can use every day",
      confidence: "high",
      sourceExcerpt: "focus on LifeOS"
    };
    correctedContent.possibleProjects[0] = {
      text: "ThingsO experiment",
      confidence: "high",
      sourceExcerpt: "ThingsO can wait"
    };

    const corrected = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpretations/correct`,
      headers: { cookie: owner.header },
      payload: { baseVersion: 1, content: correctedContent }
    });
    assert.equal(corrected.statusCode, 201);
    assert.equal(corrected.json().version, 2);
    assert.equal(corrected.json().author, "user");

    const prepared = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/promotion/prepare`,
      headers: { cookie: owner.header },
      payload: {
        interpretationVersion: 2,
        activeText: "Build LifeOS into a product I can use every day",
        maintainTexts: ["Protect family time"],
        notNowItems: [{ text: "ThingsO experiment", kind: "project_candidate" }],
        direction: {
          title: "Build a usable LifeOS",
          description: "Use the corrected Brain Dump as evidence, not as an automatic commitment."
        },
        season: {
          title: "Complete the first LifeOS operating loop",
          purpose: "Reach a reliable clarity-to-direction loop I can actually use.",
          primaryFocusText: "Build LifeOS into a product I can use every day",
          startsOn: "2026-08-26",
          targetEndsOn: "2026-11-30"
        }
      }
    });
    assert.equal(prepared.statusCode, 201);
    const recommendationId = prepared.json().recommendationId as string;
    assert.equal(prepared.json().direction.status, "draft");
    assert.equal(prepared.json().season.status, "draft");

    const confirmed = await app.inject({
      method: "POST",
      url: `/v1/clarity-promotions/${recommendationId}/confirm`,
      headers: { cookie: owner.header },
      payload: {
        direction: {
          title: "Build a usable LifeOS",
          description: "Confirmed after reviewing the trade-off."
        },
        season: {
          title: "Complete the first LifeOS operating loop",
          purpose: "Reach a reliable clarity-to-direction loop I can actually use.",
          primaryFocusText: "Build LifeOS into a product I can use every day",
          startsOn: "2026-08-26",
          targetEndsOn: "2026-11-30"
        }
      }
    });
    assert.equal(confirmed.statusCode, 200);
    assert.equal(confirmed.json().direction.status, "active");
    assert.equal(confirmed.json().season.status, "active");
    assert.deepEqual(
      confirmed.json().incubatorItems.map((item: { title: string; status: string }) => ({ title: item.title, status: item.status })),
      [{ title: "ThingsO experiment", status: "incubated" }]
    );

    const expectedAuditEvents = new Set([
      "capture.created",
      "capture.interpretation.generated",
      "capture.interpretation.corrected",
      "direction.draft.created",
      "season.draft.created",
      "recommendation.shown",
      "direction.confirmed",
      "season.started",
      "incubator.item.created",
      "capture.promoted",
      "recommendation.accepted"
    ]);
    const audit = await database.pool.query<{ type: string }>(
      "select type from life_events where user_id = $1",
      [ownerUserId]
    );
    const actualAuditEvents = new Set(audit.rows.map((row) => row.type));
    for (const type of expectedAuditEvents) {
      assert.equal(actualAuditEvents.has(type), true, `expected durable transition event ${type}`);
    }

    const privateCapture = await database.pool.query<{ raw_text: string; processing_status: string }>(
      "select raw_text, processing_status from captures where id = $1 and user_id = $2",
      [captureId, ownerUserId]
    );
    assert.equal(privateCapture.rows[0]?.raw_text, rawText, "raw Brain Dump must survive the entire flow unchanged");
    assert.equal(privateCapture.rows[0]?.processing_status, "promoted");

    await app.close();
    app = buildApp({ databaseUrl, interpretation: { provider, timeoutMs: 500 } });

    const restoredCapture = await app.inject({
      method: "GET",
      url: `/v1/captures/${captureId}`,
      headers: { cookie: owner.header }
    });
    assert.equal(restoredCapture.statusCode, 200);
    assert.equal(restoredCapture.json().rawText, rawText);
    assert.equal(restoredCapture.json().processingStatus, "promoted");

    const restoredInterpretation = await app.inject({
      method: "GET",
      url: `/v1/captures/${captureId}/interpretations/latest`,
      headers: { cookie: owner.header }
    });
    assert.equal(restoredInterpretation.statusCode, 200);
    assert.equal(restoredInterpretation.json().version, 2);
    assert.deepEqual(restoredInterpretation.json().content, correctedContent);

    const restoredDirection = await app.inject({
      method: "GET",
      url: "/v1/direction/current",
      headers: { cookie: owner.header }
    });
    assert.equal(restoredDirection.statusCode, 200);
    assert.equal(restoredDirection.json().direction.title, "Build a usable LifeOS");
    assert.equal(restoredDirection.json().season.title, "Complete the first LifeOS operating loop");

    const stranger = await bootstrap(app);
    const strangerUserId = await userIdForToken(database, stranger.token);
    createdUserIds.add(strangerUserId);

    const strangerCapture = await app.inject({
      method: "GET",
      url: `/v1/captures/${captureId}`,
      headers: { cookie: stranger.header }
    });
    assert.equal(strangerCapture.statusCode, 404);

    const strangerInterpretation = await app.inject({
      method: "GET",
      url: `/v1/captures/${captureId}/interpretations/latest`,
      headers: { cookie: stranger.header }
    });
    assert.equal(strangerInterpretation.statusCode, 404);

    const strangerDirection = await app.inject({
      method: "GET",
      url: "/v1/direction/current",
      headers: { cookie: stranger.header }
    });
    assert.equal(strangerDirection.statusCode, 404);
  } finally {
    if (app) await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("Vertical Slice A provider failure preserves Capture and still reaches confirmed Direction/Season manually", async () => {
  const failedProvider: CaptureInterpretationProvider = {
    async interpret() {
      throw new Error("A5 fixture provider outage");
    }
  };
  const app = buildApp({ databaseUrl, interpretation: { provider: failedProvider, timeoutMs: 50 } });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();
  const fallbackRawText = "I am overloaded. I want one clear direction; maintain family time; archive the side project for now.";

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);

    const capture = await app.inject({
      method: "POST",
      url: "/v1/captures",
      headers: { cookie: owner.header },
      payload: { rawText: fallbackRawText }
    });
    assert.equal(capture.statusCode, 201);
    const captureId = capture.json().id as string;

    const failedGeneration = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpretations/generate`,
      headers: { cookie: owner.header }
    });
    assert.equal(failedGeneration.statusCode, 503);
    assert.equal(failedGeneration.json().manualFallback, true);

    const manualContent = emptyContent();
    manualContent.possibleDirections.push({
      text: "Choose one clear direction",
      confidence: "high",
      sourceExcerpt: "one clear direction"
    });
    manualContent.commitments.push({
      text: "Maintain family time",
      confidence: "high",
      sourceExcerpt: "maintain family time"
    });
    manualContent.possibleProjects.push({
      text: "Side project",
      confidence: "high",
      sourceExcerpt: "side project for now"
    });

    const manual = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpretations/manual`,
      headers: { cookie: owner.header },
      payload: { baseVersion: 0, content: manualContent }
    });
    assert.equal(manual.statusCode, 201);
    assert.equal(manual.json().version, 1);
    assert.equal(manual.json().author, "user");

    const prepared = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/promotion/prepare`,
      headers: { cookie: owner.header },
      payload: {
        interpretationVersion: 1,
        activeText: "Choose one clear direction",
        maintainTexts: ["Maintain family time"],
        notNowItems: [{ text: "Side project", kind: "project_candidate" }],
        direction: { title: "Choose one clear direction" },
        season: {
          title: "Protect one clear focus",
          purpose: "Continue without depending on an AI provider.",
          primaryFocusText: "Choose one clear direction"
        }
      }
    });
    assert.equal(prepared.statusCode, 201);

    const confirmed = await app.inject({
      method: "POST",
      url: `/v1/clarity-promotions/${prepared.json().recommendationId as string}/confirm`,
      headers: { cookie: owner.header },
      payload: {
        direction: { title: "Choose one clear direction" },
        season: {
          title: "Protect one clear focus",
          purpose: "Continue without depending on an AI provider.",
          primaryFocusText: "Choose one clear direction"
        }
      }
    });
    assert.equal(confirmed.statusCode, 200);
    assert.equal(confirmed.json().direction.status, "active");
    assert.equal(confirmed.json().season.status, "active");

    const persisted = await database.pool.query<{ raw_text: string; processing_status: string }>(
      "select raw_text, processing_status from captures where id = $1 and user_id = $2",
      [captureId, ownerUserId]
    );
    assert.equal(persisted.rows[0]?.raw_text, fallbackRawText);
    assert.equal(persisted.rows[0]?.processing_status, "promoted");

    const failedInterpretationEvents = await database.pool.query<{ count: string }>(
      "select count(*)::text as count from life_events where user_id = $1 and type = 'capture.interpretation.generated'",
      [ownerUserId]
    );
    assert.equal(failedInterpretationEvents.rows[0]?.count, "0", "provider failure must not create a generated interpretation event");

    const manualEvents = await database.pool.query<{ type: string }>(
      "select type from life_events where user_id = $1 and type in ('capture.interpretation.manual','direction.confirmed','season.started')",
      [ownerUserId]
    );
    const manualEventTypes = new Set(manualEvents.rows.map((row) => row.type));
    assert.equal(manualEventTypes.has("capture.interpretation.manual"), true);
    assert.equal(manualEventTypes.has("direction.confirmed"), true);
    assert.equal(manualEventTypes.has("season.started"), true);
  } finally {
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
    await app.close();
  }
});
