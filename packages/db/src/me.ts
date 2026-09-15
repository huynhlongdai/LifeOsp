import { and, count, eq } from "drizzle-orm";
import { ME_UNAVAILABLE_SECTIONS, type MeOverviewView } from "@lifeos/domain";
import type { DatabaseClient } from "./index.js";
import { findCurrentDirection } from "./promotion.js";
import * as schema from "./schema.js";

export async function readMeOverview(database: DatabaseClient, userId: string): Promise<MeOverviewView> {
  const current = await findCurrentDirection(database, userId);

  if (!current) {
    return {
      generatedAt: new Date().toISOString(),
      personalContext: { hasDirection: false, activeOutcomeCount: 0 },
      unavailableSections: [...ME_UNAVAILABLE_SECTIONS]
    };
  }

  const [outcomeCountRow] = await database.db
    .select({ value: count() })
    .from(schema.outcomes)
    .where(and(eq(schema.outcomes.userId, userId), eq(schema.outcomes.seasonId, current.season.id), eq(schema.outcomes.status, "active")));

  return {
    generatedAt: new Date().toISOString(),
    personalContext: {
      hasDirection: true,
      directionTitle: current.direction.title,
      seasonTitle: current.season.title,
      seasonPurpose: current.season.purpose,
      ...(current.season.primaryFocusText === null ? {} : { primaryFocusText: current.season.primaryFocusText }),
      activeOutcomeCount: outcomeCountRow?.value ?? 0
    },
    unavailableSections: [...ME_UNAVAILABLE_SECTIONS]
  };
}
