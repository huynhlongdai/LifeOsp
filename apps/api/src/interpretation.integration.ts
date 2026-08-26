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
if (!databaseUrl) throw new Error("DATABASE_URL is required for Interpretation integration tests");

type App = ReturnType<typeof buildApp>;
type Database = ReturnType<typeof createDatabaseClient>;

function sessionCookieFromResponse(setCookieHeader: string | string[] | undefined): { header: string; token: string } {
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

async function createCapture(app: App, cookie: string, rawText: string): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/v1/captures",
    headers: { cookie },
    payload: { rawText }
  });
  assert.equal(response.statusCode, 201);
  return response.json().id as string;
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

function providerOutput(content: CaptureInterpretationContentV1) {
  return {
    contractId: CAPTURE_INTERPRETATION_CONTRACT_ID,
    contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
    content
  };
}

test("AI interpretation is append-only, correction is auditable, stale writes conflict, and ownership stays private", async () => {
  const rawText = "Tôi đang rối vì quá nhiều việc. Tôi muốn tập trung LifeOS trong giai đoạn này.";
  const generatedContent = emptyContent();
  generatedContent.concerns.push({
    text: "Đang rối vì quá nhiều việc",
    confidence: "high",
    sourceExcerpt: "Tôi đang rối vì quá nhiều việc"
  });
  generatedContent.possibleDirections.push({
    text: "Tập trung LifeOS",
    confidence: "medium",
    sourceExcerpt: "Tôi muốn tập trung LifeOS"
  });

  const provider: CaptureInterpretationProvider = {
    async interpret() {
      return {
        output: providerOutput(generatedContent),
        runtime: { provider: "fixture", model: "fixture-v1", requestId: "fixture-request", latencyMs: 1 }
      };
    }
  };

  const app = buildApp({ databaseUrl, interpretation: { provider, timeoutMs: 500 } });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const ownerCookie = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, ownerCookie.token);
    createdUserIds.add(ownerUserId);
    const captureId = await createCapture(app, ownerCookie.header, rawText);

    const generated = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpretations/generate`,
      headers: { cookie: ownerCookie.header }
    });
    assert.equal(generated.statusCode, 201);
    assert.equal(generated.json().version, 1);
    assert.equal(generated.json().author, "ai");

    const persistedAfterGenerate = await database.pool.query<{
      raw_text: string;
      processing_status: string;
      interpretation_count: string;
    }>(
      `select c.raw_text, c.processing_status,
              (select count(*)::text from capture_interpretations ci where ci.capture_id = c.id) as interpretation_count
         from captures c where c.id = $1 and c.user_id = $2`,
      [captureId, ownerUserId]
    );
    assert.equal(persistedAfterGenerate.rows[0]?.raw_text, rawText, "interpretation must never rewrite Capture rawText");
    assert.equal(persistedAfterGenerate.rows[0]?.processing_status, "interpreted");
    assert.equal(persistedAfterGenerate.rows[0]?.interpretation_count, "1");

    const correctedContent = structuredClone(generatedContent);
    correctedContent.possibleDirections[0] = {
      text: "Tập trung LifeOS trong giai đoạn này",
      confidence: "high",
      sourceExcerpt: "Tôi muốn tập trung LifeOS trong giai đoạn này"
    };

    const corrected = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpretations/correct`,
      headers: { cookie: ownerCookie.header },
      payload: { baseVersion: 1, content: correctedContent }
    });
    assert.equal(corrected.statusCode, 201);
    assert.equal(corrected.json().version, 2);
    assert.equal(corrected.json().author, "user");

    const staleCorrection = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpretations/correct`,
      headers: { cookie: ownerCookie.header },
      payload: { baseVersion: 1, content: correctedContent }
    });
    assert.equal(staleCorrection.statusCode, 409);
    assert.equal(staleCorrection.json().latestVersion, 2);

    const latest = await app.inject({
      method: "GET",
      url: `/v1/captures/${captureId}/interpretations/latest`,
      headers: { cookie: ownerCookie.header }
    });
    assert.equal(latest.statusCode, 200);
    assert.equal(latest.json().version, 2);
    assert.deepEqual(latest.json().content, correctedContent);

    const persistedAfterCorrection = await database.pool.query<{
      raw_text: string;
      processing_status: string;
      interpretation_count: string;
    }>(
      `select c.raw_text, c.processing_status,
              (select count(*)::text from capture_interpretations ci where ci.capture_id = c.id) as interpretation_count
         from captures c where c.id = $1 and c.user_id = $2`,
      [captureId, ownerUserId]
    );
    assert.equal(persistedAfterCorrection.rows[0]?.raw_text, rawText);
    assert.equal(persistedAfterCorrection.rows[0]?.processing_status, "corrected");
    assert.equal(persistedAfterCorrection.rows[0]?.interpretation_count, "2", "stale correction must not append a version");

    const events = await database.pool.query<{ type: string; source: string; payload: Record<string, unknown> }>(
      `select type, source, payload from life_events
        where user_id = $1 and type in ('capture.interpretation.generated', 'capture.interpretation.corrected')
        order by occurred_at asc`,
      [ownerUserId]
    );
    assert.equal(events.rowCount, 2);
    assert.deepEqual(events.rows.map((row) => row.type), [
      "capture.interpretation.generated",
      "capture.interpretation.corrected"
    ]);
    assert.deepEqual(events.rows.map((row) => row.source), ["ai", "user"]);
    assert.equal(JSON.stringify(events.rows).includes(rawText), false, "LifeEvents must not duplicate private raw Capture text");

    const otherCookie = await bootstrap(app);
    const otherUserId = await userIdForToken(database, otherCookie.token);
    createdUserIds.add(otherUserId);
    const crossOwner = await app.inject({
      method: "GET",
      url: `/v1/captures/${captureId}/interpretations/latest`,
      headers: { cookie: otherCookie.header }
    });
    assert.equal(crossOwner.statusCode, 404);
  } finally {
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
    await app.close();
  }
});

test("invalid/provider-failed AI output persists nothing and manual fallback remains usable", async () => {
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();
  const rawText = "Tôi chưa rõ nên làm gì tiếp theo.";

  const invalidProvider: CaptureInterpretationProvider = {
    async interpret() {
      return {
        output: {
          contractId: CAPTURE_INTERPRETATION_CONTRACT_ID,
          contractVersion: 1,
          chainOfThought: "must never be persisted",
          content: emptyContent()
        }
      };
    }
  };

  let app: App | null = buildApp({ databaseUrl, interpretation: { provider: invalidProvider } });

  try {
    const cookie = await bootstrap(app);
    const userId = await userIdForToken(database, cookie.token);
    createdUserIds.add(userId);
    const captureId = await createCapture(app, cookie.header, rawText);

    const invalid = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpretations/generate`,
      headers: { cookie: cookie.header }
    });
    assert.equal(invalid.statusCode, 422);
    assert.equal(invalid.json().manualFallback, true);

    let count = await database.pool.query<{ count: string }>(
      "select count(*)::text as count from capture_interpretations where capture_id = $1",
      [captureId]
    );
    assert.equal(count.rows[0]?.count, "0", "invalid provider output must not become durable state");

    await app.close();
    const failedProvider: CaptureInterpretationProvider = {
      async interpret() {
        throw new Error("fixture provider outage");
      }
    };
    app = buildApp({ databaseUrl, interpretation: { provider: failedProvider, timeoutMs: 50 } });

    const failed = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpretations/generate`,
      headers: { cookie: cookie.header }
    });
    assert.equal(failed.statusCode, 503);
    assert.equal(failed.json().manualFallback, true);

    count = await database.pool.query<{ count: string }>(
      "select count(*)::text as count from capture_interpretations where capture_id = $1",
      [captureId]
    );
    assert.equal(count.rows[0]?.count, "0", "provider failure must not create an interpretation");

    const manualContent = emptyContent();
    manualContent.uncertainties.push({
      text: "Chưa rõ việc tiếp theo",
      confidence: "high",
      sourceExcerpt: "chưa rõ nên làm gì tiếp theo"
    });
    const manual = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpretations/manual`,
      headers: { cookie: cookie.header },
      payload: { baseVersion: 0, content: manualContent }
    });
    assert.equal(manual.statusCode, 201);
    assert.equal(manual.json().version, 1);
    assert.equal(manual.json().author, "user");

    const capture = await database.pool.query<{ raw_text: string; processing_status: string }>(
      "select raw_text, processing_status from captures where id = $1",
      [captureId]
    );
    assert.equal(capture.rows[0]?.raw_text, rawText);
    assert.equal(capture.rows[0]?.processing_status, "interpreted");
  } finally {
    if (app) await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});
