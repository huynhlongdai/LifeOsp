// ME overview (spec §14.1). V0 ships only "Current personal context" with
// real data — Operating Preferences (§14.2), Pattern Candidates (§14.3) and
// Personalization status (§14.4) all require a preference/pattern-candidate
// model that does not exist yet. Naming them here (instead of hiding them)
// keeps ME honest about what LifeOS does and doesn't know about the user
// yet, matching the "no fabricated confidence" rule.

export const ME_UNAVAILABLE_SECTIONS = ["operatingPreferences", "patternCandidates", "personalizationStatus", "dataSources"] as const;
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
