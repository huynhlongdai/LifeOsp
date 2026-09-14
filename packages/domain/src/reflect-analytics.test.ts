import assert from "node:assert/strict";
import test from "node:test";
import { buildReflectAnalytics, type ReflectAnalyticsInput } from "./reflect-analytics.js";

const days = ["2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13", "2026-09-14"];

const base: ReflectAnalyticsInput = {
  tzOffsetMinutes: 420,
  focusMinutesTodayByHour: [],
  focusMinutesByHourLast30Days: [],
  focusMinutesLast7Days: 0,
  focusMinutesPrevious7Days: 0,
  days: days.map((localDate) => ({
    localDate,
    focusMinutes: 0,
    completedFocusSessions: 0,
    actionsWithResult: 0,
    closed: false,
    captures: 0
  })),
  preferences: { workStartMinute: 8 * 60, workEndMinute: 18 * 60, focusMinutes: 45 }
};

test("an empty day draws flat bars instead of inventing energy", () => {
  const view = buildReflectAnalytics(base);
  assert.equal(view.energy.bars.length, 10);
  assert.ok(view.energy.bars.every((bar) => bar.level === 0 && bar.minutes === 0));
  assert.equal(view.energy.peakWindow, null);
  assert.equal(view.energy.deltaPercentVsPreviousWeek, null);
  assert.deepEqual(view.schedule.blocks, []);
});

test("bars are scaled against the busiest hour of the day", () => {
  const view = buildReflectAnalytics({
    ...base,
    focusMinutesTodayByHour: [
      { hour: 9, minutes: 60 },
      { hour: 14, minutes: 30 }
    ]
  });
  assert.equal(view.energy.minutesToday, 90);
  assert.equal(view.energy.bars.find((bar) => bar.hour === 9)?.level, 1);
  assert.equal(view.energy.bars.find((bar) => bar.hour === 14)?.level, 0.5);
});

test("the peak window is the best contiguous two hours of completed focus", () => {
  const view = buildReflectAnalytics({
    ...base,
    focusMinutesByHourLast30Days: [
      { hour: 9, minutes: 200 },
      { hour: 10, minutes: 180 },
      { hour: 15, minutes: 120 }
    ]
  });
  assert.deepEqual(view.energy.peakWindow, { startHour: 9, endHour: 11, minutes: 380 });
  const deep = view.schedule.blocks.find((block) => block.type === "Deep Work");
  assert.equal(deep?.startMinute, 9 * 60);
  assert.equal(deep?.endMinute, 11 * 60);
});

test("week over week only compares when the previous week has data", () => {
  assert.equal(
    buildReflectAnalytics({ ...base, focusMinutesLast7Days: 540, focusMinutesPrevious7Days: 500 }).energy
      .deltaPercentVsPreviousWeek,
    8
  );
});

test("a habit streak breaks at the first missing day counted backwards", () => {
  const view = buildReflectAnalytics({
    ...base,
    days: base.days.map((day, index) => ({ ...day, closed: index !== 3 }))
  });
  const close = view.habits.find((habit) => habit.id === "daily-close");
  assert.equal(close?.streak, 3);
  assert.equal(close?.days.length, 7);
});
