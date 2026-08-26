import assert from "node:assert/strict";
import test from "node:test";
import { CAPTURE_KINDS, CAPTURE_PROCESSING_STATUSES, LIFE_EVENT_SOURCES, NEED_STATES } from "./index.js";

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

test("LifeEvent sources match the canonical producers", () => {
  assert.deepEqual(LIFE_EVENT_SOURCES, ["user", "system", "ai", "import"]);
});
