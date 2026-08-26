import assert from "node:assert/strict";
import test from "node:test";
import type { ClarityPromotionDraftInput } from "@lifeos/domain";
import { createApiClient } from "./api";

const input: ClarityPromotionDraftInput = {
  interpretationVersion: 2,
  activeText: "Build LifeOS",
  maintainTexts: ["Maintain health"],
  notNowItems: [{ text: "AOP", kind: "project_candidate" }],
  direction: { title: "Build LifeOS" },
  season: {
    title: "Ship the loop",
    purpose: "Reach a usable clarity-to-direction flow.",
    primaryFocusText: "Build LifeOS"
  }
};

const draft = {
  recommendationId: "11111111-1111-4111-8111-111111111111",
  captureId: "22222222-2222-4222-8222-222222222222",
  interpretationVersion: 2,
  direction: {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Build LifeOS",
    status: "draft",
    sourceCaptureId: "22222222-2222-4222-8222-222222222222",
    createdAt: "2026-08-26T00:00:00.000Z",
    updatedAt: "2026-08-26T00:00:00.000Z"
  },
  season: {
    id: "44444444-4444-4444-8444-444444444444",
    directionId: "33333333-3333-4333-8333-333333333333",
    title: "Ship the loop",
    purpose: "Reach a usable clarity-to-direction flow.",
    status: "draft",
    primaryFocusText: "Build LifeOS",
    createdAt: "2026-08-26T00:00:00.000Z",
    updatedAt: "2026-08-26T00:00:00.000Z"
  },
  activeText: "Build LifeOS",
  maintainTexts: ["Maintain health"],
  notNowItems: [{ text: "AOP", kind: "project_candidate" }],
  recommendationStatus: "shown"
};

const current = {
  direction: {
    ...draft.direction,
    status: "active",
    confirmedAt: "2026-08-26T00:01:00.000Z"
  },
  season: {
    ...draft.season,
    status: "active"
  }
};

test("A4 Web client prepares, confirms and reloads Direction using cookie-owned endpoints", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const responses: unknown[] = [draft, { ...current, incubatorItems: [] }, current];

  try {
    globalThis.fetch = async (request, init) => {
      const call = init === undefined ? { url: String(request) } : { url: String(request), init };
      calls.push(call);
      return new Response(JSON.stringify(responses.shift()), {
        status: calls.length === 1 ? 201 : 200,
        headers: { "content-type": "application/json" }
      });
    };

    const api = createApiClient("https://lifeos.test");
    const prepared = await api.prepareClarityPromotion(draft.captureId, input);
    assert.equal(prepared.recommendationStatus, "shown");

    const confirmed = await api.confirmClarityPromotion(draft.recommendationId, {
      direction: input.direction,
      season: input.season,
      notNowItems: input.notNowItems
    });
    assert.equal(confirmed.direction.status, "active");
    assert.equal(confirmed.season.status, "active");

    const reloaded = await api.getCurrentDirection();
    assert.equal(reloaded?.direction.id, draft.direction.id);

    assert.deepEqual(
      calls.map((call) => call.url),
      [
        "https://lifeos.test/v1/captures/22222222-2222-4222-8222-222222222222/promotion/prepare",
        "https://lifeos.test/v1/clarity-promotions/11111111-1111-4111-8111-111111111111/confirm",
        "https://lifeos.test/v1/direction/current"
      ]
    );
    assert.ok(calls.every((call) => call.init?.credentials === "include"));
    assert.equal(JSON.stringify(calls).includes("userId"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("A4 Current Direction maps 404 to empty without inventing product data", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: "not_found", message: "No active Direction/Season exists" }), {
        status: 404,
        headers: { "content-type": "application/json" }
      });
    assert.equal(await createApiClient().getCurrentDirection(), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
