import { FOCUS_SESSION_STATUSES, type DistractionCaptureView, type FocusSessionView, type FocusStateView } from "@lifeos/domain";
import { ApiRequestError } from "./api";

export type FocusApiClient = {
  getFocus(signal?: AbortSignal): Promise<FocusStateView>;
  startFocus(recommendationId: string, signal?: AbortSignal): Promise<FocusSessionView>;
  endFocus(focusSessionId: string, outcome: "completed" | "interrupted" | "abandoned", signal?: AbortSignal): Promise<FocusSessionView>;
  captureDistraction(focusSessionId: string, rawText: string, signal?: AbortSignal): Promise<DistractionCaptureView>;
};

export function createFocusApiClient(baseUrl = ""): FocusApiClient {
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
    return body;
  };

  return {
    async getFocus(signal) {
      const value = await request("/v1/focus", signal ? { signal } : {});
      if (!isFocusStateView(value)) throw new Error("Focus response does not match the LifeOS B4 contract");
      return value;
    },
    async startFocus(recommendationId, signal) {
      const value = await request("/v1/focus/start", {
        method: "POST",
        body: JSON.stringify({ recommendationId }),
        ...(signal ? { signal } : {})
      });
      if (!isFocusSessionView(value)) throw new Error("Focus start response does not match the LifeOS B4 contract");
      return value;
    },
    async endFocus(focusSessionId, outcome, signal) {
      const value = await request(`/v1/focus/${encodeURIComponent(focusSessionId)}/end`, {
        method: "POST",
        body: JSON.stringify({ outcome }),
        ...(signal ? { signal } : {})
      });
      if (!isFocusSessionView(value)) throw new Error("Focus end response does not match the LifeOS B4 contract");
      return value;
    },
    async captureDistraction(focusSessionId, rawText, signal) {
      const value = await request(`/v1/focus/${encodeURIComponent(focusSessionId)}/distractions`, {
        method: "POST",
        body: JSON.stringify({ rawText }),
        ...(signal ? { signal } : {})
      });
      if (!isDistractionCaptureView(value)) throw new Error("Distraction response does not match the LifeOS B4 contract");
      return value;
    }
  };
}

export function isFocusStateView(value: unknown): value is FocusStateView {
  if (!isRecord(value) || typeof value.state !== "string" || typeof value.generatedAt !== "string") return false;
  if (value.state === "none") return true;
  if (value.state !== "active" && value.state !== "recent") return false;
  return isFocusSessionView(value.focus);
}

export function isFocusSessionView(value: unknown): value is FocusSessionView {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.actionId === "string" &&
    (value.recommendationId === undefined || typeof value.recommendationId === "string") &&
    typeof value.status === "string" &&
    (FOCUS_SESSION_STATUSES as readonly string[]).includes(value.status) &&
    (value.plannedMinutes === undefined || Number.isInteger(value.plannedMinutes)) &&
    typeof value.startedAt === "string" &&
    (value.endedAt === undefined || typeof value.endedAt === "string") &&
    isRecord(value.action) &&
    typeof value.action.id === "string" &&
    typeof value.action.title === "string" &&
    (value.action.doneCondition === undefined || typeof value.action.doneCondition === "string")
  );
}

function isDistractionCaptureView(value: unknown): value is DistractionCaptureView {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.focusSessionId === "string" &&
    typeof value.actionId === "string" &&
    typeof value.rawText === "string" &&
    typeof value.createdAt === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
