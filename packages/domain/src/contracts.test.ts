import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTION_STATUSES,
  CAPTURE_INTERPRETATION_CONTRACT_ID,
  CAPTURE_INTERPRETATION_CONTRACT_VERSION,
  CAPTURE_KINDS,
  CAPTURE_PROCESSING_STATUSES,
  INTERPRETATION_CATEGORIES,
  INTERPRETATION_CONFIDENCE_CLASSES,
  LIFE_EVENT_SOURCES,
  MISSING_NEXT_ACTION_CONTRACT_ID,
  MISSING_NEXT_ACTION_CONTRACT_VERSION,
  NEED_STATES,
  OUTCOME_STATUSES,
  PROJECT_STATUSES
} from "./index.js";

test("NeedState values match the canonical contract", () => {
  assert.deepEqual(NEED_STATES, [
    "unclear_direction",
    "dont_know_what_to_do",
    "overloaded",
    "procrastinating",
    "abandoning_goals",
    "rebalance_life",
    "learning_not_applying",
    "other"
  ]);
});

test("Capture kinds match the canonical contract", () => {
  assert.deepEqual(CAPTURE_KINDS, ["text", "voice_transcript", "quick_note", "distraction"]);
});

test("Capture processing statuses match the canonical contract", () => {
  assert.deepEqual(CAPTURE_PROCESSING_STATUSES, ["unprocessed", "interpreted", "corrected", "promoted", "archived"]);
});

test("Capture Interpretation V1 identifiers and categories remain canonical", () => {
  assert.equal(CAPTURE_INTERPRETATION_CONTRACT_ID, "capture-interpretation-v1");
  assert.equal(CAPTURE_INTERPRETATION_CONTRACT_VERSION, 1);
  assert.deepEqual(INTERPRETATION_CATEGORIES, [
    "concerns",
    "ideas",
    "commitments",
    "possibleProjects",
    "possibleDirections",
    "questions",
    "uncertainties"
  ]);
  assert.deepEqual(INTERPRETATION_CONFIDENCE_CLASSES, ["low", "medium", "high"]);
});

test("LifeEvent sources match the canonical producers", () => {
  assert.deepEqual(LIFE_EVENT_SOURCES, ["user", "system", "ai", "import"]);
});

test("B0 Outcome and Project states stay aligned with the canonical execution model", () => {
  assert.deepEqual(OUTCOME_STATUSES, ["active", "achieved", "paused", "dropped"]);
  assert.deepEqual(PROJECT_STATUSES, ["candidate", "active", "paused", "completed", "dropped"]);
});

test("B1 Action states and missing-next-action contract stay canonical", () => {
  assert.deepEqual(ACTION_STATUSES, [
    "candidate",
    "ready",
    "active",
    "completed",
    "partial",
    "postponed",
    "blocked",
    "dropped"
  ]);
  assert.equal(MISSING_NEXT_ACTION_CONTRACT_ID, "missing-next-action-v1");
  assert.equal(MISSING_NEXT_ACTION_CONTRACT_VERSION, 1);
});
