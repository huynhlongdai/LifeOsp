import { ACTION_STATUSES, type ExecuteActionView, type ExecuteBoardView } from "@lifeos/domain";
import { ApiRequestError } from "./api";

export type ExecuteApiClient = {
  getBoard(signal?: AbortSignal): Promise<ExecuteBoardView>;
};

export function createExecuteApiClient(baseUrl = ""): ExecuteApiClient {
  return {
    async getBoard(signal) {
      const response = await fetch(`${baseUrl}/v1/execute`, { credentials: "include", ...(signal ? { signal } : {}) });
      const body: unknown = await response.json();
      if (!response.ok) throw new ApiRequestError(response.status, body);
      if (!isExecuteBoardView(body)) throw new Error("Execute board response does not match the LifeOS contract");
      return body;
    }
  };
}

function isExecuteActionView(value: unknown): value is ExecuteActionView {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.outcomeId === "string" &&
    typeof value.title === "string" &&
    typeof value.status === "string" &&
    (ACTION_STATUSES as readonly string[]).includes(value.status)
  );
}

export function isExecuteBoardView(value: unknown): value is ExecuteBoardView {
  return (
    isRecord(value) &&
    typeof value.generatedAt === "string" &&
    Array.isArray(value.ready) &&
    value.ready.every(isExecuteActionView) &&
    Array.isArray(value.candidates) &&
    value.candidates.every(isExecuteActionView) &&
    Array.isArray(value.blocked) &&
    value.blocked.every(isExecuteActionView) &&
    Array.isArray(value.recentlyFinished) &&
    value.recentlyFinished.every(isExecuteActionView) &&
    Array.isArray(value.outcomes) &&
    Array.isArray(value.projects)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
