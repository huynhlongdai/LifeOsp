import assert from "node:assert/strict";
import test from "node:test";
import type { ActionId, OutcomeId, ProjectId, SeasonId } from "./ids.js";
import {
  NEXT_ACTION_RULESET_VERSION,
  isEligibleNextAction,
  rankNextActions,
  type NextActionRankingCandidate
} from "./next-action.js";

const evaluatedAt = new Date("2026-08-26T09:00:00.000Z");
const seasonId = "00000000-0000-4000-8000-000000000001" as SeasonId;
const outcomeId = "00000000-0000-4000-8000-000000000002" as OutcomeId;
const projectId = "00000000-0000-4000-8000-000000000003" as ProjectId;

function candidate(
  actionId: string,
  overrides: Partial<NextActionRankingCandidate> = {}
): NextActionRankingCandidate {
  return {
    actionId: actionId as ActionId,
    seasonId,
    outcomeId,
    projectId,
    title: `Action ${actionId}`,
    doneCondition: "Observable result exists",
    estimatedMinutes: 45,
    priority: 0,
    createdAt: "2026-08-25T09:00:00.000Z",
    actionStatus: "ready",
    seasonStatus: "active",
    outcomeStatus: "active",
    projectStatus: "active",
    ...overrides
  };
}

test("B2 ruleset identifier is versioned", () => {
  assert.equal(NEXT_ACTION_RULESET_VERSION, "next-action-v0.1");
});

test("hard-invalid Actions are never eligible regardless of scoreable fields", () => {
  const invalid = [
    candidate("00000000-0000-4000-8000-000000000010", {
      actionStatus: "blocked",
      priority: 999,
      scheduledFor: "2026-08-01T09:00:00.000Z"
    }),
    candidate("00000000-0000-4000-8000-000000000011", {
      actionStatus: "completed",
      priority: 999,
      scheduledFor: "2026-08-01T09:00:00.000Z"
    }),
    candidate("00000000-0000-4000-8000-000000000012", {
      outcomeStatus: "paused",
      priority: 999
    }),
    candidate("00000000-0000-4000-8000-000000000013", {
      seasonStatus: "paused",
      priority: 999
    }),
    candidate("00000000-0000-4000-8000-000000000014", {
      projectStatus: "paused",
      priority: 999
    })
  ];

  for (const item of invalid) assert.equal(isEligibleNextAction(item), false);

  const valid = candidate("00000000-0000-4000-8000-000000000020", { priority: -20 });
  const result = rankNextActions([...invalid, valid], evaluatedAt);
  assert.equal(result.eligibleCount, 1);
  assert.equal(result.winner?.candidate.actionId, valid.actionId);
});

test("same snapshot produces the same deterministic winner independent of input order", () => {
  const first = candidate("00000000-0000-4000-8000-000000000031");
  const second = candidate("00000000-0000-4000-8000-000000000030");

  const forward = rankNextActions([first, second], evaluatedAt);
  const reverse = rankNextActions([second, first], evaluatedAt);

  assert.equal(forward.winner?.candidate.actionId, second.actionId);
  assert.equal(reverse.winner?.candidate.actionId, second.actionId);
  assert.deepEqual(
    forward.ranked.map((item) => item.candidate.actionId),
    reverse.ranked.map((item) => item.candidate.actionId)
  );
});

test("explicit priority weight changes ranking and is clamped", () => {
  const lower = candidate("00000000-0000-4000-8000-000000000040", { priority: 2 });
  const higher = candidate("00000000-0000-4000-8000-000000000041", { priority: 50 });

  const result = rankNextActions([lower, higher], evaluatedAt);
  assert.equal(result.winner?.candidate.actionId, higher.actionId);
  const priorityFactor = result.winner?.factors.find((factor) => factor.key === "user_priority");
  assert.equal(priorityFactor?.score, 20);
  assert.deepEqual(priorityFactor?.value, { priority: 50, appliedWeight: 20 });
});

test("explicit schedule urgency can outrank freshness without hidden inference", () => {
  const urgentOlder = candidate("00000000-0000-4000-8000-000000000050", {
    createdAt: "2026-07-01T09:00:00.000Z",
    scheduledFor: "2026-08-26T10:00:00.000Z",
    estimatedMinutes: 90
  });
  const fresh = candidate("00000000-0000-4000-8000-000000000051", {
    createdAt: "2026-08-26T08:30:00.000Z",
    estimatedMinutes: 15
  });

  const result = rankNextActions([fresh, urgentOlder], evaluatedAt);
  assert.equal(result.winner?.candidate.actionId, urgentOlder.actionId);
  assert.equal(result.winner?.factors.find((factor) => factor.key === "urgency")?.score, 25);
});

test("ranking evidence contains only declared product-level factors", () => {
  const item = candidate("00000000-0000-4000-8000-000000000060", {
    priority: 3,
    scheduledFor: "2026-08-28T09:00:00.000Z",
    estimatedMinutes: 30
  });

  const result = rankNextActions([item], evaluatedAt);
  assert.deepEqual(
    result.winner?.factors.map((factor) => factor.key),
    ["active_context", "user_priority", "urgency", "bounded_effort", "freshness"]
  );
  assert.equal(result.winner?.factors.some((factor) => "reasoning" in factor.value), false);
});

test("project-less ready Action remains eligible under active Season and Outcome", () => {
  const withProject = candidate("00000000-0000-4000-8000-000000000070");
  const { projectId: _projectId, projectStatus: _projectStatus, ...item } = withProject;
  assert.equal(isEligibleNextAction(item), true);
  assert.equal(rankNextActions([item], evaluatedAt).winner?.candidate.actionId, item.actionId);
});
