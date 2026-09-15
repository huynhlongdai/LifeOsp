import assert from "node:assert/strict";
import test from "node:test";
import { addDaysToLocalDate, localWeekRange } from "./weekly-reset.js";

test("localWeekRange spans exactly 7 local days honoring the client's UTC offset", () => {
  const range = localWeekRange("2026-09-14", -420); // UTC+7 (Asia/Saigon), offsetMinutes is negative east of UTC
  assert.ok(range);
  assert.equal(range.from.toISOString(), "2026-09-13T17:00:00.000Z");
  assert.equal(range.to.getTime() - range.from.getTime(), 7 * 24 * 60 * 60_000);
});

test("localWeekRange rejects an invalid date or an out-of-range offset", () => {
  assert.equal(localWeekRange("not-a-date", 0), null);
  assert.equal(localWeekRange("2026-09-14", 10_000), null);
});

test("addDaysToLocalDate rolls over month and year boundaries", () => {
  assert.equal(addDaysToLocalDate("2026-09-14", 6), "2026-09-20");
  assert.equal(addDaysToLocalDate("2026-12-29", 6), "2027-01-04");
});
