import assert from "node:assert/strict";
import test from "node:test";
import type { CaptureInterpretationProvider } from "@lifeos/ai";
import { createDatabaseClient } from "@lifeos/db";
import { CAPTURE_INTERPRETATION_CONTRACT_VERSION, type CaptureInterpretationContentV1 } from "@lifeos/domain";
import { buildApp } from "./app.js";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./identity.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for interpretation integration tests");
}

type App = ReturnType<typeof buildApp>;
type Database = ReturnType<typeof createDatabaseClient>;

const rawText =
  "I feel overloaded by too many projects. I want to focus on finishing the website first, but I am unsure whether to pause the others.";

function interpretationFor(text: string): CaptureInterpretationContentV1 {
  const overloadedStart = text.indexOf("overloaded by too many projects");
  const overloadedEnd = overloadedStart + "overloaded by too many projects".length;
  const focusStart = text.indexOf("focus on finishing the website first");
  const focusEnd = focusStart + "focus on finishing the website first".length;
  const unsureStart = text.indexOf("unsure whether to pause the others");
  const unsureEnd = unsureStart + "unsure whether to pause the others".length;

  assert.ok(overloadedStart >= 0 && focusStart >= 0 && unsureStart >= 0);

  return {
    contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
    concerns: [
      {
        text: "Too many simultaneous projects are creating overload",
        confidenceClass: "explicit",
        source: { start: overloadedStart, end: overloadedEnd }
      }
    ],
    ideas: [],
    commitments: [],
    possibleProjects: [],
    possibleDirections: [
      {
        text: "Finishing the website first is a possible near-term direction",
        confidenceClass: "inferred",
        source: { start: focusStart, end: focusEnd }
      }
    ],
    questions: [],
    uncertainties: [
      {
        text: "Whether the other projects should be paused is unresolved",
        confidenceClass: "uncertain",
        source: { start: unsureStart, end: unsureEnd }
      }
    ]
  };
}

function correctedInterpretationFor(text: string): CaptureInterpretationContentV1 {
  const focusStart = text.indexOf("focus on finishing the website first");
  const focusEnd = focusStart + "focus on finishing the website first".length;
  const unsureStart = text.indexOf("unsure whether to pause the others");
  const unsureEnd = unsureStart + "unsure whether to pause the others".length;

  assert.ok(focusStart >= 0 && unsureStart >= 0);

  return {
    contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
    concerns: [],
    ideas: [],
    commitments: [
      {
        text: "Focus on finishing the website first",
        confidenceClass: "explicit",
        source: { start: focusStart, end: focusEnd }
      }
    ],
    possibleProjects: [],
    possibleDirections: [],
    questions: [
      {
        text: "Should the other projects be paused?",
        confidenceClass: "uncertain",
        source: { start: unsureStart, end: unsureEnd }
      }
    ],
    uncertainties: []
  };
}

function sessionCookieFromResponse(setCookieHeader: string | string[] | undefined): {
  header: string;
  token: string;
} {
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
  assert.ok(userId);
  return userId;
}

async function createCapture(app: App, cookieHeader: string, text = rawText): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/v1/captures",
    headers: { cookie: cookieHeader },
    payload: { rawText: text }
  });
  assert.equal(response.statusCode, 201);
  const captureId = response.json().id as string;
  assert.ok(captureId);
  return captureId;
}

async function deleteUsers(database: Database, userIds: Set<string>) {
  for (const userId of userIds) {
    await database.pool.query("delete from users where id = $1", [userId]);
  }
}

async function interpretationCount(database: Database, captureId: string): Promise<number> {
  const result = await database.pool.query<{ count: string }>(
    "select count(*)::text as count from capture_interpretations where capture_id = $1",
    [captureId]
  );
  return Number(result.rows[0]?.count ?? "0");
}

async function captureState(database: Database, captureId: string) {
  const result = await database.pool.query<{ raw_text: string; processing_status: string }>(
    "select raw_text, processing_status from captures where id = $1",
    [captureId]
  );
  const row = result.rows[0];
  assert.ok(row);
  return row;
}

test("provider-unavailable interpretation preserves Capture and manual fallback can complete version 1", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const userIds = new Set<string>();

  try {
    const cookie = await bootstrap(app);
    userIds.add(await userIdForToken(database, cookie.token));
    const captureId = await createCapture(app, cookie.header);

    const aiAttempt = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpret`,
      headers: { cookie: cookie.header }
    });
    assert.equal(aiAttempt.statusCode, 200);
    assert.equal(aiAttempt.json().status, "manual_required");
    assert.equal(aiAttempt.json().reason, "provider_unavailable");
    assert.equal(aiAttempt.json().template.contractVersion, CAPTURE_INTERPRETATION_CONTRACT_VERSION);
    assert.equal(await interpretationCount(database, captureId), 0);
    assert.deepEqual(await captureState(database, captureId), {
      raw_text: rawText,
      processing_status: "unprocessed"
    });

    const manual = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpretations`,
      headers: { cookie: cookie.header },
      payload: { content: interpretationFor(rawText) }
    });
    assert.equal(manual.statusCode, 201);
    assert.equal(manual.json().version, 1);
    assert.equal(manual.json().source, "user");
    assert.equal(await interpretationCount(database, captureId), 1);
    assert.equal((await captureState(database, captureId)).processing_status, "interpreted");

    const laterAiAttempt = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpret`,
      headers: { cookie: cookie.header }
    });
    assert.equal(laterAiAttempt.statusCode, 409, "AI must not silently replace an existing interpretation");
  } finally {
    await deleteUsers(database, userIds);
    await database.pool.end();
    await app.close();
  }
});

test("invalid, failed and timed-out providers never persist output and remain manually recoverable", async () => {
  let mode: "invalid" | "error" | "timeout" = "invalid";
  const provider: CaptureInterpretationProvider = {
    async interpret(request) {
      if (mode === "error") throw new Error("provider-specific failure");
      if (mode === "timeout") return new Promise<unknown>(() => undefined);

      const invalid = interpretationFor(request.rawText) as CaptureInterpretationContentV1 & {
        reasoning?: string;
      };
      invalid.reasoning = "must never become durable output";
      return invalid;
    }
  };

  const app = buildApp({
    databaseUrl,
    interpretation: { provider, timeoutMs: 5 }
  });
  const database = createDatabaseClient(databaseUrl);
  const userIds = new Set<string>();

  try {
    const cookie = await bootstrap(app);
    userIds.add(await userIdForToken(database, cookie.token));
    const captureId = await createCapture(app, cookie.header);

    const invalid = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpret`,
      headers: { cookie: cookie.header }
    });
    assert.equal(invalid.statusCode, 200);
    assert.equal(invalid.json().reason, "invalid_output");
    assert.equal(await interpretationCount(database, captureId), 0);

    mode = "error";
    const failed = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpret`,
      headers: { cookie: cookie.header }
    });
    assert.equal(failed.statusCode, 200);
    assert.equal(failed.json().reason, "provider_error");
    assert.equal(await interpretationCount(database, captureId), 0);

    mode = "timeout";
    const timedOut = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpret`,
      headers: { cookie: cookie.header }
    });
    assert.equal(timedOut.statusCode, 200);
    assert.equal(timedOut.json().reason, "timeout");
    assert.equal(await interpretationCount(database, captureId), 0);
    assert.deepEqual(await captureState(database, captureId), {
      raw_text: rawText,
      processing_status: "unprocessed"
    });

    const recovered = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpretations`,
      headers: { cookie: cookie.header },
      payload: { content: interpretationFor(rawText) }
    });
    assert.equal(recovered.statusCode, 201);
    assert.equal(recovered.json().version, 1);
    assert.equal(recovered.json().source, "user");
  } finally {
    await deleteUsers(database, userIds);
    await database.pool.end();
    await app.close();
  }
});

test("validated AI interpretation can be explicitly corrected without rewriting version 1 or Capture rawText", async () => {
  const provider: CaptureInterpretationProvider = {
    async interpret(request) {
      return interpretationFor(request.rawText);
    }
  };
  const app = buildApp({ databaseUrl, interpretation: { provider, timeoutMs: 100 } });
  const database = createDatabaseClient(databaseUrl);
  const userIds = new Set<string>();

  try {
    const firstCookie = await bootstrap(app);
    const firstUserId = await userIdForToken(database, firstCookie.token);
    userIds.add(firstUserId);
    const captureId = await createCapture(app, firstCookie.header);

    const ai = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpret`,
      headers: { cookie: firstCookie.header }
    });
    assert.equal(ai.statusCode, 201);
    assert.equal(ai.json().version, 1);
    assert.equal(ai.json().source, "ai");
    const versionOne = ai.json().content;
    assert.equal((await captureState(database, captureId)).processing_status, "interpreted");

    const duplicateAi = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpret`,
      headers: { cookie: firstCookie.header }
    });
    assert.equal(duplicateAi.statusCode, 409);

    const invalidCorrection = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpretations`,
      headers: { cookie: firstCookie.header },
      payload: {
        content: {
          ...correctedInterpretationFor(rawText),
          reasoning: "not part of the durable contract"
        }
      }
    });
    assert.equal(invalidCorrection.statusCode, 400);
    assert.equal(await interpretationCount(database, captureId), 1);

    const correction = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpretations`,
      headers: { cookie: firstCookie.header },
      payload: { content: correctedInterpretationFor(rawText) }
    });
    assert.equal(correction.statusCode, 201);
    assert.equal(correction.json().version, 2);
    assert.equal(correction.json().source, "user");
    assert.equal((await captureState(database, captureId)).processing_status, "corrected");

    const history = await app.inject({
      method: "GET",
      url: `/v1/captures/${captureId}/interpretations`,
      headers: { cookie: firstCookie.header }
    });
    assert.equal(history.statusCode, 200);
    const versions = history.json();
    assert.equal(versions.length, 2);
    assert.deepEqual(versions[0].content, versionOne, "version 1 must remain unchanged after correction");
    assert.deepEqual(versions[1].content, correctedInterpretationFor(rawText));

    const state = await captureState(database, captureId);
    assert.equal(state.raw_text, rawText, "correction must never rewrite Capture rawText");

    const events = await database.pool.query<{ type: string; source: string; payload: unknown }>(
      "select type, source, payload from life_events where user_id = $1 and entity_type = 'capture_interpretation' order by occurred_at asc",
      [firstUserId]
    );
    assert.equal(events.rowCount, 2);
    assert.deepEqual(events.rows.map((event) => event.type), [
      "capture.interpretation.created",
      "capture.interpretation.corrected"
    ]);
    assert.deepEqual(events.rows.map((event) => event.source), ["ai", "user"]);
    assert.equal(JSON.stringify(events.rows).includes("Too many simultaneous projects"), false);

    const secondCookie = await bootstrap(app);
    userIds.add(await userIdForToken(database, secondCookie.token));
    const crossOwnerHistory = await app.inject({
      method: "GET",
      url: `/v1/captures/${captureId}/interpretations`,
      headers: { cookie: secondCookie.header }
    });
    assert.equal(crossOwnerHistory.statusCode, 404);

    const crossOwnerCorrection = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpretations`,
      headers: { cookie: secondCookie.header },
      payload: { content: correctedInterpretationFor(rawText) }
    });
    assert.equal(crossOwnerCorrection.statusCode, 404);
    assert.equal(await interpretationCount(database, captureId), 2);
  } finally {
    await deleteUsers(database, userIds);
    await database.pool.end();
    await app.close();
  }
});

test("failed correction audit event rolls back the new version and Capture status change", async () => {
  const provider: CaptureInterpretationProvider = {
    async interpret(request) {
      return interpretationFor(request.rawText);
    }
  };
  const app = buildApp({ databaseUrl, interpretation: { provider, timeoutMs: 100 } });
  const database = createDatabaseClient(databaseUrl);
  const userIds = new Set<string>();

  try {
    const cookie = await bootstrap(app);
    userIds.add(await userIdForToken(database, cookie.token));
    const captureId = await createCapture(app, cookie.header);

    const initial = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpret`,
      headers: { cookie: cookie.header }
    });
    assert.equal(initial.statusCode, 201);
    assert.equal(await interpretationCount(database, captureId), 1);

    await database.pool.query(`
      create or replace function test_fail_interpretation_correction_event()
      returns trigger
      language plpgsql
      as $$
      begin
        if new.type = 'capture.interpretation.corrected' then
          raise exception 'forced interpretation correction event failure';
        end if;
        return new;
      end;
      $$
    `);
    await database.pool.query(`
      create trigger test_fail_interpretation_correction_event_trigger
      before insert on life_events
      for each row execute function test_fail_interpretation_correction_event()
    `);

    const correction = await app.inject({
      method: "POST",
      url: `/v1/captures/${captureId}/interpretations`,
      headers: { cookie: cookie.header },
      payload: { content: correctedInterpretationFor(rawText) }
    });
    assert.equal(correction.statusCode, 500);
    assert.equal(await interpretationCount(database, captureId), 1, "failed audit event must roll back version 2");
    assert.deepEqual(await captureState(database, captureId), {
      raw_text: rawText,
      processing_status: "interpreted"
    });
  } finally {
    await database.pool.query(
      "drop trigger if exists test_fail_interpretation_correction_event_trigger on life_events"
    );
    await database.pool.query("drop function if exists test_fail_interpretation_correction_event()");
    await deleteUsers(database, userIds);
    await database.pool.end();
    await app.close();
  }
});
