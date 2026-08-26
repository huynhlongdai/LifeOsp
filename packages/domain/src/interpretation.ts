import type { CaptureId, CaptureInterpretationId } from "./ids.js";

export const CAPTURE_INTERPRETATION_CONTRACT_ID = "capture-interpretation-v1" as const;
export const CAPTURE_INTERPRETATION_CONTRACT_VERSION = 1 as const;

export const INTERPRETATION_CATEGORIES = [
  "concerns",
  "ideas",
  "commitments",
  "possibleProjects",
  "possibleDirections",
  "questions",
  "uncertainties"
] as const;

export type InterpretationCategory = (typeof INTERPRETATION_CATEGORIES)[number];

export const INTERPRETATION_CONFIDENCE_CLASSES = ["low", "medium", "high"] as const;
export type InterpretationConfidenceClass = (typeof INTERPRETATION_CONFIDENCE_CLASSES)[number];

export type InterpretationItemV1 = {
  text: string;
  confidence: InterpretationConfidenceClass;
  sourceExcerpt?: string;
};

export type CaptureInterpretationContentV1 = {
  concerns: InterpretationItemV1[];
  ideas: InterpretationItemV1[];
  commitments: InterpretationItemV1[];
  possibleProjects: InterpretationItemV1[];
  possibleDirections: InterpretationItemV1[];
  questions: InterpretationItemV1[];
  uncertainties: InterpretationItemV1[];
};

export type CaptureInterpretationAuthor = "ai" | "user";

export type CaptureInterpretationView = {
  id: CaptureInterpretationId;
  captureId: CaptureId;
  version: number;
  contractId: typeof CAPTURE_INTERPRETATION_CONTRACT_ID;
  contractVersion: typeof CAPTURE_INTERPRETATION_CONTRACT_VERSION;
  author: CaptureInterpretationAuthor;
  content: CaptureInterpretationContentV1;
  createdAt: string;
};
