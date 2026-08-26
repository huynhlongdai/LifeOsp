import assert from "node:assert/strict";
import test from "node:test";
import { isNowView } from "./now-api.js";

const generatedAt = "2026-08-26T11:30:00.000Z";
const season = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Build independent income",
  purpose: "Ship one real outcome.",
  primaryFocusText: "Affiliate experiment"
};

test("B3 NOW web contract accepts each server-owned state", () => {
  assert.equal(
    isNowView({ state: "no_direction", generatedAt, message: "Choose direction first." }),
    true
  );
  assert.equal(
    isNowView({
      state: "no_ready_action",
      generatedAt,
      season,
      readyActionCount: 0,
      reason: "none_ready",
      message: "No ready Action."
    }),
    true
  );
  assert.equal(
    isNowView({ state: "blocked", generatedAt, season, blockedActionCount: 2, message: "Blocked." }),
    true
  );
  assert.equal(
    isNowView({
      state: "ready",
      generatedAt,
      season,
      action: {
        id: "00000000-0000-4000-8000-000000000002",
        title: "Select three products",
        doneCondition: "Three URLs are saved.",
        estimatedMinutes: 25,
        priority: 4
      },
      recommendation: {
        id: "00000000-0000-4000-8000-000000000003",
        title: "Select three products",
        rationale: "Explicit priority · Schedule urgency",
        confidenceClass: "direct",
        status: "shown",
        evidence: [
          {
            key: "active_context",
            label: "Active execution context",
            score: 0,
            value: { seasonId: season.id },
            strength: "direct"
          }
        ]
      }
    }),
    true
  );
});

test("B3 NOW web contract rejects client-shaped fake recommendation data", () => {
  assert.equal(
    isNowView({
      state: "ready",
      generatedAt,
      season,
      action: { id: "action", title: "Fake" },
      recommendation: {
        id: "recommendation",
        title: "Fake",
        rationale: "Client guessed this",
        confidenceClass: "direct",
        status: "shown",
        evidence: [{ key: "invented_signal", label: "Fake", score: 999, value: {}, strength: "direct" }]
      }
    }),
    false,
    "unknown evidence factors must never pass the product contract"
  );
  assert.equal(
    isNowView({
      state: "no_ready_action",
      generatedAt,
      season,
      readyActionCount: 1,
      reason: "client_ranked",
      message: "Client picked something."
    }),
    false
  );
});
