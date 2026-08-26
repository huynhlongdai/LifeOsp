import assert from "node:assert/strict";
import test from "node:test";
import {
  MISSING_NEXT_ACTION_CONTRACT_ID,
  MISSING_NEXT_ACTION_CONTRACT_VERSION
} from "@lifeos/domain";
import { validateMissingNextActionOutputV1 } from "./action.js";

function validOutput() {
  return {
    contractId: MISSING_NEXT_ACTION_CONTRACT_ID,
    contractVersion: MISSING_NEXT_ACTION_CONTRACT_VERSION,
    proposal: {
      title: "List three candidate products",
      doneCondition: "Three products are saved with price, demand signal and affiliate availability.",
      estimatedMinutes: 30,
      reason: "This creates real inputs for the next content experiment.",
      assumptions: ["The user has access to a marketplace account"]
    }
  };
}

test("accepts a bounded provider-neutral missing Action proposal", () => {
  const result = validateMissingNextActionOutputV1(validOutput());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.proposal.estimatedMinutes, 30);
  assert.equal(result.proposal.title, "List three candidate products");
});

test("rejects unknown reasoning fields instead of persisting hidden provider output", () => {
  const output = validOutput();
  const result = validateMissingNextActionOutputV1({
    ...output,
    proposal: {
      ...output.proposal,
      chainOfThought: "private provider reasoning"
    }
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.some((error) => error.includes("chainOfThought")));
});

test("rejects Actions larger than the B1 bounded-work limit", () => {
  const output = validOutput();
  const result = validateMissingNextActionOutputV1({
    ...output,
    proposal: { ...output.proposal, estimatedMinutes: 481 }
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.some((error) => error.includes("estimatedMinutes")));
});

test("rejects wrong contracts and malformed assumptions", () => {
  const output = validOutput();
  const result = validateMissingNextActionOutputV1({
    ...output,
    contractVersion: 2,
    proposal: { ...output.proposal, assumptions: [""] }
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.some((error) => error.includes("contractVersion")));
  assert.ok(result.errors.some((error) => error.includes("assumptions[0]")));
});
