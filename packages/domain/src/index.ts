import type { CaptureId, CaptureInterpretationId, LifeEventId, UserId } from "./ids.js";

export type { Brand, CaptureId, CaptureInterpretationId, LifeEventId, UserId } from "./ids.js";

export const NEED_STATES = [
  "unclear_direction",
  "dont_know_what_to_do",
  "overloaded",
  "procrastinating",
  "abandoning_goals",
  "rebalance_life",
  "learning_not_applying",
  "other"
] as const;

export type NeedState = (typeof NEED_STATES)[number];

export const CAPTURE_KINDS = ["text", "voice_transcript", "quick_note", "distraction"] as const;
export type CaptureKind = (typeof CAPTURE_KINDS)[number];

export const CAPTURE_PROCESSING_STATUSES = ["unprocessed", "interpreted", "corrected", "promoted", "archived"] as const;
export type CaptureProcessingStatus = (typeof CAPTURE_PROCESSING_STATUSES)[number];

export type CaptureView = {
  id: CaptureId;
  kind: CaptureKind;
  rawText: string;
  processingStatus: CaptureProcessingStatus;
  createdAt: string;
};

export const CAPTURE_INTERPRETATION_CONTRACT_VERSION = "capture_interpretation.v1" as const;
export type CaptureInterpretationContractVersion = typeof CAPTURE_INTERPRETATION_CONTRACT_VERSION;

export const CAPTURE_INTERPRETATION_CATEGORIES = [
  "concerns",
  "ideas",
  "commitments",
  "possibleProjects",
  "possibleDirections",
  "questions",
  "uncertainties"
] as const;
export type CaptureInterpretationCategory = (typeof CAPTURE_INTERPRETATION_CATEGORIES)[number];

export const INTERPRETATION_CONFIDENCE_CLASSES = ["explicit", "inferred", "uncertain"] as const;
export type InterpretationConfidenceClass = (typeof INTERPRETATION_CONFIDENCE_CLASSES)[number];

export type InterpretationSourceSpan = {
  start: number;
  end: number;
};

export type CaptureInterpretationItemV1 = {
  text: string;
  confidenceClass: InterpretationConfidenceClass;
  source: InterpretationSourceSpan;
};

export type CaptureInterpretationContentV1 = {
  contractVersion: CaptureInterpretationContractVersion;
  concerns: CaptureInterpretationItemV1[];
  ideas: CaptureInterpretationItemV1[];
  commitments: CaptureInterpretationItemV1[];
  possibleProjects: CaptureInterpretationItemV1[];
  possibleDirections: CaptureInterpretationItemV1[];
  questions: CaptureInterpretationItemV1[];
  uncertainties: CaptureInterpretationItemV1[];
};

export const CAPTURE_INTERPRETATION_SOURCES = ["ai", "user"] as const;
export type CaptureInterpretationSource = (typeof CAPTURE_INTERPRETATION_SOURCES)[number];

export type CaptureInterpretationView = {
  id: CaptureInterpretationId;
  captureId: CaptureId;
  version: number;
  source: CaptureInterpretationSource;
  content: CaptureInterpretationContentV1;
  createdAt: string;
};

export type HealthStatus = {
  status: "ok";
  service: "lifeos-api";
  timestamp: string;
};

export type ReadinessStatus = {
  status: "ready" | "not_ready";
  service: "lifeos-api";
  checks: Record<string, "ok" | "failed">;
  timestamp: string;
};

export type SessionView =
  | {
      status: "active";
      expiresAt: string;
    }
  | {
      status: "unauthenticated";
    }
  | {
      status: "unavailable";
    };

export const LIFE_EVENT_SOURCES = ["user", "system", "ai", "import"] as const;
export type LifeEventSource = (typeof LIFE_EVENT_SOURCES)[number];

export type LifeEventEnvelope<TPayload = unknown> = {
  id: LifeEventId;
  userId: UserId;
  type: string;
  occurredAt: string;
  source: LifeEventSource;
  entityType?: string;
  entityId?: string;
  payload: TPayload;
  correlationId?: string;
  causationId?: string;
};

/**
 * Foundation read-model boundary for the default NOW surface.
 * Product recommendations/actions are intentionally absent until their
 * vertical slice owns those semantics.
 */
export type NowView = {
  generatedAt: string;
};
