import type { HealthStatus } from "@lifeos/domain";

export type ApiClient = {
  getHealth(signal?: AbortSignal): Promise<HealthStatus>;
};

export function createApiClient(baseUrl = ""): ApiClient {
  return {
    async getHealth(signal?: AbortSignal): Promise<HealthStatus> {
      const response = await fetch(`${baseUrl}/health`, { signal });
      if (!response.ok) {
        throw new Error(`API health request failed with status ${response.status}`);
      }

      const value: unknown = await response.json();
      if (!isHealthStatus(value)) {
        throw new Error("API health response does not match the LifeOS contract");
      }

      return value;
    }
  };
}

function isHealthStatus(value: unknown): value is HealthStatus {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.status === "ok" &&
    candidate.service === "lifeos-api" &&
    typeof candidate.timestamp === "string"
  );
}
