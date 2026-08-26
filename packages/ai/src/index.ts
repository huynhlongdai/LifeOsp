import {
  CAPTURE_INTERPRETATION_CONTRACT_ID,
  CAPTURE_INTERPRETATION_CONTRACT_VERSION,
  INTERPRETATION_CATEGORIES,
  INTERPRETATION_CONFIDENCE_CLASSES
} from "@lifeos/domain";
import type {
  CaptureId,
  CaptureInterpretationContentV1,
  InterpretationConfidenceClass,
  InterpretationItemV1
} from "@lifeos/domain";

export type CaptureInterpretationInputV1 = {
  contractId: typeof CAPTURE_INTERPRETATION_CONTRACT_ID;
  contractVersion: typeof CAPTURE_INTERPRETATION_CONTRACT_VERSION;
  captureId: CaptureId;
  rawText: string;
};

export type AiRuntimeMetadata = {
  provider?: string;
  model?: string;
  requestId?: string;
  latencyMs?: number;
};

export type CaptureInterpretationProviderResult = {
  output: unknown;
  runtime?: AiRuntimeMetadata;
};

export interface CaptureInterpretationProvider {
  interpret(
    input: CaptureInterpretationInputV1,
    options: { signal: AbortSignal }
  ): Promise<CaptureInterpretationProviderResult>;
}

export type InterpretationValidationResult =
  | { ok: true; content: CaptureInterpretationContentV1 }
  | { ok: false; errors: string[] };

const ROOT_KEYS = ["contractId", "contractVersion", "content"] as const;
const ITEM_KEYS = ["text", "confidence", "sourceExcerpt"] as const;
const MAX_ITEMS_PER_CATEGORY = 50;
const MAX_ITEM_TEXT_LENGTH = 1_000;

export function createCaptureInterpretationInputV1(captureId: CaptureId, rawText: string): CaptureInterpretationInputV1 {
  return {
    contractId: CAPTURE_INTERPRETATION_CONTRACT_ID,
    contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
    captureId,
    rawText
  };
}

export function validateCaptureInterpretationOutputV1(
  rawText: string,
  output: unknown
): InterpretationValidationResult {
  const errors: string[] = [];

  if (!isRecord(output)) {
    return { ok: false, errors: ["output must be an object"] };
  }

  rejectUnknownKeys(output, ROOT_KEYS, "output", errors);

  if (output.contractId !== CAPTURE_INTERPRETATION_CONTRACT_ID) {
    errors.push(`output.contractId must be ${CAPTURE_INTERPRETATION_CONTRACT_ID}`);
  }
  if (output.contractVersion !== CAPTURE_INTERPRETATION_CONTRACT_VERSION) {
    errors.push(`output.contractVersion must be ${CAPTURE_INTERPRETATION_CONTRACT_VERSION}`);
  }
  if (!isRecord(output.content)) {
    errors.push("output.content must be an object");
    return { ok: false, errors };
  }

  rejectUnknownKeys(output.content, INTERPRETATION_CATEGORIES, "output.content", errors);

  const content = {} as CaptureInterpretationContentV1;
  for (const category of INTERPRETATION_CATEGORIES) {
    const rawItems = output.content[category];
    if (!Array.isArray(rawItems)) {
      errors.push(`output.content.${category} must be an array`);
      continue;
    }
    if (rawItems.length > MAX_ITEMS_PER_CATEGORY) {
      errors.push(`output.content.${category} may contain at most ${MAX_ITEMS_PER_CATEGORY} items`);
      continue;
    }

    const items: InterpretationItemV1[] = [];
    rawItems.forEach((rawItem, index) => {
      const item = parseItem(rawText, rawItem, `output.content.${category}[${index}]`, errors);
      if (item) items.push(item);
    });
    content[category] = items;
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, content };
}

function parseItem(rawText: string, value: unknown, path: string, errors: string[]): InterpretationItemV1 | null {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }

  rejectUnknownKeys(value, ITEM_KEYS, path, errors);

  if (typeof value.text !== "string" || value.text.trim().length === 0) {
    errors.push(`${path}.text must be a non-blank string`);
    return null;
  }
  if (value.text.length > MAX_ITEM_TEXT_LENGTH) {
    errors.push(`${path}.text may be at most ${MAX_ITEM_TEXT_LENGTH} characters`);
    return null;
  }
  if (!isConfidence(value.confidence)) {
    errors.push(`${path}.confidence must be low, medium, or high`);
    return null;
  }

  if (value.sourceExcerpt !== undefined) {
    if (typeof value.sourceExcerpt !== "string" || value.sourceExcerpt.trim().length === 0) {
      errors.push(`${path}.sourceExcerpt must be a non-blank string when provided`);
      return null;
    }
    if (!rawText.includes(value.sourceExcerpt)) {
      errors.push(`${path}.sourceExcerpt must be an exact excerpt from the Capture rawText`);
      return null;
    }
    return {
      text: value.text,
      confidence: value.confidence,
      sourceExcerpt: value.sourceExcerpt
    };
  }

  return { text: value.text, confidence: value.confidence };
}

function isConfidence(value: unknown): value is InterpretationConfidenceClass {
  return typeof value === "string" && (INTERPRETATION_CONFIDENCE_CLASSES as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectUnknownKeys(
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
  path: string,
  errors: string[]
) {
  for (const key of Object.keys(record)) {
    if (!allowedKeys.includes(key)) errors.push(`${path}.${key} is not allowed`);
  }
}
