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

export type LifeEventSource = "user" | "system" | "ai" | "import";

export type LifeEventEnvelope<TPayload = unknown> = {
  id: string;
  userId: string;
  type: string;
  occurredAt: string;
  source: LifeEventSource;
  entityType?: string;
  entityId?: string;
  payload: TPayload;
  correlationId?: string;
  causationId?: string;
};
