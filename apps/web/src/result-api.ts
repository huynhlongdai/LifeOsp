import type {
  ActionResultOutcome,
  ActionResultView,
  CommitDailyCloseInput,
  DailyCloseView,
  RecordActionResultInput
} from "@lifeos/domain";
import { ApiRequestError } from "./api";

export type ResultApiClient = {
  recordActionResult(
    actionId: string,
    input: RecordActionResultInput,
    signal?: AbortSignal
  ): Promise<ActionResultView>;
  getDailyClose(localDate: string, tzOffsetMinutes: number, signal?: AbortSignal): Promise<DailyCloseView>;
  commitDailyClose(input: CommitDailyCloseInput, signal?: AbortSignal): Promise<DailyCloseView>;
};

export function createResultApiClient(baseUrl = ""): ResultApiClient {
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
    async recordActionResult(actionId, input, signal) {
      const body = await request(`/v1/actions/${encodeURIComponent(actionId)}/result`, {
        method: "POST",
        body: JSON.stringify(input),
        ...(signal ? { signal } : {})
      });
      if (!isActionResultView(body)) throw new Error("Result response does not match the LifeOS B5 contract");
      return body;
    },
    async getDailyClose(localDate, tzOffsetMinutes, signal) {
      const query = `?date=${encodeURIComponent(localDate)}&tzOffsetMinutes=${tzOffsetMinutes}`;
      const body = await request(`/v1/daily-close${query}`, signal ? { signal } : {});
      if (!isDailyCloseView(body)) throw new Error("Daily Close response does not match the LifeOS B5 contract");
      return body;
    },
    async commitDailyClose(input, signal) {
      const body = await request("/v1/daily-close", {
        method: "POST",
        body: JSON.stringify(input),
        ...(signal ? { signal } : {})
      });
      if (!isDailyCloseView(body)) throw new Error("Daily Close response does not match the LifeOS B5 contract");
      return body;
    }
  };
}

const OUTCOMES: readonly ActionResultOutcome[] = ["completed", "partial", "postponed", "blocked", "dropped"];

export function isActionResultView(value: unknown): value is ActionResultView {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || typeof value.actionId !== "string") return false;
  if (typeof value.outcome !== "string" || !(OUTCOMES as readonly string[]).includes(value.outcome)) return false;
  if (typeof value.actionStatus !== "string" || typeof value.recordedAt !== "string") return false;
  return true;
}

export function isDailyCloseView(value: unknown): value is DailyCloseView {
  if (!isRecord(value)) return false;
  if (typeof value.localDate !== "string" || typeof value.generatedAt !== "string") return false;
  if (typeof value.tzOffsetMinutes !== "number") return false;
  if (!Array.isArray(value.results) || !value.results.every(isActionResultView)) return false;
  const summary = value.summary;
  if (!isRecord(summary)) return false;
  const counters = [
    "resultsRecorded",
    "completed",
    "partial",
    "postponed",
    "blocked",
    "dropped",
    "focusSessions",
    "focusMinutes",
    "distractionsCaptured",
    "capturesCreated"
  ];
  return counters.every((key) => typeof summary[key] === "number");
}

/** Local calendar date of the browser, used as the Daily Close key. */
export function browserLocalDate(now = new Date()): string {
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** Minutes ahead of UTC for the browser, matching the API tzOffsetMinutes contract. */
export function browserTzOffsetMinutes(now = new Date()): number {
  return -now.getTimezoneOffset();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
