import assert from "node:assert/strict";
import test from "node:test";
import type { CaptureInterpretationProvider } from "@lifeos/ai";
import { createDatabaseClient } from "@lifeos/db";
import {
  CAPTURE_INTERPRETATION_CONTRACT_ID,
  CAPTURE_INTERPRETATION_CONTRACT_VERSION
} from "@lifeos/domain";
import { buildApp } from "./app.js";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./identity.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for interpretation race integration tests");
}

const rawText = "I feel overloaded by too many projects and want to focus on one thing first.";

function sessionCookie(setCookieHeader: string | string[] | undefined) {
  const setCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(setCookie, "expected Set-Cookie header");
  const match = new RegExp(`^${SESSION_COOKIE_NAME}=([^;]+)`).exec(setCookie);
  assert.ok(match?.[1], "expected LifeOS session cookie");
  const token = decodeURIComponent(match[1]);
  return {
    header: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    token
  };
}

test("concurrent AI generation appends only version 1", async () => {
  let providerCalls = 0;
  let releaseProvider: (() => void) | undefined;
  const bothRequestsReachedProvider = new Promise<void>((resolve) => {
    releaseProvider = resolve;
  });

  const provider: CaptureInterpretationProvider = {
    async interpret() {
      providerCalls += 1;
      if (providerCalls === 2) releaseProvider?.();
      await bothRequestsReachedProvider;
      return {
        output: {
          contractId: CAPTURE_INTERPRETATION_CONTRACT_ID,
          contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
          content: {
            concerns: [
              {
                text: "Too many simultaneous projects are creating overload",
                confidence: "high",
                sourceExcerpt: "overloaded by too many projects"
              }
            ],
            ideas: [],
            commitments: [],
            possibleProjects: [],
            possibleDirections: [],
            questions: [],
            uncertainties: []
          }
        }
      };
    }
  };

  const app = buildApp({ databaseUrl, interpretation: { provider, timeoutMs: 1_000 } });
  const database = createDatabaseClient(databaseUrl);
  let userId: string | undefined;

  try {
    const bootstrap = await app.inject({ method: "POST", url: "/v1/session/bootstrap" });
    assert.equal(bootstrap.statusCode, 201);
    const cookie = sessionCookie(bootstrap.headers["set-cookie"]);

    const session = await database.pool.query<{ user_id: string }>(
      "select user_id from sessions where token_hash = $1",
      [hashSessionToken(cookie.token)]
    );
    userId = session.rows[0]?.user_id;
    assert.ok(userId);

    const capture = await app.inject({
      method: "POST",
      url: "/v1/captures",
      headers: { cookie: cookie.header },
      payload: { rawText }
    });
    assert.equal(capture.statusCode, 201);
    const captureId = capture.json().id as string;
    assert.ok(captureId);

    const request = () =>
      app.inject({
        method: "POST",
        url: `/v1/captures/${captureId}/interpretations/generate`,
        headers: { cookie: cookie.header }
      });

    const [first, second] = await Promise.all([request(), request()]);
    assert.equal(providerCalls, 2, "both requests must reach the provider before either persistence write");
    assert.deepEqual(
      [first.statusCode, second.statusCode].sort((a, b) => a - b),
      [201, 409],
      "exactly one AI request may append the initial interpretation"
    );

    const conflict = first.statusCode === 409 ? first.json() : second.json();
    assert.equal(conflict.error, "version_conflict");
    assert.equal(conflict.latestVersion, 1);

    const rows = await database.pool.query<{ version: number; author: string }>(
      "select version, author from capture_interpretations where capture_id = $1 order by version asc",
      [captureId]
    );
    assert.deepEqual(rows.rows, [{ version: 1, author: "ai" }]);

    const captureState = await database.pool.query<{ processing_status: string }>(
      "select processing_status from captures where id = $1",
      [captureId]
    );
    assert.equal(captureState.rows[0]?.processing_status, "interpreted");

    const events = await database.pool.query<{ type: string }>(
      "select type from life_events where entity_type = 'capture_interpretation' and payload->>'captureId' = $1",
      [captureId]
    );
    assert.deepEqual(events.rows, [{ type: "capture.interpretation.generated" }]);
  } finally {
    if (userId) {
      await database.pool.query("delete from users where id = $1", [userId]);
    }
    await database.pool.end();
    await app.close();
  }
});
