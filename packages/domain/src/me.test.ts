import assert from "node:assert/strict";
import test from "node:test";
import { countClosingStreak } from "./me.js";

test("closing streak counts only consecutive days ending at the latest close", () => {
  assert.equal(countClosingStreak([]), 0);
  assert.equal(countClosingStreak(["2026-09-14"]), 1);
  assert.equal(countClosingStreak(["2026-09-14", "2026-09-13", "2026-09-12"]), 3);
  assert.equal(countClosingStreak(["2026-09-14", "2026-09-12", "2026-09-11"]), 1, "a skipped day ends the streak");
  assert.equal(countClosingStreak(["2026-03-01", "2026-02-28", "2026-02-27"]), 3, "month boundaries stay consecutive");
});
