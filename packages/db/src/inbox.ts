import { and, desc, eq, inArray } from "drizzle-orm";
import type { DatabaseClient } from "./index.js";
import * as schema from "./schema.js";

export type InboxRows = {
  captures: Array<{ capture: schema.CaptureRow; hasInterpretation: boolean }>;
  incubated: schema.IncubatorItemRow[];
  counts: { captures: number; incubated: number };
};

/**
 * Reads the user's parked material: recent captures and every item still incubated.
 * Both lists are capped so the screen stays readable, while counts report the true
 * totals so nothing looks smaller than it really is.
 */
export async function findInbox(database: DatabaseClient, userId: string, limit = 50): Promise<InboxRows> {
  const captures = await database.db
    .select()
    .from(schema.captures)
    .where(eq(schema.captures.userId, userId))
    .orderBy(desc(schema.captures.createdAt))
    .limit(limit);

  const interpreted = new Set<string>();
  if (captures.length > 0) {
    const rows = await database.db
      .selectDistinct({ captureId: schema.captureInterpretations.captureId })
      .from(schema.captureInterpretations)
      .where(
        inArray(
          schema.captureInterpretations.captureId,
          captures.map((capture) => capture.id)
        )
      );
    for (const row of rows) interpreted.add(row.captureId);
  }

  const incubated = await database.db
    .select()
    .from(schema.incubatorItems)
    .where(and(eq(schema.incubatorItems.userId, userId), eq(schema.incubatorItems.status, "incubated")))
    .orderBy(desc(schema.incubatorItems.createdAt))
    .limit(limit);

  const counts = await database.pool.query<{ captures: string; incubated: string }>(
    `select
       (select count(*) from captures where user_id = $1) as captures,
       (select count(*) from incubator_items where user_id = $1 and status = 'incubated') as incubated`,
    [userId]
  );

  return {
    captures: captures.map((capture) => ({ capture, hasInterpretation: interpreted.has(capture.id) })),
    incubated,
    counts: {
      captures: Number(counts.rows[0]?.captures ?? 0),
      incubated: Number(counts.rows[0]?.incubated ?? 0)
    }
  };
}
