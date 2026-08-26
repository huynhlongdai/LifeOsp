import assert from "node:assert/strict";
import test from "node:test";
import {
  CAPTURE_INTERPRETATION_CONTRACT_ID,
  CAPTURE_INTERPRETATION_CONTRACT_VERSION
} from "@lifeos/domain";
import type { CaptureInterpretationContentV1 } from "@lifeos/domain";
import { validateCaptureInterpretationOutputV1 } from "./index.js";

const rawText = "Tôi lo dự án bị dở dang. Tôi muốn tập trung LifeOS và cần quyết định việc quan trọng nhất tuần này.";

function emptyContent(): CaptureInterpretationContentV1 {
  return {
    concerns: [],
    ideas: [],
    commitments: [],
    possibleProjects: [],
    possibleDirections: [],
    questions: [],
    uncertainties: []
  };
}

function output(content: CaptureInterpretationContentV1) {
  return {
    contractId: CAPTURE_INTERPRETATION_CONTRACT_ID,
    contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
    content
  };
}

test("accepts a valid grounded interpretation", () => {
  const content = emptyContent();
  content.concerns.push({
    text: "Lo dự án bị dở dang",
    confidence: "high",
    sourceExcerpt: "Tôi lo dự án bị dở dang"
  });
  content.possibleDirections.push({
    text: "Tập trung LifeOS",
    confidence: "medium",
    sourceExcerpt: "Tôi muốn tập trung LifeOS"
  });

  const result = validateCaptureInterpretationOutputV1(rawText, output(content));
  assert.equal(result.ok, true);
});

test("accepts ambiguity when expressed as uncertainty rather than invented certainty", () => {
  const content = emptyContent();
  content.uncertainties.push({
    text: "Chưa rõ việc quan trọng nhất tuần này là gì",
    confidence: "low",
    sourceExcerpt: "cần quyết định việc quan trọng nhất tuần này"
  });

  const result = validateCaptureInterpretationOutputV1(rawText, output(content));
  assert.equal(result.ok, true);
});

test("rejects hallucinated source excerpts", () => {
  const content = emptyContent();
  content.commitments.push({
    text: "Đã cam kết ra mắt sản phẩm ngày mai",
    confidence: "high",
    sourceExcerpt: "ra mắt sản phẩm ngày mai"
  });

  const result = validateCaptureInterpretationOutputV1(rawText, output(content));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.join("\n"), /exact excerpt/);
});

test("rejects malformed or incomplete structured output", () => {
  const result = validateCaptureInterpretationOutputV1(rawText, {
    contractId: CAPTURE_INTERPRETATION_CONTRACT_ID,
    contractVersion: 1,
    content: { concerns: [] }
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.join("\n"), /ideas must be an array/);
});

test("rejects unsupported fields including chain-of-thought", () => {
  const value = output(emptyContent()) as Record<string, unknown>;
  value.chainOfThought = "hidden reasoning";

  const result = validateCaptureInterpretationOutputV1(rawText, value);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.join("\n"), /chainOfThought is not allowed/);
});
