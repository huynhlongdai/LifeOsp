import type { CaptureId, LifeEventId, UserId } from "./ids.js";

export type {
  ActionId,
  Brand,
  CaptureId,
  CaptureInterpretationId,
  DirectionId,
  IncubatorItemId,
  LifeEventId,
  OutcomeId,
  ProjectId,
  RecommendationEvidenceId,
  RecommendationId,
  SeasonId,
  UserId
} from "./ids.js";
export * from "./action.js";
export * from "./execution-context.js";
export * from "./interpretation.js";
export * from "./next-action.js";
export * from "./promotion.js";

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
  | { status: "active"; expiresAt: string }
  | { status: "unauthenticated" }
  | { status: "unavailable" };

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

export type NowView = {
  generatedAt: string;
};
