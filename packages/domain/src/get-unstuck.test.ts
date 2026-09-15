import assert from "node:assert/strict";
import test from "node:test";
import type { ActionId, OutcomeId } from "./ids.js";
import {
  GET_UNSTUCK_FRICTIONS,
  GET_UNSTUCK_INTERVENTIONS,
  GET_UNSTUCK_STALL_THRESHOLD,
  defaultInterventionForFriction,
  describeStuckEvidence,
  isStuckEvidence,
  stuckEvidenceReasons,
  type StuckActionEvidence
} from "./get-unstuck.js";

function evidence(overrides: Partial<StuckActionEvidence> = {}): StuckActionEvidence {
  return {
    action: {
      id: "action_1" as ActionId,
      outcomeId: "outcome_1" as OutcomeId,
      title: "Viết chiến lược ra mắt",
      status: "ready",
      ...overrides.action
    },
    reasons: [],
    postponedCount: 0,
    blockedResultCount: 0,
    wrongAssumptionCount: 0,
    ...overrides
  };
}

test("every friction has exactly one deterministic default intervention", () => {
  for (const friction of GET_UNSTUCK_FRICTIONS) {
    const intervention = defaultInterventionForFriction(friction);
    assert.ok((GET_UNSTUCK_INTERVENTIONS as readonly string[]).includes(intervention), friction);
  }
  assert.equal(defaultInterventionForFriction("too_large"), "resize");
  assert.equal(defaultInterventionForFriction("blocked"), "unblock");
  assert.equal(defaultInterventionForFriction("no_longer_important"), "pause_drop");
});

test("an explicit block is stuck evidence on its own, no repetition required", () => {
  const stuck = evidence({ action: { id: "a" as ActionId, outcomeId: "o" as OutcomeId, title: "t", status: "blocked" } });
  assert.equal(isStuckEvidence(stuck), true);
  assert.deepEqual(stuckEvidenceReasons(stuck), ["blocked"]);
});

test("a single postponement or correction is not yet stuck", () => {
  assert.equal(isStuckEvidence(evidence({ postponedCount: 1 })), false);
  assert.equal(isStuckEvidence(evidence({ wrongAssumptionCount: 1 })), false);
  assert.equal(isStuckEvidence(evidence({ blockedResultCount: 1 })), false);
});

test(`repeated delay or correction reaching the threshold (${GET_UNSTUCK_STALL_THRESHOLD}) is stuck`, () => {
  assert.equal(isStuckEvidence(evidence({ postponedCount: 2 })), true);
  assert.equal(isStuckEvidence(evidence({ postponedCount: 1, blockedResultCount: 1 })), true);
  assert.equal(isStuckEvidence(evidence({ wrongAssumptionCount: 2 })), true);
  assert.deepEqual(stuckEvidenceReasons(evidence({ postponedCount: 2 })), ["repeated_delay"]);
  assert.deepEqual(stuckEvidenceReasons(evidence({ wrongAssumptionCount: 2 })), ["repeated_correction"]);
});

test("evidence sentence always states the real counted number, never a placeholder", () => {
  assert.equal(describeStuckEvidence(evidence()), "Việc này chưa có dấu hiệu bị kẹt.");
  assert.equal(describeStuckEvidence(evidence({ postponedCount: 3 })), "Việc này đã dịch chuyển 3 lần.");
  assert.equal(
    describeStuckEvidence(evidence({ action: { id: "a" as ActionId, outcomeId: "o" as OutcomeId, title: "t", status: "blocked" }, postponedCount: 1 })),
    "Việc này đang bị chặn, đã dịch chuyển 1 lần."
  );
  assert.equal(
    describeStuckEvidence(evidence({ wrongAssumptionCount: 4 })),
    "Việc này đã được sửa giả định 4 lần."
  );
});
