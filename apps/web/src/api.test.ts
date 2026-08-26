import assert from "node:assert/strict";
import test from "node:test";
import {
  CAPTURE_INTERPRETATION_CONTRACT_ID,
  CAPTURE_INTERPRETATION_CONTRACT_VERSION,
  type CaptureInterpretationContentV1
} from "@lifeos/domain";
import { ApiRequestError, createApiClient } from "./api";

const emptyContent: CaptureInterpretationContentV1 = {
  concerns: [],
  ideas: [],
  commitments: [],
  possibleProjects: [],
  possibleDirections: [],
  questions: [],
  uncertainties: []
};

test("typed API client accepts canonical health and rejects malformed payloads", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          status: "ok",
          service: "lifeos-api",
          timestamp: "2026-08-26T00:00:00.000Z"
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );

    const health = await createApiClient().getHealth();
    assert.equal(health.status, "ok");
    assert.equal(health.service, "lifeos-api");

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ status: "ok", service: "wrong-service" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });

    await assert.rejects(() => createApiClient().getHealth(), /does not match the LifeOS contract/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Clarity client uses cookie-owned session and canonical Capture/Interpretation endpoints", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const responses: unknown[] = [
    { status: "active", expiresAt: "2026-09-25T00:00:00.000Z" },
    {
      id: "11111111-1111-4111-8111-111111111111",
      kind: "text",
      rawText: "Too many things are competing for my attention.",
      processingStatus: "unprocessed",
      createdAt: "2026-08-26T00:00:00.000Z"
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      captureId: "11111111-1111-4111-8111-111111111111",
      version: 1,
      contractId: CAPTURE_INTERPRETATION_CONTRACT_ID,
      contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
      author: "ai",
      content: emptyContent,
      createdAt: "2026-08-26T00:00:01.000Z"
    }
  ];

  try {
    globalThis.fetch = async (input, init) => {
      calls.push({ url: String(input), init });
      const body = responses.shift();
      return new Response(JSON.stringify(body), {
        status: calls.length === 1 ? 200 : 201,
        headers: { "content-type": "application/json" }
      });
    };

    const api = createApiClient("https://lifeos.test");
    await api.bootstrapSession();
    const capture = await api.createCapture("Too many things are competing for my attention.");
    const interpretation = await api.generateInterpretation(capture.id);

    assert.equal(interpretation.version, 1);
    assert.deepEqual(
      calls.map((call) => call.url),
      [
        "https://lifeos.test/v1/session/bootstrap",
        "https://lifeos.test/v1/captures",
        "https://lifeos.test/v1/captures/11111111-1111-4111-8111-111111111111/interpretations/generate"
      ]
    );
    assert.ok(calls.every((call) => call.init?.credentials === "include"));
    assert.equal(JSON.stringify(calls).includes("userId"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("latest interpretation treats 404 as no interpretation and preserves other API failures", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: "not_found", message: "Capture has no interpretation yet" }), {
        status: 404,
        headers: { "content-type": "application/json" }
      });
    assert.equal(
      await createApiClient().getLatestInterpretation("11111111-1111-4111-8111-111111111111"),
      null
    );

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: "provider_unavailable", message: "AI unavailable", manualFallback: true }), {
        status: 503,
        headers: { "content-type": "application/json" }
      });

    await assert.rejects(
      () => createApiClient().generateInterpretation("11111111-1111-4111-8111-111111111111"),
      (error: unknown) => error instanceof ApiRequestError && error.status === 503
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
