// ME overview (spec §14.1). "Current personal context" (real Direction/
// Season facts), Operating Preferences (§14.2) and Pattern Candidates
// (§14.3) are all live — see operating-preference.ts and insight.ts.
// Personalization status (§14.4, "what LifeOS currently uses vs tentative
// vs disabled" as one explained summary) and Data sources/integrations
// still need dedicated work; named here instead of hidden, matching the
// "no fabricated confidence" rule.

export const ME_UNAVAILABLE_SECTIONS = ["personalizationStatus", "dataSources"] as const;
export type MeUnavailableSection = (typeof ME_UNAVAILABLE_SECTIONS)[number];

export type MePersonalContext = {
  hasDirection: boolean;
  directionTitle?: string;
  seasonTitle?: string;
  seasonPurpose?: string;
  primaryFocusText?: string;
  /** Outcomes with status = 'active' under the current Season. */
  activeOutcomeCount: number;
};

export type MeOverviewView = {
  generatedAt: string;
  personalContext: MePersonalContext;
  unavailableSections: MeUnavailableSection[];
};
