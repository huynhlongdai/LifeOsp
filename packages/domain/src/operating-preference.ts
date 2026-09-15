import type { InsightId, OperatingPreferenceId } from "./ids.js";

// OperatingPreference (DOMAIN_MODEL_V1.md §17): a durable product behavior
// rule accepted or strongly established for the user. V0 ships exactly the
// two keys named as examples in PERSONAL_INTELLIGENCE_ENGINE_V1.md, both
// wired into the Next Action Engine (packages/domain/src/next-action.ts).

export const OPERATING_PREFERENCE_KEYS = ["next_action.target_max_minutes", "projects.max_primary_active"] as const;
export type OperatingPreferenceKey = (typeof OPERATING_PREFERENCE_KEYS)[number];

export const OPERATING_PREFERENCE_SOURCES = ["explicit_user", "confirmed_insight", "system_default"] as const;
export type OperatingPreferenceSource = (typeof OPERATING_PREFERENCE_SOURCES)[number];

export const OPERATING_PREFERENCE_STATUSES = ["active", "disabled"] as const;
export type OperatingPreferenceStatus = (typeof OPERATING_PREFERENCE_STATUSES)[number];

/** Both current keys are positive-integer values (minutes / a project count). */
export type OperatingPreferenceView = {
  id: OperatingPreferenceId;
  key: OperatingPreferenceKey;
  value: number;
  source: OperatingPreferenceSource;
  status: OperatingPreferenceStatus;
  sourceInsightId?: InsightId;
  createdAt: string;
  updatedAt: string;
};

export type OperatingPreferenceListView = {
  generatedAt: string;
  preferences: OperatingPreferenceView[];
};

export type UpdateOperatingPreferenceInput = {
  value?: number;
  status?: OperatingPreferenceStatus;
};

export function isValidOperatingPreferenceValue(key: OperatingPreferenceKey, value: unknown): value is number {
  if (typeof value !== "number" || !Number.isInteger(value)) return false;
  if (key === "next_action.target_max_minutes") return value >= 5 && value <= 480;
  if (key === "projects.max_primary_active") return value >= 1 && value <= 20;
  return false;
}

/** Only active preferences with a recognized key/value should ever reach ranking or UI logic.
 * `value` is accepted as unknown (e.g. straight from a jsonb column) and validated here. */
export function activePreferenceValue(
  preferences: readonly { key: OperatingPreferenceKey; status: OperatingPreferenceStatus; value: unknown }[],
  key: OperatingPreferenceKey
): number | undefined {
  const match = preferences.find((preference) => preference.key === key && preference.status === "active");
  if (!match || !isValidOperatingPreferenceValue(key, match.value)) return undefined;
  return match.value;
}
