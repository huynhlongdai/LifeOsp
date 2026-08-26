import assert from "node:assert/strict";
import test from "node:test";
import type { CaptureInterpretationContentV1 } from "@lifeos/domain";
import {
  activeCandidate,
  assignCandidate,
  buildPromotionCandidates,
  createInitialAssignments,
  tradeOffIsComplete
} from "./clarity-promotion";

const content: CaptureInterpretationContentV1 = {
  concerns: [{ text: "Overloaded", confidence: "high" }],
  ideas: [{ text: "Try a landing page", confidence: "medium" }],
  commitments: [{ text: "Maintain health", confidence: "high" }],
  possibleProjects: [{ text: "AOP", confidence: "medium" }],
  possibleDirections: [{ text: "Build LifeOS", confidence: "high" }],
  questions: [{ text: "Which market?", confidence: "medium" }],
  uncertainties: [{ text: "Revenue timing", confidence: "low" }]
};

test("A4 trade-off candidates exclude concerns, questions and uncertainty from commitment promotion", () => {
  assert.deepEqual(
    buildPromotionCandidates(content).map((candidate) => [candidate.text, candidate.defaultIncubatorKind]),
    [
      ["Build LifeOS", "someday"],
      ["AOP", "project_candidate"],
      ["Maintain health", "someday"],
      ["Try a landing page", "idea"]
    ]
  );
});

test("A4 begins unassigned, requires exactly one explicit Active and never silently replaces it", () => {
  const candidates = buildPromotionCandidates(content);
  let assignments = createInitialAssignments(candidates);
  assert.equal(tradeOffIsComplete(candidates, assignments), false);
  assert.equal(activeCandidate(candidates, assignments), null);

  assignments = assignCandidate(assignments, "Build LifeOS", "active");
  assignments = assignCandidate(assignments, "AOP", "not_now");
  assignments = assignCandidate(assignments, "Maintain health", "maintain");
  assignments = assignCandidate(assignments, "Try a landing page", "not_now");
  assert.equal(tradeOffIsComplete(candidates, assignments), true);
  assert.equal(activeCandidate(candidates, assignments)?.text, "Build LifeOS");

  assignments = assignCandidate(assignments, "AOP", "active");
  assert.equal(assignments["Build LifeOS"], "unassigned", "changing Active requires explicitly reclassifying the old Active item");
  assert.equal(assignments.AOP, "active");
  assert.equal(tradeOffIsComplete(candidates, assignments), false);
});
