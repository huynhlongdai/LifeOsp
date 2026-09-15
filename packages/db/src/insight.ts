import { and, eq, inArray, sql } from "drizzle-orm";
import {
  DURATION_PATTERN_BOUNDARY_MINUTES,
  detectDurationCompletionPattern,
  detectProjectLoadPattern,
  isValidOperatingPreferenceValue,
  type InsightId,
  type InsightPatternKey,
  type InsightResolution,
  type InsightView,
  type OperatingPreferenceId,
  type ProposedPreference
} from "@lifeos/domain";
import type { DatabaseClient } from "./index.js";
import * as schema from "./schema.js";

const UNRESOLVED_STATUSES: schema.InsightRow["status"][] = ["candidate", "shown"];

function toInsightView(row: schema.InsightRow): InsightView {
  return {
    id: row.id as InsightId,
    patternKey: row.patternKey as InsightPatternKey,
    title: row.title,
    description: row.description,
    confidenceClass: row.confidenceClass as InsightView["confidenceClass"],
    status: row.status as InsightView["status"],
    evidenceSummary: row.evidenceSummary as Record<string, number>,
    ...(row.proposedPreference ? { proposedPreference: row.proposedPreference as ProposedPreference } : {}),
    createdAt: row.createdAt.toISOString(),
    ...(row.resolvedAt ? { resolvedAt: row.resolvedAt.toISOString() } : {})
  };
}

/** Detects fresh candidates with deterministic threshold rules (no AI) and
 * persists any not already recorded for this user+patternKey — a rejection
 * or confirmation is remembered forever and never regenerated. Returns
 * every currently unresolved Insight. */
export async function listInsightCandidates(database: DatabaseClient, userId: string, now: Date): Promise<InsightView[]> {
  await detectAndPersistDurationPattern(database, userId, now);
  await detectAndPersistProjectLoadPattern(database, userId, now);

  const rows = await database.db
    .select()
    .from(schema.insights)
    .where(and(eq(schema.insights.userId, userId), inArray(schema.insights.status, UNRESOLVED_STATUSES)))
    .orderBy(schema.insights.createdAt);
  return rows.map(toInsightView);
}

async function alreadyRecorded(database: DatabaseClient, userId: string, patternKey: string): Promise<boolean> {
  const [existing] = await database.db
    .select({ id: schema.insights.id })
    .from(schema.insights)
    .where(and(eq(schema.insights.userId, userId), eq(schema.insights.patternKey, patternKey)))
    .limit(1);
  return existing !== undefined;
}

async function detectAndPersistDurationPattern(database: DatabaseClient, userId: string, now: Date): Promise<void> {
  const patternKey: InsightPatternKey = "duration_completion_rate";
  if (await alreadyRecorded(database, userId, patternKey)) return;

  const rows = await database.db
    .select({
      estimatedMinutes: schema.actions.estimatedMinutes,
      completed: sql<number>`count(*) filter (where ${schema.actionResults.result} = 'completed')::int`,
      attempted: sql<number>`count(*)::int`
    })
    .from(schema.actionResults)
    .innerJoin(schema.actions, eq(schema.actions.id, schema.actionResults.actionId))
    .where(and(eq(schema.actionResults.userId, userId), sql`${schema.actions.estimatedMinutes} is not null`))
    .groupBy(schema.actions.estimatedMinutes);

  let shortAttempted = 0;
  let shortCompleted = 0;
  let longAttempted = 0;
  let longCompleted = 0;
  for (const row of rows) {
    const minutes = row.estimatedMinutes ?? 0;
    if (minutes <= DURATION_PATTERN_BOUNDARY_MINUTES) {
      shortAttempted += row.attempted;
      shortCompleted += row.completed;
    } else {
      longAttempted += row.attempted;
      longCompleted += row.completed;
    }
  }

  const detection = detectDurationCompletionPattern({ shortAttempted, shortCompleted, longAttempted, longCompleted });
  if (!detection) return;

  const shortPercent = Math.round(detection.shortRate * 100);
  const longPercent = Math.round(detection.longRate * 100);
  await database.db.insert(schema.insights).values({
    userId,
    patternKey,
    title: `Việc từ ${DURATION_PATTERN_BOUNDARY_MINUTES} phút trở xuống bạn hoàn thành thường xuyên hơn`,
    description: `Trong số việc đã ghi kết quả: việc ≤${DURATION_PATTERN_BOUNDARY_MINUTES} phút hoàn thành ${shortPercent}% (${shortCompleted}/${shortAttempted}); việc dài hơn chỉ ${longPercent}% (${longCompleted}/${longAttempted}).`,
    confidenceClass: "possible_pattern",
    status: "candidate",
    evidenceSummary: { shortAttempted, shortCompleted, longAttempted, longCompleted },
    proposedPreference: {
      key: "next_action.target_max_minutes",
      value: detection.proposedMaxMinutes,
      effect: `Các gợi ý Next Action sẽ ưu tiên việc ≤${detection.proposedMaxMinutes} phút — dựa trên đúng tỷ lệ hoàn thành bạn đã có, không phải một mặc định chung.`
    },
    createdAt: now
  });
}

async function detectAndPersistProjectLoadPattern(database: DatabaseClient, userId: string, now: Date): Promise<void> {
  const patternKey: InsightPatternKey = "project_load_stall_rate";
  if (await alreadyRecorded(database, userId, patternKey)) return;

  const activeProjects = await database.db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(and(eq(schema.projects.userId, userId), eq(schema.projects.status, "active")));
  if (activeProjects.length === 0) return;
  const activeProjectIds = activeProjects.map((row) => row.id);

  const projectsWithCompletion = await database.db
    .selectDistinct({ projectId: schema.actions.projectId })
    .from(schema.actionResults)
    .innerJoin(schema.actions, eq(schema.actions.id, schema.actionResults.actionId))
    .where(
      and(
        eq(schema.actionResults.userId, userId),
        eq(schema.actionResults.result, "completed"),
        inArray(schema.actions.projectId, activeProjectIds)
      )
    );
  const projectIdsWithCompletion = new Set(projectsWithCompletion.map((row) => row.projectId));
  const stalledProjectCount = activeProjectIds.filter((id) => !projectIdsWithCompletion.has(id)).length;

  const detection = detectProjectLoadPattern({ activeProjectCount: activeProjectIds.length, stalledProjectCount });
  if (!detection) return;

  const stallPercent = Math.round(detection.stallRate * 100);
  await database.db.insert(schema.insights).values({
    userId,
    patternKey,
    title: "Nhiều Project đang mở cùng lúc có thể đang làm bạn dàn trải",
    description: `Bạn có ${activeProjectIds.length} Project đang hoạt động; ${stalledProjectCount} trong số đó (${stallPercent}%) chưa có việc nào hoàn thành.`,
    confidenceClass: "possible_pattern",
    status: "candidate",
    evidenceSummary: { activeProjectCount: activeProjectIds.length, stalledProjectCount },
    proposedPreference: {
      key: "projects.max_primary_active",
      value: detection.proposedMaxActive,
      effect: `LifeOS sẽ nhắc bạn khi có hơn ${detection.proposedMaxActive} Project chính hoạt động cùng lúc, thay vì để bạn tự nhận ra sau khi đã dàn trải.`
    },
    createdAt: now
  });
}

export type ResolveInsightOutcome =
  | { status: "resolved"; insight: InsightView; preferenceId?: OperatingPreferenceId }
  | { status: "not_found" }
  | { status: "already_resolved" }
  | { status: "invalid_edited_value" };

export async function resolveInsight(
  database: DatabaseClient,
  userId: string,
  insightId: string,
  input: { resolution: InsightResolution; editedValue?: number },
  resolvedAt: Date
): Promise<ResolveInsightOutcome> {
  return database.db.transaction(async (transaction) => {
    const [insight] = await transaction
      .select()
      .from(schema.insights)
      .where(and(eq(schema.insights.userId, userId), eq(schema.insights.id, insightId)))
      .limit(1)
      .for("update");
    if (!insight) return { status: "not_found" };
    if (!UNRESOLVED_STATUSES.includes(insight.status as schema.InsightRow["status"])) return { status: "already_resolved" };

    const proposed = insight.proposedPreference as ProposedPreference | null;
    let preferenceId: OperatingPreferenceId | undefined;
    const newStatus = input.resolution === "confirm" ? "confirmed" : input.resolution === "partly_accurate" ? "corrected" : "rejected";

    if ((input.resolution === "confirm" || input.resolution === "partly_accurate") && proposed) {
      const value = input.resolution === "partly_accurate" && input.editedValue !== undefined ? input.editedValue : proposed.value;
      if (!isValidOperatingPreferenceValue(proposed.key, value)) return { status: "invalid_edited_value" };

      const [existing] = await transaction
        .select({ id: schema.operatingPreferences.id })
        .from(schema.operatingPreferences)
        .where(and(eq(schema.operatingPreferences.userId, userId), eq(schema.operatingPreferences.key, proposed.key)))
        .limit(1)
        .for("update");

      if (existing) {
        const [updated] = await transaction
          .update(schema.operatingPreferences)
          .set({ value, status: "active", sourceInsightId: insight.id, updatedAt: resolvedAt, source: "confirmed_insight" })
          .where(eq(schema.operatingPreferences.id, existing.id))
          .returning();
        preferenceId = updated?.id as OperatingPreferenceId;
      } else {
        const [created] = await transaction
          .insert(schema.operatingPreferences)
          .values({
            userId,
            key: proposed.key,
            value,
            source: "confirmed_insight",
            status: "active",
            sourceInsightId: insight.id,
            updatedAt: resolvedAt
          })
          .returning();
        preferenceId = created?.id as OperatingPreferenceId;
      }
    }

    const [updatedInsight] = await transaction
      .update(schema.insights)
      .set({ status: newStatus, resolvedAt })
      .where(eq(schema.insights.id, insight.id))
      .returning();
    if (!updatedInsight) throw new Error("Failed to resolve Insight");

    await transaction.insert(schema.lifeEvents).values({
      userId,
      type: "insight.resolved",
      source: "user",
      entityType: "insight",
      entityId: insight.id,
      payload: { patternKey: insight.patternKey, resolution: input.resolution, ...(preferenceId ? { preferenceId } : {}) },
      occurredAt: resolvedAt
    });

    return { status: "resolved", insight: toInsightView(updatedInsight), ...(preferenceId ? { preferenceId } : {}) };
  });
}
