import assert from "node:assert/strict";
import test from "node:test";
import { CAPTURE_INTERPRETATION_CONTRACT_VERSION } from "@lifeos/domain";
import {
  createEmptyCaptureInterpretationV1,
  runCaptureInterpretationV1,
  validateCaptureInterpretationV1,
  type CaptureInterpretationProvider
} from "./index.js";

const rawText = "I am worried about money. I might start a small side project, but I am not sure which one.";
const moneyStart = rawText.indexOf("worried about money");
const moneyEnd = moneyStart + "worried about money".length;
const projectStart = rawText.indexOf("start a small side project");
const projectEnd = projectStart + "start a small side project".length;
const unsureStart = rawText.indexOf("not sure which one");
const unsureEnd = unsureStart + "not sure which one".length;

function validOutput() {
  return {
    contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
    concerns: [
      {
        text: "Money is a current concern",
        confidenceClass: "explicit",
        source: { start: moneyStart, end: moneyEnd }
      }
    ],
    ideas: [],
    commitments: [],
    possibleProjects: [
      {
        text: "A small side project may be worth exploring",
        confidenceClass: "inferred",
        source: { start: projectStart, end: projectEnd }
      }
    ],
    possibleDirections: [],
    questions: [],
    uncertainties: [
      {
        text: "The user has not chosen which project",
        confidenceClass: "uncertain",
        source: { start: unsureStart, end: unsureEnd }
      }
    ]
  };
}

const request = {
  contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
  captureId: "11111111-1111-4111-8111-111111111111",
  rawText
} as const;

test("valid structured interpretation is accepted with explicit provenance", () => {
  assert.deepEqual(validateCaptureInterpretationV1(validOutput(), rawText), validOutput());
});

test("ambiguous input can remain explicitly uncertain instead of being forced into certainty", () => {
  const output = validOutput();
  const parsed = validateCaptureInterpretationV1(output, rawText);

  assert.ok(parsed);
  assert.equal(parsed.uncertainties[0]?.confidenceClass, "uncertain");
});

test("unknown reasoning fields are rejected rather than persisted as chain-of-thought", () => {
  const output = { ...validOutput(), reasoning: "private hidden reasoning" };
  assert.equal(validateCaptureInterpretationV1(output, rawText), null);
});

test("malformed or unsupported source references are rejected", () => {
  const malformed = validOutput();
  malformed.concerns[0] = {
    text: "Unsupported claim",
    confidenceClass: "explicit",
    source: { start: 0, end: rawText.length + 100 }
  };

  assert.equal(validateCaptureInterpretationV1(malformed, rawText), null);
});

test("wrong contract version and missing canonical categories are rejected", () => {
  const wrongVersion = { ...validOutput(), contractVersion: "capture_interpretation.v2" };
  assert.equal(validateCaptureInterpretationV1(wrongVersion, rawText), null);

  const missingCategory = validOutput() as Record<string, unknown>;
  delete missingCategory.questions;
  assert.equal(validateCaptureInterpretationV1(missingCategory, rawText), null);
});

test("empty manual fallback shape is deterministic and canonical", () => {
  assert.deepEqual(createEmptyCaptureInterpretationV1(), {
    contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
    concerns: [],
    ideas: [],
    commitments: [],
    possibleProjects: [],
    possibleDirections: [],
    questions: [],
    uncertainties: []
  });
});

test("provider output is validated before success is returned", async () => {
  const provider: CaptureInterpretationProvider = {
    async interpret() {
      return validOutput();
    }
  };

  const result = await runCaptureInterpretationV1(provider, request, 100);
  assert.equal(result.status, "success");
});

test("malformed provider output falls back to manual classification", async () => {
  const provider: CaptureInterpretationProvider = {
    async interpret() {
      return { contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION, concerns: [] };
    }
  };

  assert.deepEqual(await runCaptureInterpretationV1(provider, request, 100), {
    status: "manual_required",
    reason: "invalid_output"
  });
});

test("provider errors fall back without leaking provider exceptions into the domain result", async () => {
  const provider: CaptureInterpretationProvider = {
    async interpret() {
      throw new Error("provider secret or SDK-specific failure");
    }
  };

  assert.deepEqual(await runCaptureInterpretationV1(provider, request, 100), {
    status: "manual_required",
    reason: "provider_error"
  });
});

test("provider timeout falls back deterministically", async () => {
  const provider: CaptureInterpretationProvider = {
    async interpret() {
      return new Promise<unknown>(() => undefined);
    }
  };

  assert.deepEqual(await runCaptureInterpretationV1(provider, request, 5), {
    status: "manual_required",
    reason: "timeout"
  });
});
