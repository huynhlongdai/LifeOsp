import assert from "node:assert/strict";
import test from "node:test";
import { NEED_STATES } from "@lifeos/domain";
import {
  NEED_STATE_OPTIONS,
  captureIdFromSearch,
  composeCaptureText,
  createEmptyInterpretation
} from "./clarity-flow";

test("NeedState UI options stay aligned with the canonical domain enum", () => {
  assert.deepEqual(
    NEED_STATE_OPTIONS.map((option) => option.value),
    NEED_STATES
  );
});

test("selected need and Quick Life Context remain explicit input inside the immutable Capture", () => {
  assert.equal(
    composeCaptureText("Tôi có quá nhiều thứ trong đầu", "", "My raw thought"),
    "Điều tôi muốn LifeOS giúp lúc này:\nTôi có quá nhiều thứ trong đầu\n\nBrain dump:\nMy raw thought"
  );
  assert.equal(
    composeCaptureText(
      "Hôm nay tôi không biết nên làm gì",
      "I only have one hour today.",
      "Too many projects are competing."
    ),
    "Điều tôi muốn LifeOS giúp lúc này:\nHôm nay tôi không biết nên làm gì\n\nBối cảnh hiện tại:\nI only have one hour today.\n\nBrain dump:\nToo many projects are competing."
  );
});

test("reload pointer accepts only UUID Capture ids", () => {
  assert.equal(
    captureIdFromSearch("?capture=11111111-1111-4111-8111-111111111111"),
    "11111111-1111-4111-8111-111111111111"
  );
  assert.equal(captureIdFromSearch("?capture=not-a-capture"), null);
  assert.equal(captureIdFromSearch(""), null);
});

test("manual fallback starts from a deterministic empty canonical interpretation", () => {
  assert.deepEqual(createEmptyInterpretation(), {
    concerns: [],
    ideas: [],
    commitments: [],
    possibleProjects: [],
    possibleDirections: [],
    questions: [],
    uncertainties: []
  });
});
