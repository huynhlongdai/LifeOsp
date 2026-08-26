import {
  EVIDENCE_STRENGTHS,
  NEXT_ACTION_FACTOR_KEYS,
  RECOMMENDATION_CONFIDENCE_CLASSES,
  type NowView,
  type ResolveNowRecommendationInput
} from "@lifeos/domain";
import { ApiRequestError } from "./api";

export type NowApiClient = {
  getNow(signal?: AbortSignal): Promise<NowView>;
  refreshNow(signal?: AbortSignal): Promise<NowView>;
  resolveRecommendation(
    recommendationId: string,
    input: ResolveNowRecommendationInput,
    signal?: AbortSignal
  ): Promise<NowView>;
};

export function createNowApiClient(baseUrl = ""): NowApiClient {
  const request = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers
      }
    });
    const body: unknown = await response.json();
    if (!response.ok) throw new ApiRequestError(response.status, body);
    if (!isNowView(body)) throw new Error("NOW response does not match the LifeOS B3 contract");
    return body;
  };

  return {
    getNow(signal) {
      return request("/v1/now", signal ? { signal } : {});
    },
    refreshNow(signal) {
      return request("/v1/now/refresh", { method: "POST", ...(signal ? { signal } : {}) });
    },
    resolveRecommendation(recommendationId, input, signal) {
      return request(`/v1/now/recommendations/${encodeURIComponent(recommendationId)}/resolve`, {
        method: "POST",
        body: JSON.stringify(input),
        ...(signal ? { signal } : {})
      });
    }
  };
}

export function isNowView(value: unknown): value is NowView {
  if (!isRecord(value) || typeof value.state !== "string" || typeof value.generatedAt !== "string") return false;

  if (value.state === "no_direction") {
    return typeof value.message === "string";
  }

  if (!isSeason(value.season)) return false;

  if (value.state === "blocked") {
    return Number.isInteger(value.blockedActionCount) && typeof value.message === "string";
  }

  if (value.state === "no_ready_action") {
    return (
      Number.isInteger(value.readyActionCount) &&
      (value.reason === "none_ready" ||
        value.reason === "recommendation_resolved" ||
        value.reason === "recommendation_missing") &&
      typeof value.message === "string"
    );
  }

  if (value.state !== "ready" || !isAction(value.action) || !isRecommendation(value.recommendation)) return false;
  return true;
}

function isSeason(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.purpose === "string" &&
    (value.primaryFocusText === undefined || typeof value.primaryFocusText === "string")
  );
}

function isAction(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    (value.doneCondition === undefined || typeof value.doneCondition === "string") &&
    (value.estimatedMinutes === undefined || Number.isInteger(value.estimatedMinutes)) &&
    (value.scheduledFor === undefined || typeof value.scheduledFor === "string") &&
    (value.priority === undefined || typeof value.priority === "number")
  );
}

function isRecommendation(value: unknown): boolean {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.rationale !== "string" ||
    typeof value.confidenceClass !== "string" ||
    !(RECOMMENDATION_CONFIDENCE_CLASSES as readonly string[]).includes(value.confidenceClass) ||
    (value.status !== "shown" && value.status !== "accepted" && value.status !== "edited") ||
    !Array.isArray(value.evidence)
  ) {
    return false;
  }

  return value.evidence.every(
    (item) =>
      isRecord(item) &&
      typeof item.key === "string" &&
      (NEXT_ACTION_FACTOR_KEYS as readonly string[]).includes(item.key) &&
      typeof item.label === "string" &&
      typeof item.score === "number" &&
      isRecord(item.value) &&
      typeof item.strength === "string" &&
      (EVIDENCE_STRENGTHS as readonly string[]).includes(item.strength)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
