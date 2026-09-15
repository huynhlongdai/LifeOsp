import assert from "node:assert/strict";
import test from "node:test";
import { detectDurationCompletionPattern, detectProjectLoadPattern } from "./insight.js";

test("duration/completion pattern requires a minimum sample in both buckets", () => {
  assert.equal(
    detectDurationCompletionPattern({ shortAttempted: 4, shortCompleted: 4, longAttempted: 10, longCompleted: 1 }),
    null,
    "too few short-bucket samples"
  );
  assert.equal(
    detectDurationCompletionPattern({ shortAttempted: 10, shortCompleted: 9, longAttempted: 4, longCompleted: 0 }),
    null,
    "too few long-bucket samples"
  );
});

test("duration/completion pattern requires both a high short-bucket rate and a meaningful gap", () => {
  assert.equal(
    detectDurationCompletionPattern({ shortAttempted: 10, shortCompleted: 5, longAttempted: 10, longCompleted: 1 }),
    null,
    "short rate below the 60% floor"
  );
  assert.equal(
    detectDurationCompletionPattern({ shortAttempted: 10, shortCompleted: 7, longAttempted: 10, longCompleted: 6 }),
    null,
    "gap below 30 points"
  );
  const detected = detectDurationCompletionPattern({ shortAttempted: 10, shortCompleted: 9, longAttempted: 10, longCompleted: 2 });
  assert.ok(detected);
  assert.equal(detected.proposedMaxMinutes, 45);
});

test("project-load pattern requires at least 3 active Projects and half of them stalled", () => {
  assert.equal(detectProjectLoadPattern({ activeProjectCount: 2, stalledProjectCount: 2 }), null, "below the minimum active count");
  assert.equal(detectProjectLoadPattern({ activeProjectCount: 4, stalledProjectCount: 1 }), null, "stall rate below 50%");
  const detected = detectProjectLoadPattern({ activeProjectCount: 4, stalledProjectCount: 2 });
  assert.ok(detected);
  assert.equal(detected.proposedMaxActive, 2);
});
