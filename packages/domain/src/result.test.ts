import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTION_RESULT_OUTCOMES,
  ACTION_RESULT_SOURCE_STATUSES,
  actionStatusForResult,
  canRecordActionResult,
  defaultFocusOutcomeForResult,
  isActionResultOutcome,
  isLocalDate,
  isTzOffsetMinutes,
  localDateWindow
} from "./index.js";

test("Action result outcomes match the canonical B5 contract", () => {
  assert.deepEqual(ACTION_RESULT_OUTCOMES, ["completed", "partial", "postponed", "blocked", "dropped"]);
});

test("results can only be recorded from ready or active Actions", () => {
  assert.deepEqual(ACTION_RESULT_SOURCE_STATUSES, ["ready", "active"]);
  assert.equal(canRecordActionResult("ready"), true);
  assert.equal(canRecordActionResult("active"), true);
  for (const status of ["candidate", "completed", "partial", "postponed", "blocked", "dropped"] as const) {
    assert.equal(canRecordActionResult(status), false, `${status} must not accept a result`);
  }
});

test("each result outcome maps to exactly one Action status", () => {
  for (const outcome of ACTION_RESULT_OUTCOMES) {
    assert.equal(actionStatusForResult(outcome), outcome);
  }
});

test("Focus outcome defaults never imply Action completion by themselves", () => {
  assert.equal(defaultFocusOutcomeForResult("completed"), "completed");
  assert.equal(defaultFocusOutcomeForResult("partial"), "interrupted");
  assert.equal(defaultFocusOutcomeForResult("postponed"), "abandoned");
  assert.equal(defaultFocusOutcomeForResult("blocked"), "abandoned");
  assert.equal(defaultFocusOutcomeForResult("dropped"), "abandoned");
});

test("outcome guard rejects unknown values", () => {
  assert.equal(isActionResultOutcome("completed"), true);
  assert.equal(isActionResultOutcome("done"), false);
  assert.equal(isActionResultOutcome(undefined), false);
});

test("local date guard accepts only real calendar dates", () => {
  assert.equal(isLocalDate("2026-09-14"), true);
  assert.equal(isLocalDate("2026-02-30"), false);
  assert.equal(isLocalDate("2026-9-14"), false);
  assert.equal(isLocalDate(20260914), false);
});

test("timezone offset guard stays inside real world offsets", () => {
  assert.equal(isTzOffsetMinutes(420), true);
  assert.equal(isTzOffsetMinutes(-840), true);
  assert.equal(isTzOffsetMinutes(900), false);
  assert.equal(isTzOffsetMinutes(30.5), false);
});

test("local date window covers exactly one local day in UTC", () => {
  const window = localDateWindow("2026-09-14", 420);
  assert.equal(window.from.toISOString(), "2026-09-13T17:00:00.000Z");
  assert.equal(window.to.toISOString(), "2026-09-14T17:00:00.000Z");

  const utcWindow = localDateWindow("2026-09-14", 0);
  assert.equal(utcWindow.from.toISOString(), "2026-09-14T00:00:00.000Z");
  assert.equal(utcWindow.to.toISOString(), "2026-09-15T00:00:00.000Z");
});
