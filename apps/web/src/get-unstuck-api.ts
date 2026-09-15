import {
  ACTION_STATUSES,
  GET_UNSTUCK_FRICTIONS,
  GET_UNSTUCK_INTERVENTIONS,
  type ActionView,
  type ApplyGetUnstuckEditInput,
  type GetUnstuckDiagnosisView,
  type GetUnstuckFriction,
  type GetUnstuckListView,
  type StuckActionEvidence
} from "@lifeos/domain";
import { ApiRequestError } from "./api";

export type GetUnstuckApiClient = {
  listCandidates(signal?: AbortSignal): Promise<GetUnstuckListView>;
  diagnose(actionId: string, friction: GetUnstuckFriction, signal?: AbortSignal): Promise<GetUnstuckDiagnosisView>;
  applyEdit(actionId: string, input: ApplyGetUnstuckEditInput, signal?: AbortSignal): Promise<ActionView>;
  revive(actionId: string, signal?: AbortSignal): Promise<ActionView>;
};

export function createGetUnstuckApiClient(baseUrl = ""): GetUnstuckApiClient {
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
    async listCandidates(signal) {
      const value = await request("/v1/get-unstuck", signal ? { signal } : {});
      if (!isGetUnstuckListView(value)) throw new Error("Get Unstuck list response does not match the LifeOS contract");
      return value;
    },
    async diagnose(actionId, friction, signal) {
      const value = await request(`/v1/actions/${encodeURIComponent(actionId)}/get-unstuck/diagnose`, {
        method: "POST",
        body: JSON.stringify({ friction }),
        ...(signal ? { signal } : {})
      });
      if (!isGetUnstuckDiagnosisView(value)) throw new Error("Get Unstuck diagnosis response does not match the LifeOS contract");
      return value;
    },
    async applyEdit(actionId, input, signal) {
      const value = await request(`/v1/actions/${encodeURIComponent(actionId)}/get-unstuck/edit`, {
        method: "POST",
        body: JSON.stringify(input),
        ...(signal ? { signal } : {})
      });
      if (!isActionView(value)) throw new Error("Get Unstuck edit response does not match the LifeOS contract");
      return value;
    },
    async revive(actionId, signal) {
      const value = await request(`/v1/actions/${encodeURIComponent(actionId)}/get-unstuck/revive`, {
        method: "POST",
        body: "{}",
        ...(signal ? { signal } : {})
      });
      if (!isActionView(value)) throw new Error("Get Unstuck revive response does not match the LifeOS contract");
      return value;
    }
  };
}

function isStuckActionEvidence(value: unknown): value is StuckActionEvidence {
  if (!isRecord(value) || !isRecord(value.action)) return false;
  const action = value.action;
  return (
    typeof action.id === "string" &&
    typeof action.title === "string" &&
    typeof action.status === "string" &&
    (ACTION_STATUSES as readonly string[]).includes(action.status) &&
    Array.isArray(value.reasons) &&
    typeof value.postponedCount === "number" &&
    typeof value.blockedResultCount === "number" &&
    typeof value.wrongAssumptionCount === "number"
  );
}

export function isGetUnstuckListView(value: unknown): value is GetUnstuckListView {
  return isRecord(value) && typeof value.generatedAt === "string" && Array.isArray(value.candidates) && value.candidates.every(isStuckActionEvidence);
}

export function isGetUnstuckDiagnosisView(value: unknown): value is GetUnstuckDiagnosisView {
  if (!isRecord(value)) return false;
  return (
    typeof value.actionId === "string" &&
    typeof value.friction === "string" &&
    (GET_UNSTUCK_FRICTIONS as readonly string[]).includes(value.friction) &&
    typeof value.intervention === "string" &&
    (GET_UNSTUCK_INTERVENTIONS as readonly string[]).includes(value.intervention) &&
    isStuckActionEvidence(value.evidence) &&
    typeof value.canRevive === "boolean" &&
    typeof value.canRecordResult === "boolean"
  );
}

export function isActionView(value: unknown): value is ActionView {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.outcomeId === "string" &&
    typeof value.title === "string" &&
    typeof value.status === "string" &&
    (ACTION_STATUSES as readonly string[]).includes(value.status)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
