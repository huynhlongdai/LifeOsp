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
if (!databaseUrl) throw new Error("DATABASE_URL is required for Vertical Slice A ownership integration tests");

type App = ReturnType<typeof buildApp>;
type Database = ReturnType<typeof createDatabaseClient>;

const content: CaptureInterpretationContentV1 = {
  concerns: [],
  ideas: [],
  commitments: [{ text: "Maintain family", confidence: "high", sourceExcerpt: "maintain family" }],
  possibleProjects: [{ text: "Side project", confidence: "high", sourceExcerpt: "side project" }],
  possibleDirections: [{ text: "Focus LifeOS", confidence: "high", sourceExcerpt: "focus LifeOS" }],
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
      runtime: { provider: "fixture", model: "a5-ownership", latencyMs: 1 }
    };
  }
};

function sessionCookie(setCookieHeader: string | string[] | undefined): { header: string; token: string } {
  const setCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(setCookie);
  const match = new RegExp(`^${SESSION_COOKIE_NAME}=([^;]+)`).exec(setCookie);
  assert.ok(match?.[1]);
  const token = decodeURIComponent(match[1]);
  return { header: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`, token };
}

async function bootstrap(app: App) {
  const response = await app.inject({ method: "POST", url: "/v1/session/bootstrap" });
  assert.equal(response.statusCode, 201);
  return sessionCookie(response.headers["set-cookie"]);
}

async function userIdForToken(database: Database, token: string): Promise<string> {
  const result = await database.pool.query<{ user_id: string }>(
    "select user_id from sessions where token_hash = $1",
    [hashSessionToken(token)]
  );
  const userId = result.rows[0]?.user_id;
  assert.ok(userId);
  return userId;
}

test("Vertical Slice A ownership blocks cross-session reads and mutations", async () => {
  const app = buildApp({ databaseUrl, interpretation: { provider, timeoutMs: 500 } });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    createdUserIds.add(await userIdForToken(database, owner.token));
    const stranger = await bootstrap(app);
    createdUserIds.add(await userIdForToken(database, stranger.token));

    const capture = await app.inject({
      method: "POST",
      url: "/v1/captures",
      headers: { cookie: owner.header },
      payload: { rawText: "I want to focus LifeOS, maintain family, and leave the side project for later." }
    });
    assert.equal(capture.statusCode, 201);
    const captureId = capture.json().id as string;

    const generated = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpretations/generate`,
      headers: { cookie: owner.header }
    });
    assert.equal(generated.statusCode, 201);

    const read = await app.inject({
      method: "GET",
      url: `/v1/captures/${captureId}`,
      headers: { cookie: stranger.header }
    });
    assert.equal(read.statusCode, 404);

    const correct = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpretations/correct`,
      headers: { cookie: stranger.header },
      payload: { baseVersion: 1, content }
    });
    assert.equal(correct.statusCode, 404, "another session must not correct a private Capture");

    const prepare = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/promotion/prepare`,
      headers: { cookie: stranger.header },
      payload: {
        interpretationVersion: 1,
        activeText: "Focus LifeOS",
        maintainTexts: ["Maintain family"],
        notNowItems: [{ text: "Side project", kind: "project_candidate" }],
        direction: { title: "Stolen direction" },
        season: { title: "Stolen season", purpose: "Must never be created." }
      }
    });
    assert.equal(prepare.statusCode, 404, "another session must not prepare promotion from private evidence");

    const ownerRows = await database.pool.query<{ interpretation_count: string; recommendation_count: string }>(
      `select
        (select count(*)::text from capture_interpretations where capture_id = $1) as interpretation_count,
        (select count(*)::text from recommendations where proposed_entity_payload->>'captureId' = $1) as recommendation_count`,
      [captureId]
    );
    assert.equal(ownerRows.rows[0]?.interpretation_count, "1", "cross-owner correction must append nothing");
    assert.equal(ownerRows.rows[0]?.recommendation_count, "0", "cross-owner prepare must create nothing");
  } finally {
    for (const userId of createdUserIds) await database.pool.query("delete from users where id = $1", [userId]);
    await database.pool.end();
    await app.close();
  }
});
