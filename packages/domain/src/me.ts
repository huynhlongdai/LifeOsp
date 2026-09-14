import type { SeasonId } from "./ids.js";

/**
 * ME is a mirror, not a scoreboard: every number comes from what the user actually
 * recorded (focus sessions, results, daily closes). Nothing is estimated or projected.
 */
export type MeSeasonView = {
  id: SeasonId;
  title: string;
  purpose: string;
  startsOn?: string;
  targetEndsOn?: string;
};

export type MeView = {
  memberSince: string;
  season?: MeSeasonView;
  directionTitle?: string;
  stats: {
    focusSessionsTotal: number;
    focusMinutesLast7Days: number;
    actionsCompletedLast7Days: number;
    actionsOpen: number;
    capturesTotal: number;
    dailyCloseStreak: number;
    lastDailyCloseOn?: string;
  };
};

/** Counts consecutive closed days ending at the most recent close (dates sorted descending). */
export function countClosingStreak(datesDescending: string[]): number {
  if (datesDescending.length === 0) return 0;
  let streak = 1;
  for (let index = 1; index < datesDescending.length; index += 1) {
    const previous = datesDescending[index - 1];
    const current = datesDescending[index];
    if (!previous || !current) break;
    const gapDays = Math.round(
      (new Date(`${previous}T00:00:00Z`).getTime() - new Date(`${current}T00:00:00Z`).getTime()) / 86_400_000
    );
    if (gapDays !== 1) break;
    streak += 1;
  }
  return streak;
}
