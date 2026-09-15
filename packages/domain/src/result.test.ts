import assert from "node:assert/strict";
import test from "node:test";
import { ACTION_STATUSES } from "./action.js";
import {
  ACTION_RESULTS,
  ACTION_RESULT_SOURCE_STATUSES,
  DAILY_CLOSE_FRICTION_CODES,
  actionStatusForResult,
  canRecordActionResult,
  emptyDailyCloseSummary,
  isValidLocalDate,
  localDayRange
} from "./result.js";

test("B5 action results are exactly the five terminal statuses from the domain model", () => {
  assert.deepEqual(ACTION_RESULTS, ["completed", "partial", "postponed", "blocked", "dropped"]);
  for (const result of ACTION_RESULTS) {
    assert.ok((ACTION_STATUSES as readonly string[]).includes(result));
    assert.equal(actionStatusForResult(result), result);
  }
});

test("only ready or active Actions can receive a result", () => {
  assert.deepEqual(ACTION_RESULT_SOURCE_STATUSES, ["ready", "active"]);
  assert.equal(canRecordActionResult("ready"), true);
  assert.equal(canRecordActionResult("active"), true);
  for (const status of ["candidate", "completed", "partial", "postponed", "blocked", "dropped"] as const) {
    assert.equal(canRecordActionResult(status), false, status);
  }
});

test("local day range follows getTimezoneOffset semantics", () => {
  // Asia/Saigon is UTC+7 → offset −420. Local 2026-09-15 starts at 2026-09-14T17:00Z.
  const range = localDayRange("2026-09-15", -420);
  assert.ok(range);
  assert.equal(range.from.toISOString(), "2026-09-14T17:00:00.000Z");
  assert.equal(range.to.toISOString(), "2026-09-15T17:00:00.000Z");

  const utc = localDayRange("2026-09-15", 0);
  assert.ok(utc);
  assert.equal(utc.from.toISOString(), "2026-09-15T00:00:00.000Z");
});

test("local day range rejects malformed dates and impossible offsets", () => {
  assert.equal(localDayRange("2026-02-30", 0), null);
  assert.equal(localDayRange("2026-9-5", 0), null);
  assert.equal(localDayRange("2026-09-15", 900), null);
  assert.equal(localDayRange("2026-09-15", 12.5), null);
  assert.equal(isValidLocalDate("2026-02-28"), true);
  assert.equal(isValidLocalDate("2027-02-29"), false);
});

test("daily close summary starts from factual zeros and friction codes stay optional vocabulary", () => {
  const summary = emptyDailyCloseSummary();
  assert.deepEqual(summary.results, { completed: 0, partial: 0, postponed: 0, blocked: 0, dropped: 0 });
  assert.equal(summary.focusSessions.totalMinutes, 0);
  assert.ok(DAILY_CLOSE_FRICTION_CODES.includes("none"));
  assert.ok(DAILY_CLOSE_FRICTION_CODES.includes("other"));
});
