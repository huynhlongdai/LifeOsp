/**
 * Personal settings the user controls. LifeOS reads them; it never changes them on the
 * user's behalf, and the AI toggles only widen or narrow what may be proposed — nothing
 * here lets AI activate a commitment on its own.
 */
export type UserPreferencesView = {
  timezone: string;
  workStartMinute: number;
  workEndMinute: number;
  workDays: number[];
  focusMinutes: number;
  breakMinutes: number;
  aiSuggestsActions: boolean;
  aiDailySummary: boolean;
  updatedAt: string;
};

export type UpdateUserPreferencesInput = Partial<Omit<UserPreferencesView, "updatedAt">>;

export const DEFAULT_USER_PREFERENCES: Omit<UserPreferencesView, "updatedAt"> = {
  timezone: "Asia/Ho_Chi_Minh",
  workStartMinute: 8 * 60,
  workEndMinute: 18 * 60,
  workDays: [1, 2, 3, 4, 5],
  focusMinutes: 40,
  breakMinutes: 10,
  aiSuggestsActions: true,
  aiDailySummary: false
};

/** Validates an update; returns null when anything falls outside what the schema allows. */
export function parseUserPreferencesUpdate(value: unknown): UpdateUserPreferencesInput | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const allowed = new Set([
    "timezone",
    "workStartMinute",
    "workEndMinute",
    "workDays",
    "focusMinutes",
    "breakMinutes",
    "aiSuggestsActions",
    "aiDailySummary"
  ]);
  if (Object.keys(record).some((key) => !allowed.has(key))) return null;

  const update: UpdateUserPreferencesInput = {};

  if (record.timezone !== undefined) {
    if (typeof record.timezone !== "string" || record.timezone.trim().length === 0 || record.timezone.length > 100) return null;
    update.timezone = record.timezone;
  }
  for (const key of ["workStartMinute", "workEndMinute"] as const) {
    if (record[key] === undefined) continue;
    const minute = record[key];
    if (typeof minute !== "number" || !Number.isInteger(minute) || minute < 0 || minute > 1440) return null;
    update[key] = minute;
  }
  if (update.workStartMinute !== undefined && update.workEndMinute !== undefined && update.workStartMinute >= update.workEndMinute) {
    return null;
  }
  if (record.workDays !== undefined) {
    if (!Array.isArray(record.workDays)) return null;
    const days = record.workDays;
    if (!days.every((day) => typeof day === "number" && Number.isInteger(day) && day >= 0 && day <= 6)) return null;
    update.workDays = [...new Set(days as number[])].sort((left, right) => left - right);
  }
  if (record.focusMinutes !== undefined) {
    const minutes = record.focusMinutes;
    if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes < 5 || minutes > 240) return null;
    update.focusMinutes = minutes;
  }
  if (record.breakMinutes !== undefined) {
    const minutes = record.breakMinutes;
    if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes < 0 || minutes > 120) return null;
    update.breakMinutes = minutes;
  }
  for (const key of ["aiSuggestsActions", "aiDailySummary"] as const) {
    if (record[key] === undefined) continue;
    if (typeof record[key] !== "boolean") return null;
    update[key] = record[key];
  }

  return update;
}
