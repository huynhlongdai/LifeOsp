import assert from "node:assert/strict";
import test from "node:test";
import { isDailyCloseView, localDayContext } from "./daily-close-api";
import { isActionResultView } from "./result-api";

// Ported from feat/b5-result-daily-close (2026-09-14) and adapted to the
// contract chosen as source of truth (Meeting decision 2026-09-15).

const result = {
  id: "8d0d1f7c-4a1d-4d1b-9a1d-2f7c4a1d4d1b",
  actionId: "1d0d1f7c-4a1d-4d1b-9a1d-2f7c4a1d4d1b",
  result: "partial",
  actualFocusMinutes: 25,
  focusSessionCount: 1,
  recordedAt: "2026-09-15T02:00:00.000Z",
  action: { id: "1d0d1f7c-4a1d-4d1b-9a1d-2f7c4a1d4d1b", title: "Viết bản mô tả", status: "partial" }
};

const summary = {
  results: { completed: 0, partial: 1, postponed: 0, blocked: 0, dropped: 0 },
  resultItems: [{ actionId: result.actionId, title: "Viết bản mô tả", result: "partial", recordedAt: result.recordedAt }],
  focusSessions: { count: 1, totalMinutes: 25 },
  distractionsCaptured: 1,
  outcomesMoved: 1,
  intentionalDecisions: 0
};

const view = {
  date: "2026-09-15",
  range: { from: "2026-09-14T17:00:00.000Z", to: "2026-09-15T17:00:00.000Z" },
  generatedAt: "2026-09-15T02:05:00.000Z",
  summary,
  close: null
};

test("Action result guard accepts the B5 contract and rejects unknown results", () => {
  assert.equal(isActionResultView(result), true);
  assert.equal(isActionResultView({ ...result, result: "done" }), false);
  assert.equal(isActionResultView({ ...result, recordedAt: 0 }), false);
  assert.equal(isActionResultView({ ...result, action: { ...result.action, status: "finished" } }), false);
  assert.equal(isActionResultView({ ...result, focus: { id: "x" } }), false, "an embedded focus must be a full FocusSessionView");
  assert.equal(isActionResultView(null), false);
});

test("Daily Close guard requires every factual counter and a closed friction vocabulary", () => {
  assert.equal(isDailyCloseView(view), true);

  const { outcomesMoved: _omitted, ...incomplete } = summary;
  assert.equal(isDailyCloseView({ ...view, summary: incomplete }), false);
  assert.equal(isDailyCloseView({ ...view, summary: { ...summary, results: { ...summary.results, partial: "1" } } }), false);
  assert.equal(
    isDailyCloseView({ ...view, close: { id: "c1", date: view.date, closedAt: view.generatedAt, updatedAt: view.generatedAt, frictionCode: "lazy" } }),
    false,
    "friction codes outside the vocabulary are rejected"
  );
  assert.equal(
    isDailyCloseView({ ...view, close: { id: "c1", date: view.date, closedAt: view.generatedAt, updatedAt: view.generatedAt, frictionCode: "interrupted" } }),
    true
  );
});

test("browser local day context agrees with getTimezoneOffset semantics", () => {
  const now = new Date("2026-09-13T18:30:00.000Z");
  const { date, offsetMinutes } = localDayContext(now);
  assert.equal(offsetMinutes, now.getTimezoneOffset());
  const expected = new Date(now.getTime() - offsetMinutes * 60_000).toISOString().slice(0, 10);
  assert.equal(date, expected);
  assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
});
