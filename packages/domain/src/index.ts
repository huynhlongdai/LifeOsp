import type { LifeEventId, UserId } from "./ids.js";

export type { Brand, LifeEventId, UserId } from "./ids.js";

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
