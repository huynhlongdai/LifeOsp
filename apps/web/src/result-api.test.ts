import assert from "node:assert/strict";
import test from "node:test";
import { browserLocalDate, browserTzOffsetMinutes, isActionResultView, isDailyCloseView } from "./result-api.js";

const result = {
  id: "8d0d1f7c-4a1d-4d1b-9a1d-2f7c4a1d4d1b",
  actionId: "1d0d1f7c-4a1d-4d1b-9a1d-2f7c4a1d4d1b",
  outcome: "partial",
  actionStatus: "partial",
  previousActionStatus: "ready",
  recordedAt: "2026-09-14T02:00:00.000Z"
};

const summary = {
  resultsRecorded: 1,
  completed: 0,
  partial: 1,
  postponed: 0,
  blocked: 0,
  dropped: 0,
  focusSessions: 1,
  focusMinutes: 25,
  distractionsCaptured: 1,
  capturesCreated: 0
};

test("Action result guard accepts the B5 contract and rejects unknown outcomes", () => {
  assert.equal(isActionResultView(result), true);
  assert.equal(isActionResultView({ ...result, outcome: "done" }), false);
  assert.equal(isActionResultView({ ...result, recordedAt: 0 }), false);
  assert.equal(isActionResultView(null), false);
});

test("Daily Close guard requires every factual counter", () => {
  const view = {
    localDate: "2026-09-14",
    tzOffsetMinutes: 420,
    generatedAt: "2026-09-14T02:05:00.000Z",
    summary,
    results: [result]
  };
  assert.equal(isDailyCloseView(view), true);

  const { focusMinutes: _omitted, ...incomplete } = summary;
  assert.equal(isDailyCloseView({ ...view, summary: incomplete }), false);
  assert.equal(isDailyCloseView({ ...view, results: [{ ...result, outcome: "invented" }] }), false);
});

test("browser local date and offset agree with each other", () => {
  const now = new Date("2026-09-13T18:30:00.000Z");
  const offset = browserTzOffsetMinutes(now);
  const localDate = browserLocalDate(now);
  const expected = new Date(now.getTime() + offset * 60_000).toISOString().slice(0, 10);
  assert.equal(localDate, expected);
});
