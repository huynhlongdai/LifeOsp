import assert from "node:assert/strict";
import test from "node:test";
import { createApiClient } from "./api";

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
