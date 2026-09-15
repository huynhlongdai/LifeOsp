import { INSIGHT_CONFIDENCE_CLASSES, INSIGHT_STATUSES, type InsightListView, type InsightResolution, type InsightView } from "@lifeos/domain";
import { ApiRequestError } from "./api";

export type InsightApiClient = {
  listInsights(signal?: AbortSignal): Promise<InsightListView>;
  resolve(insightId: string, resolution: InsightResolution, editedValue: number | undefined, signal?: AbortSignal): Promise<InsightView>;
};

export function createInsightApiClient(baseUrl = ""): InsightApiClient {
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
    async listInsights(signal) {
      const value = await request("/v1/insights", signal ? { signal } : {});
      if (!isInsightListView(value)) throw new Error("Insight list response does not match the LifeOS contract");
      return value;
    },
    async resolve(insightId, resolution, editedValue, signal) {
      const value = await request(`/v1/insights/${encodeURIComponent(insightId)}/resolve`, {
        method: "POST",
        body: JSON.stringify({ resolution, ...(editedValue === undefined ? {} : { editedValue }) }),
        ...(signal ? { signal } : {})
      });
      if (!isInsightView(value)) throw new Error("Insight resolve response does not match the LifeOS contract");
      return value;
    }
  };
}

export function isInsightView(value: unknown): value is InsightView {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.status === "string" &&
    (INSIGHT_STATUSES as readonly string[]).includes(value.status) &&
    typeof value.confidenceClass === "string" &&
    (INSIGHT_CONFIDENCE_CLASSES as readonly string[]).includes(value.confidenceClass)
  );
}

export function isInsightListView(value: unknown): value is InsightListView {
  return isRecord(value) && typeof value.generatedAt === "string" && Array.isArray(value.candidates) && value.candidates.every(isInsightView);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
