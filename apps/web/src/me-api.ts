import { ME_UNAVAILABLE_SECTIONS, type MeOverviewView } from "@lifeos/domain";
import { ApiRequestError } from "./api";

export type MeApiClient = {
  getOverview(signal?: AbortSignal): Promise<MeOverviewView>;
};

export function createMeApiClient(baseUrl = ""): MeApiClient {
  return {
    async getOverview(signal) {
      const response = await fetch(`${baseUrl}/v1/me`, { credentials: "include", ...(signal ? { signal } : {}) });
      const body: unknown = await response.json();
      if (!response.ok) throw new ApiRequestError(response.status, body);
      if (!isMeOverviewView(body)) throw new Error("ME overview response does not match the LifeOS contract");
      return body;
    }
  };
}

export function isMeOverviewView(value: unknown): value is MeOverviewView {
  if (!isRecord(value) || typeof value.generatedAt !== "string" || !isRecord(value.personalContext)) return false;
  const context = value.personalContext;
  if (typeof context.hasDirection !== "boolean" || typeof context.activeOutcomeCount !== "number") return false;
  return (
    Array.isArray(value.unavailableSections) &&
    value.unavailableSections.every((section) => (ME_UNAVAILABLE_SECTIONS as readonly string[]).includes(section as string))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
