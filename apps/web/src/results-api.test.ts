import assert from "node:assert/strict";
import test from "node:test";
import { ResultApiClient } from "./api/results";

test("B5 client uses v1 cookie-owned endpoints and preserves the Daily Close contract", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const close = {
    id: "11111111-1111-4111-8111-111111111111",
    date: "2026-09-13",
    actionsCompleted: 1,
    actionsPartial: 0,
    actionsPostponed: 0,
    actionsBlocked: 0,
    actionsDropped: 0,
    focusSessionsCompleted: 1,
    focusSessionsInterrupted: 0,
    focusSessionsAbandoned: 0,
    totalFocusMinutes: 25,
    createdAt: "2026-09-13T08:00:00.000Z"
  };

  try {
    globalThis.fetch = async (input, init) => {
      calls.push({ url: String(input), init });
      return new Response(JSON.stringify(close), { status: 200, headers: { "content-type": "application/json" } });
    };

    const client = new ResultApiClient("https://lifeos.test");
    assert.deepEqual(await client.getDailyClose("2026-09-13"), close);
    await client.recordDailyClose({ date: "2026-09-13", note: "Một ngày có tiến triển." });

    assert.deepEqual(calls.map((call) => call.url), [
      "https://lifeos.test/v1/daily-closes/2026-09-13",
      "https://lifeos.test/v1/daily-closes"
    ]);
    assert.ok(calls.every((call) => call.init?.credentials === "include"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
