import { ACTION_RESULTS, ACTION_STATUSES, type ActionResultView, type RecordActionResultInput } from "@lifeos/domain";
import { ApiRequestError } from "./api";
import { isFocusSessionView } from "./focus-api";

export type ResultApiClient = {
  recordResult(actionId: string, input: RecordActionResultInput, signal?: AbortSignal): Promise<ActionResultView>;
};

export function createResultApiClient(baseUrl = ""): ResultApiClient {
  return {
    async recordResult(actionId, input, signal) {
      const response = await fetch(`${baseUrl}/v1/actions/${encodeURIComponent(actionId)}/result`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
        ...(signal ? { signal } : {})
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new ApiRequestError(response.status, body);
      if (!isActionResultView(body)) throw new Error("Result response does not match the LifeOS B5 contract");
      return body;
    }
  };
}

export function isActionResultView(value: unknown): value is ActionResultView {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || typeof value.actionId !== "string") return false;
  if (typeof value.result !== "string" || !(ACTION_RESULTS as readonly string[]).includes(value.result)) return false;
  if (typeof value.actualFocusMinutes !== "number" || typeof value.focusSessionCount !== "number") return false;
  if (typeof value.recordedAt !== "string") return false;
  if (!isRecord(value.action)) return false;
  if (typeof value.action.id !== "string" || typeof value.action.title !== "string") return false;
  if (typeof value.action.status !== "string" || !(ACTION_STATUSES as readonly string[]).includes(value.action.status)) return false;
  if (value.focus !== undefined && !isFocusSessionView(value.focus)) return false;
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
