import { ACTION_RESULTS, DAILY_CLOSE_FRICTION_CODES, type CloseDayInput, type DailyCloseView } from "@lifeos/domain";
import { ApiRequestError } from "./api";

export type DailyCloseApiClient = {
  getDailyClose(date: string, offsetMinutes: number, signal?: AbortSignal): Promise<DailyCloseView>;
  closeDay(input: CloseDayInput, signal?: AbortSignal): Promise<DailyCloseView>;
};

/** Local calendar date and UTC offset of the browser, in the shape the API expects. */
export function localDayContext(now = new Date()): { date: string; offsetMinutes: number } {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return { date: `${year}-${month}-${day}`, offsetMinutes: now.getTimezoneOffset() };
}

export function createDailyCloseApiClient(baseUrl = ""): DailyCloseApiClient {
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
    async getDailyClose(date, offsetMinutes, signal) {
      const query = new URLSearchParams({ date, offsetMinutes: String(offsetMinutes) });
      const value = await request(`/v1/daily-close?${query.toString()}`, signal ? { signal } : {});
      if (!isDailyCloseView(value)) throw new Error("Daily Close response does not match the LifeOS B5 contract");
      return value;
    },
    async closeDay(input, signal) {
      const value = await request("/v1/daily-close", {
        method: "POST",
        body: JSON.stringify(input),
        ...(signal ? { signal } : {})
      });
      if (!isDailyCloseView(value)) throw new Error("Daily Close response does not match the LifeOS B5 contract");
      return value;
    }
  };
}

export function isDailyCloseView(value: unknown): value is DailyCloseView {
  if (!isRecord(value)) return false;
  if (typeof value.date !== "string" || typeof value.generatedAt !== "string") return false;
  if (!isRecord(value.range) || typeof value.range.from !== "string" || typeof value.range.to !== "string") return false;
  if (!isRecord(value.summary)) return false;
  const summary = value.summary;
  const results = summary.results;
  if (!isRecord(results) || !ACTION_RESULTS.every((result) => typeof results[result] === "number")) return false;
  if (!Array.isArray(summary.resultItems)) return false;
  if (!isRecord(summary.focusSessions) || typeof summary.focusSessions.count !== "number" || typeof summary.focusSessions.totalMinutes !== "number") return false;
  if (typeof summary.distractionsCaptured !== "number" || typeof summary.outcomesMoved !== "number" || typeof summary.intentionalDecisions !== "number") return false;
  if (value.close !== null) {
    if (!isRecord(value.close) || typeof value.close.id !== "string" || typeof value.close.closedAt !== "string") return false;
    if (value.close.frictionCode !== undefined && !(DAILY_CLOSE_FRICTION_CODES as readonly string[]).includes(String(value.close.frictionCode))) return false;
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
