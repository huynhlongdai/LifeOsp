import type { CaptureId, CaptureKind, CaptureListView, CaptureProcessingStatus, IncubatorItemId, IncubatorItemView, IncubatorKind, IncubatorListView, IncubatorStatus } from "@lifeos/domain";
import { and, desc, eq, sql } from "drizzle-orm";
import type { DatabaseClient } from "./index.js";
import * as schema from "./schema.js";

export async function listCaptures(
  database: DatabaseClient,
  userId: string,
  limit: number,
  generatedAt: Date
): Promise<CaptureListView> {
  const rows = await database.db
    .select()
    .from(schema.captures)
    .where(eq(schema.captures.userId, userId))
    .orderBy(desc(schema.captures.createdAt))
    .limit(limit);

  const [count] = await database.db
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.captures)
    .where(eq(schema.captures.userId, userId));

  return {
    generatedAt: generatedAt.toISOString(),
    items: rows.map(toCaptureListItem),
    total: count?.total ?? rows.length
  };
}

export async function listIncubatorItems(
  database: DatabaseClient,
  userId: string,
  generatedAt: Date
): Promise<IncubatorListView> {
  const rows = await database.db
    .select()
    .from(schema.incubatorItems)
    .where(and(eq(schema.incubatorItems.userId, userId), eq(schema.incubatorItems.status, "incubated")))
    .orderBy(desc(schema.incubatorItems.createdAt));

  const counts: Record<IncubatorKind, number> = { idea: 0, project_candidate: 0, someday: 0, reference: 0 };
  for (const row of rows) counts[row.kind as IncubatorKind] += 1;

  return {
    generatedAt: generatedAt.toISOString(),
    items: rows.map(toIncubatorListItem),
    counts
  };
}

function toCaptureListItem(row: schema.CaptureRow): CaptureListView["items"][number] {
  return {
    id: row.id as CaptureId,
    kind: row.kind as CaptureKind,
    rawText: row.rawText,
    processingStatus: row.processingStatus as CaptureProcessingStatus,
    createdAt: row.createdAt.toISOString()
  };
}

function toIncubatorListItem(row: schema.IncubatorItemRow): IncubatorItemView {
  return {
    id: row.id as IncubatorItemId,
    ...(row.sourceCaptureId === null ? {} : { sourceCaptureId: row.sourceCaptureId as CaptureId }),
    title: row.title,
    ...(row.notes === null ? {} : { notes: row.notes }),
    kind: row.kind as IncubatorKind,
    status: row.status as IncubatorStatus,
    ...(row.revisitOn === null ? {} : { revisitOn: String(row.revisitOn) }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
