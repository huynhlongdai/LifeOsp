import {
  CAPTURE_INTERPRETATION_CATEGORIES,
  CAPTURE_INTERPRETATION_CONTRACT_VERSION,
  INTERPRETATION_CONFIDENCE_CLASSES,
  type CaptureInterpretationCategory,
  type CaptureInterpretationContentV1,
  type CaptureInterpretationItemV1,
  type InterpretationConfidenceClass
} from "@lifeos/domain";

export type CaptureInterpretationRequestV1 = {
  contractVersion: typeof CAPTURE_INTERPRETATION_CONTRACT_VERSION;
  captureId: string;
  rawText: string;
};

export interface CaptureInterpretationProvider {
  interpret(request: CaptureInterpretationRequestV1): Promise<unknown>;
}

export type CaptureInterpretationRunResult =
  | {
      status: "success";
      content: CaptureInterpretationContentV1;
    }
  | {
      status: "manual_required";
      reason: "invalid_output" | "provider_error" | "timeout";
    };

const confidenceClasses = new Set<string>(INTERPRETATION_CONFIDENCE_CLASSES);
const topLevelKeys = new Set<string>(["contractVersion", ...CAPTURE_INTERPRETATION_CATEGORIES]);
const itemKeys = new Set<string>(["text", "confidenceClass", "source"]);
const sourceKeys = new Set<string>(["start", "end"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(record: Record<string, unknown>, expected: Set<string>): boolean {
  const keys = Object.keys(record);
  return keys.length === expected.size && keys.every((key) => expected.has(key));
}

function parseItem(value: unknown, rawText: string): CaptureInterpretationItemV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, itemKeys)) return null;
  if (typeof value.text !== "string" || value.text.trim().length === 0) return null;
  if (typeof value.confidenceClass !== "string" || !confidenceClasses.has(value.confidenceClass)) return null;
  if (!isRecord(value.source) || !hasExactKeys(value.source, sourceKeys)) return null;

  const start = value.source.start;
  const end = value.source.end;
  if (typeof start !== "number" || typeof end !== "number") return null;
  if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
  if (start < 0 || end <= start || end > rawText.length) return null;
  if (rawText.slice(start, end).trim().length === 0) return null;

  return {
    text: value.text,
    confidenceClass: value.confidenceClass as InterpretationConfidenceClass,
    source: { start, end }
  };
}

function parseCategory(value: unknown, rawText: string): CaptureInterpretationItemV1[] | null {
  if (!Array.isArray(value)) return null;

  const parsed: CaptureInterpretationItemV1[] = [];
  for (const item of value) {
    const parsedItem = parseItem(item, rawText);
    if (!parsedItem) return null;
    parsed.push(parsedItem);
  }
  return parsed;
}

export function validateCaptureInterpretationV1(
  value: unknown,
  rawText: string
): CaptureInterpretationContentV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, topLevelKeys)) return null;
  if (value.contractVersion !== CAPTURE_INTERPRETATION_CONTRACT_VERSION) return null;

  const categories = {} as Record<CaptureInterpretationCategory, CaptureInterpretationItemV1[]>;
  for (const category of CAPTURE_INTERPRETATION_CATEGORIES) {
    const parsed = parseCategory(value[category], rawText);
    if (!parsed) return null;
    categories[category] = parsed;
  }

  return {
    contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
    concerns: categories.concerns,
    ideas: categories.ideas,
    commitments: categories.commitments,
    possibleProjects: categories.possibleProjects,
    possibleDirections: categories.possibleDirections,
    questions: categories.questions,
    uncertainties: categories.uncertainties
  };
}

export function createEmptyCaptureInterpretationV1(): CaptureInterpretationContentV1 {
  return {
    contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
    concerns: [],
    ideas: [],
    commitments: [],
    possibleProjects: [],
    possibleDirections: [],
    questions: [],
    uncertainties: []
  };
}

export async function runCaptureInterpretationV1(
  provider: CaptureInterpretationProvider,
  request: CaptureInterpretationRequestV1,
  timeoutMs = 8_000
): Promise<CaptureInterpretationRunResult> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("timeoutMs must be a positive finite number");
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const providerResult = provider.interpret(request).then(
    (value) => ({ kind: "value" as const, value }),
    () => ({ kind: "provider_error" as const })
  );
  const timeoutResult = new Promise<{ kind: "timeout" }>((resolve) => {
    timer = setTimeout(() => resolve({ kind: "timeout" }), timeoutMs);
  });

  try {
    const result = await Promise.race([providerResult, timeoutResult]);
    if (result.kind === "timeout") {
      return { status: "manual_required", reason: "timeout" };
    }
    if (result.kind === "provider_error") {
      return { status: "manual_required", reason: "provider_error" };
    }

    const content = validateCaptureInterpretationV1(result.value, request.rawText);
    if (!content) {
      return { status: "manual_required", reason: "invalid_output" };
    }

    return { status: "success", content };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
