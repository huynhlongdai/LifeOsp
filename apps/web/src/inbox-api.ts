import {
  CAPTURE_KINDS,
  CAPTURE_PROCESSING_STATUSES,
  INCUBATOR_KINDS,
  INCUBATOR_STATUSES,
  type CaptureListView,
  type IncubatorListView
} from "@lifeos/domain";
import { ApiRequestError } from "./api";

export type InboxApiClient = {
  listCaptures(limit?: number, signal?: AbortSignal): Promise<CaptureListView>;
  listIncubator(signal?: AbortSignal): Promise<IncubatorListView>;
};

export function createInboxApiClient(baseUrl = ""): InboxApiClient {
  const request = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${baseUrl}${path}`, { ...init, credentials: "include" });
    const body: unknown = await response.json();
    if (!response.ok) throw new ApiRequestError(response.status, body);
    return body;
  };

  return {
    async listCaptures(limit, signal) {
      const query = limit ? `?limit=${encodeURIComponent(String(limit))}` : "";
      const value = await request(`/v1/captures${query}`, signal ? { signal } : {});
      if (!isCaptureListView(value)) throw new Error("Capture list response does not match the LifeOS contract");
      return value;
    },
    async listIncubator(signal) {
      const value = await request("/v1/incubator", signal ? { signal } : {});
      if (!isIncubatorListView(value)) throw new Error("Incubator response does not match the LifeOS contract");
      return value;
    }
  };
}

export function isCaptureListView(value: unknown): value is CaptureListView {
  if (!isRecord(value) || typeof value.generatedAt !== "string" || typeof value.total !== "number") return false;
  if (!Array.isArray(value.items)) return false;
  return value.items.every(
    (item) =>
      isRecord(item) &&
      typeof item.id === "string" &&
      typeof item.kind === "string" &&
      (CAPTURE_KINDS as readonly string[]).includes(item.kind) &&
      typeof item.rawText === "string" &&
      typeof item.processingStatus === "string" &&
      (CAPTURE_PROCESSING_STATUSES as readonly string[]).includes(item.processingStatus) &&
      typeof item.createdAt === "string"
  );
}

export function isIncubatorListView(value: unknown): value is IncubatorListView {
  if (!isRecord(value) || typeof value.generatedAt !== "string" || !isRecord(value.counts)) return false;
  const counts = value.counts;
  if (!INCUBATOR_KINDS.every((kind) => typeof counts[kind] === "number")) return false;
  if (!Array.isArray(value.items)) return false;
  return value.items.every(
    (item) =>
      isRecord(item) &&
      typeof item.id === "string" &&
      typeof item.title === "string" &&
      typeof item.kind === "string" &&
      (INCUBATOR_KINDS as readonly string[]).includes(item.kind) &&
      typeof item.status === "string" &&
      (INCUBATOR_STATUSES as readonly string[]).includes(item.status) &&
      typeof item.createdAt === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
