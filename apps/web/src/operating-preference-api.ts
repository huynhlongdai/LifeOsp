import { OPERATING_PREFERENCE_STATUSES, type OperatingPreferenceListView, type OperatingPreferenceStatus, type OperatingPreferenceView } from "@lifeos/domain";
import { ApiRequestError } from "./api";

export type OperatingPreferenceApiClient = {
  list(signal?: AbortSignal): Promise<OperatingPreferenceListView>;
  update(id: string, input: { value?: number; status?: OperatingPreferenceStatus }, signal?: AbortSignal): Promise<OperatingPreferenceView>;
  remove(id: string, signal?: AbortSignal): Promise<void>;
};

export function createOperatingPreferenceApiClient(baseUrl = ""): OperatingPreferenceApiClient {
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
    async list(signal) {
      const value = await request("/v1/operating-preferences", signal ? { signal } : {});
      if (!isOperatingPreferenceListView(value)) throw new Error("Operating Preference list response does not match the LifeOS contract");
      return value;
    },
    async update(id, input, signal) {
      const value = await request(`/v1/operating-preferences/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(input),
        ...(signal ? { signal } : {})
      });
      if (!isOperatingPreferenceView(value)) throw new Error("Operating Preference update response does not match the LifeOS contract");
      return value;
    },
    async remove(id, signal) {
      await request(`/v1/operating-preferences/${encodeURIComponent(id)}`, { method: "DELETE", ...(signal ? { signal } : {}) });
    }
  };
}

export function isOperatingPreferenceView(value: unknown): value is OperatingPreferenceView {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.key === "string" &&
    typeof value.value === "number" &&
    typeof value.status === "string" &&
    (OPERATING_PREFERENCE_STATUSES as readonly string[]).includes(value.status)
  );
}

export function isOperatingPreferenceListView(value: unknown): value is OperatingPreferenceListView {
  return isRecord(value) && typeof value.generatedAt === "string" && Array.isArray(value.preferences) && value.preferences.every(isOperatingPreferenceView);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
