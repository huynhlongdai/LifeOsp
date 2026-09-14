import assert from "node:assert/strict";
import test from "node:test";
import { buildDirectionOutlook, type DirectionOutlookInput } from "./direction-outlook.js";

const base: DirectionOutlookInput = {
  outcomes: [],
  recentWins: [],
  actionsCompletedLast14Days: 0,
  focusMinutesLast14Days: 0
};

test("a season without outcomes says so instead of showing empty progress", () => {
  const view = buildDirectionOutlook(base);
  assert.deepEqual(view.focusAreas, []);
  assert.equal(view.nextMilestone, null);
  assert.match(view.analysis.title, /chưa có Outcome/i);
});

test("focus area progress is null until the outcome has actions", () => {
  const view = buildDirectionOutlook({
    ...base,
    outcomes: [{ outcomeId: "o1", title: "Landing page", status: "active", actionsTotal: 0, actionsCompleted: 0 }]
  });
  assert.equal(view.focusAreas[0]?.percent, null);
  assert.equal(view.nextMilestone, null);
});

test("the next milestone is the active outcome with the fewest actions left", () => {
  const view = buildDirectionOutlook({
    ...base,
    actionsCompletedLast14Days: 4,
    focusMinutesLast14Days: 300,
    outcomes: [
      { outcomeId: "o1", title: "Xa", status: "active", actionsTotal: 10, actionsCompleted: 2 },
      { outcomeId: "o2", title: "Gần", status: "active", actionsTotal: 5, actionsCompleted: 4, nextActionTitle: "Viết copy" },
      { outcomeId: "o3", title: "Xong", status: "achieved", actionsTotal: 3, actionsCompleted: 3 }
    ]
  });
  assert.equal(view.focusAreas.length, 2);
  assert.equal(view.nextMilestone?.outcomeId, "o2");
  assert.equal(view.nextMilestone?.actionsRemaining, 1);
  assert.equal(view.nextMilestone?.nextActionTitle, "Viết copy");
  assert.equal(view.focusAreas[0]?.percent, 20);
});

test("too many parallel outcomes is named, never auto-paused", () => {
  const view = buildDirectionOutlook({
    ...base,
    actionsCompletedLast14Days: 2,
    outcomes: ["a", "b", "c", "d"].map((id) => ({
      outcomeId: id,
      title: id,
      status: "active",
      actionsTotal: 2,
      actionsCompleted: 0
    }))
  });
  assert.match(view.analysis.title, /quá nhiều hướng/i);
  assert.equal(view.analysis.evidence.length, 3);
});
