import assert from "node:assert/strict";
import test from "node:test";
import { computeLifeScore, type LifeScoreInput } from "./coach.js";

const base: LifeScoreInput = {
actionsCompletedLast7Days: 0,
actionsPartialLast7Days: 0,
actionsPostponedLast7Days: 0,
focusMinutesLast7Days: 0,
focusMinutesGoalPerDay: 120,
outcomeActionsTotal: 0,
outcomeActionsCompleted: 0,
dailyClosesLast7Days: 0
};

test("refuses to produce a score when only one part has data", () => {
  const view = computeLifeScore(base);
  assert.equal(view.score, null);
  assert.ok(view.missingReason);
  assert.equal(view.components.find((component) => component.id === "execution")?.value, null);
});

test("weights the parts that do have data", () => {
  const view = computeLifeScore({
    ...base,
    actionsCompletedLast7Days: 8,
    actionsPartialLast7Days: 0,
    actionsPostponedLast7Days: 2,
    focusMinutesLast7Days: 420,
    outcomeActionsTotal: 10,
    outcomeActionsCompleted: 5,
    dailyClosesLast7Days: 7
  });
  // execution 80 * .35 + focus 50 * .25 + outcome 50 * .25 + reflection 100 * .15
  assert.equal(view.score, 68);
});

test("never exceeds 100 when focus overshoots the goal", () => {
  const view = computeLifeScore({ ...base, focusMinutesLast7Days: 5000, dailyClosesLast7Days: 7 });
  assert.equal(view.components.find((component) => component.id === "focus")?.value, 100);
  assert.equal(view.score, 100);
});

test("counts a partial result as half of an execution win", () => {
  const view = computeLifeScore({ ...base, actionsCompletedLast7Days: 1, actionsPartialLast7Days: 1 });
  assert.equal(view.components.find((component) => component.id === "execution")?.value, 75);
});
