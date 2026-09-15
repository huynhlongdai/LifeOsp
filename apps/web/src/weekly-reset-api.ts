import { ACTION_RESULTS, WEEKLY_RESET_UNAVAILABLE_SECTIONS, type CompleteWeeklyResetInput, type WeeklyResetView } from "@lifeos/domain";
import { ApiRequestError } from "./api";

export type WeeklyResetCompletedView = { status: "completed"; completedAt: string };

export type WeeklyResetApiClient = {
  getWeeklyReset(weekStart: string, offsetMinutes: number, signal?: AbortSignal): Promise<WeeklyResetView>;
  complete(input: CompleteWeeklyResetInput, signal?: AbortSignal): Promise<WeeklyResetCompletedView>;
};

/** Local Monday of the browser's current week, and its UTC offset. */
export function localWeekContext(now = new Date()): { weekStart: string; offsetMinutes: number } {
  const daysSinceMonday = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, "0");
  const day = String(monday.getDate()).padStart(2, "0");
  return { weekStart: `${year}-${month}-${day}`, offsetMinutes: now.getTimezoneOffset() };
}

export function createWeeklyResetApiClient(baseUrl = ""): WeeklyResetApiClient {
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
    async getWeeklyReset(weekStart, offsetMinutes, signal) {
      const query = new URLSearchParams({ weekStart, offsetMinutes: String(offsetMinutes) });
      const value = await request(`/v1/weekly-reset?${query.toString()}`, signal ? { signal } : {});
      if (!isWeeklyResetView(value)) throw new Error("Weekly Reset response does not match the LifeOS contract");
      return value;
    },
    async complete(input, signal) {
      const value = await request("/v1/weekly-reset/complete", {
        method: "POST",
        body: JSON.stringify(input),
        ...(signal ? { signal } : {})
      });
      if (!isRecord(value) || value.status !== "completed" || typeof value.completedAt !== "string") {
        throw new Error("Weekly Reset completion response does not match the LifeOS contract");
      }
      return value as WeeklyResetCompletedView;
    }
  };
}

function isMovementItem(value: unknown): boolean {
  return isRecord(value) && typeof value.id === "string" && typeof value.title === "string" && typeof value.outcomeId === "string";
}

export function isWeeklyResetView(value: unknown): value is WeeklyResetView {
  if (!isRecord(value) || typeof value.weekStart !== "string" || typeof value.weekEnd !== "string") return false;
  if (!isRecord(value.reality) || !isRecord(value.reality.resultCounts)) return false;
  const resultCounts = value.reality.resultCounts as Record<string, unknown>;
  if (!ACTION_RESULTS.every((result) => typeof resultCounts[result] === "number")) return false;
  if (!isRecord(value.movement)) return false;
  if (!Array.isArray(value.movement.advanced) || !value.movement.advanced.every(isMovementItem)) return false;
  if (!Array.isArray(value.movement.blocked) || !value.movement.blocked.every(isMovementItem)) return false;
  if (!Array.isArray(value.movement.intentionallyDropped) || !value.movement.intentionallyDropped.every(isMovementItem)) return false;
  if (!isRecord(value.nextWeek) || typeof value.nextWeek.hasDirection !== "boolean") return false;
  return (
    Array.isArray(value.unavailableSections) &&
    value.unavailableSections.every((section) => (WEEKLY_RESET_UNAVAILABLE_SECTIONS as readonly string[]).includes(section as string))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
