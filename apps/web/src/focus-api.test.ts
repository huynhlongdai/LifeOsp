import assert from "node:assert/strict";
import test from "node:test";
import { isFocusSessionView, isFocusStateView } from "./focus-api.js";

const focus = {
  id: "00000000-0000-4000-8000-000000000010",
  actionId: "00000000-0000-4000-8000-000000000011",
  recommendationId: "00000000-0000-4000-8000-000000000012",
  status: "active",
  plannedMinutes: 25,
  startedAt: "2026-08-27T05:00:00.000Z",
  action: {
    id: "00000000-0000-4000-8000-000000000011",
    title: "Select three products",
    doneCondition: "Three URLs are saved."
  }
};

test("B4 Focus web contract accepts a valid FocusSessionView", () => {
  assert.equal(isFocusSessionView(focus), true);
});

test("B4 Focus web contract rejects a session missing required fields", () => {
  assert.equal(isFocusSessionView({ ...focus, status: "not_a_status" }), false);
  assert.equal(isFocusSessionView({ ...focus, action: { id: focus.action.id } }), false);
  const { startedAt: _startedAt, ...withoutStartedAt } = focus;
  assert.equal(isFocusSessionView(withoutStartedAt), false);
});

test("B4 Focus web contract accepts each server-owned FocusStateView state", () => {
  const generatedAt = "2026-08-27T05:00:00.000Z";
  assert.equal(isFocusStateView({ state: "none", generatedAt }), true);
  assert.equal(isFocusStateView({ state: "active", generatedAt, focus }), true);
  assert.equal(
    isFocusStateView({ state: "recent", generatedAt, focus: { ...focus, status: "completed", endedAt: generatedAt } }),
    true
  );
});

test("B4 Focus web contract rejects unknown states and malformed focus payloads", () => {
  assert.equal(isFocusStateView({ state: "unknown", generatedAt: "2026-08-27T05:00:00.000Z" }), false);
  assert.equal(isFocusStateView({ state: "active", generatedAt: "2026-08-27T05:00:00.000Z" }), false);
  assert.equal(
    isFocusStateView({ state: "active", generatedAt: "2026-08-27T05:00:00.000Z", focus: { ...focus, status: "invalid" } }),
    false
  );
});
