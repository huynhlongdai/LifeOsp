import assert from "node:assert/strict";
import test from "node:test";
import {
  CAPTURE_INTERPRETATION_CONTRACT_ID,
  CAPTURE_INTERPRETATION_CONTRACT_VERSION,
  type CaptureInterpretationContentV1,
  type ClarityPromotionDraftInput
} from "@lifeos/domain";
import { createApiClient } from "./api";

const captureId = "11111111-1111-4111-8111-111111111111";
const interpretationV1Id = "22222222-2222-4222-8222-222222222222";
const interpretationV2Id = "33333333-3333-4333-8333-333333333333";
const recommendationId = "44444444-4444-4444-8444-444444444444";
const directionId = "55555555-5555-4555-8555-555555555555";
const seasonId = "66666666-6666-4666-8666-666666666666";
const rawText = "Need state: overloaded\nBrain Dump: focus LifeOS, maintain family, ThingsO later.";

const v1: CaptureInterpretationContentV1 = {
  concerns: [],
  ideas: [],
  commitments: [{ text: "Maintain family", confidence: "high" }],
  possibleProjects: [{ text: "ThingsO later", confidence: "medium" }],
  possibleDirections: [{ text: "Focus LifeOS", confidence: "medium" }],
  questions: [],
  uncertainties: []
};

const v2: CaptureInterpretationContentV1 = {
  ...v1,
  possibleDirections: [{ text: "Build LifeOS every day", confidence: "high" }]
};

const promotionInput: ClarityPromotionDraftInput = {
  interpretationVersion: 2,
  activeText: "Build LifeOS every day",
  maintainTexts: ["Maintain family"],
  notNowItems: [{ text: "ThingsO later", kind: "project_candidate" }],
  direction: { title: "Build a usable LifeOS" },
  season: {
    title: "Complete the first operating loop",
    purpose: "Make clarity-to-direction usable.",
    primaryFocusText: "Build LifeOS every day"
  }
};

test("A5 Web boundary follows the complete canonical Vertical Slice A route sequence", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const responses: Array<{ status: number; body: unknown }> = [
    { status: 200, body: { status: "active", expiresAt: "2026-09-25T00:00:00.000Z" } },
    {
      status: 201,
      body: {
        id: captureId,
        kind: "text",
        rawText,
        processingStatus: "unprocessed",
        createdAt: "2026-08-26T00:00:00.000Z"
      }
    },
    {
      status: 201,
      body: {
        id: interpretationV1Id,
        captureId,
        version: 1,
        contractId: CAPTURE_INTERPRETATION_CONTRACT_ID,
        contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
        author: "ai",
        content: v1,
        createdAt: "2026-08-26T00:00:01.000Z"
      }
    },
    {
      status: 201,
      body: {
        id: interpretationV2Id,
        captureId,
        version: 2,
        contractId: CAPTURE_INTERPRETATION_CONTRACT_ID,
        contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
        author: "user",
        content: v2,
        createdAt: "2026-08-26T00:00:02.000Z"
      }
    },
    {
      status: 201,
      body: {
        recommendationId,
        captureId,
        interpretationVersion: 2,
        direction: {
          id: directionId,
          title: "Build a usable LifeOS",
          status: "draft",
          sourceCaptureId: captureId,
          createdAt: "2026-08-26T00:00:03.000Z",
          updatedAt: "2026-08-26T00:00:03.000Z"
        },
        season: {
          id: seasonId,
          directionId,
          title: "Complete the first operating loop",
          purpose: "Make clarity-to-direction usable.",
          status: "draft",
          primaryFocusText: "Build LifeOS every day",
          createdAt: "2026-08-26T00:00:03.000Z",
          updatedAt: "2026-08-26T00:00:03.000Z"
        },
        activeText: "Build LifeOS every day",
        maintainTexts: ["Maintain family"],
        notNowItems: [{ text: "ThingsO later", kind: "project_candidate" }],
        recommendationStatus: "shown"
      }
    },
    {
      status: 200,
      body: {
        direction: {
          id: directionId,
          title: "Build a usable LifeOS",
          status: "active",
          sourceCaptureId: captureId,
          confirmedAt: "2026-08-26T00:00:04.000Z",
          createdAt: "2026-08-26T00:00:03.000Z",
          updatedAt: "2026-08-26T00:00:04.000Z"
        },
        season: {
          id: seasonId,
          directionId,
          title: "Complete the first operating loop",
          purpose: "Make clarity-to-direction usable.",
          status: "active",
          primaryFocusText: "Build LifeOS every day",
          createdAt: "2026-08-26T00:00:03.000Z",
          updatedAt: "2026-08-26T00:00:04.000Z"
        },
        incubatorItems: []
      }
    },
    {
      status: 200,
      body: {
        id: captureId,
        kind: "text",
        rawText,
        processingStatus: "promoted",
        createdAt: "2026-08-26T00:00:00.000Z"
      }
    },
    {
      status: 200,
      body: {
        id: interpretationV2Id,
        captureId,
        version: 2,
        contractId: CAPTURE_INTERPRETATION_CONTRACT_ID,
        contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
        author: "user",
        content: v2,
        createdAt: "2026-08-26T00:00:02.000Z"
      }
    },
    {
      status: 200,
      body: {
        direction: {
          id: directionId,
          title: "Build a usable LifeOS",
          status: "active",
          sourceCaptureId: captureId,
          confirmedAt: "2026-08-26T00:00:04.000Z",
          createdAt: "2026-08-26T00:00:03.000Z",
          updatedAt: "2026-08-26T00:00:04.000Z"
        },
        season: {
          id: seasonId,
          directionId,
          title: "Complete the first operating loop",
          purpose: "Make clarity-to-direction usable.",
          status: "active",
          primaryFocusText: "Build LifeOS every day",
          createdAt: "2026-08-26T00:00:03.000Z",
          updatedAt: "2026-08-26T00:00:04.000Z"
        }
      }
    }
  ];

  try {
    globalThis.fetch = async (input, init) => {
      calls.push({ url: String(input), init });
      const next = responses.shift();
      assert.ok(next, "unexpected extra Web API request");
      return new Response(JSON.stringify(next.body), {
        status: next.status,
        headers: { "content-type": "application/json" }
      });
    };

    const api = createApiClient("https://lifeos.test");
    const session = await api.bootstrapSession();
    assert.equal(session.status, "active");

    const capture = await api.createCapture(rawText);
    const generated = await api.generateInterpretation(capture.id);
    const corrected = await api.correctInterpretation(capture.id, generated.version, v2);
    const prepared = await api.prepareClarityPromotion(capture.id, promotionInput);
    const confirmed = await api.confirmClarityPromotion(prepared.recommendationId, {
      direction: promotionInput.direction,
      season: promotionInput.season
    });

    assert.equal(corrected.version, 2);
    assert.equal(prepared.recommendationStatus, "shown");
    assert.equal(confirmed.direction.status, "active");
    assert.equal(confirmed.season.status, "active");

    const restoredCapture = await api.getCapture(capture.id);
    const restoredInterpretation = await api.getLatestInterpretation(capture.id);
    const restoredDirection = await api.getCurrentDirection();
    assert.equal(restoredCapture.processingStatus, "promoted");
    assert.equal(restoredInterpretation?.version, 2);
    assert.equal(restoredDirection?.direction.id, directionId);

    assert.deepEqual(
      calls.map((call) => call.url),
      [
        "https://lifeos.test/v1/session/bootstrap",
        `https://lifeos.test/v1/captures`,
        `https://lifeos.test/v1/captures/${captureId}/interpretations/generate`,
        `https://lifeos.test/v1/captures/${captureId}/interpretations/correct`,
        `https://lifeos.test/v1/captures/${captureId}/promotion/prepare`,
        `https://lifeos.test/v1/clarity-promotions/${recommendationId}/confirm`,
        `https://lifeos.test/v1/captures/${captureId}`,
        `https://lifeos.test/v1/captures/${captureId}/interpretations/latest`,
        "https://lifeos.test/v1/direction/current"
      ]
    );
    assert.ok(calls.every((call) => call.init?.credentials === "include"));
    assert.equal(JSON.stringify(calls).includes("userId"), false, "Web must never select server ownership");
    assert.equal(responses.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
