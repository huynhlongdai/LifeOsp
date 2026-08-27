import { and, desc, eq } from "drizzle-orm";
import type { FocusEndOutcome } from "@lifeos/domain";
import type { DatabaseClient } from "./index.js";
import * as schema from "./schema.js";

const NEXT_ACTION_CONTRACT = "next-action-recommendation-v0" as const;

export type StartFocusResult =
  | { status: "started"; focus: schema.FocusSessionRow; action: schema.ActionRow; recommendation: schema.RecommendationRow }
  | { status: "not_found" }
  | { status: "invalid_status"; currentStatus: string }
  | { status: "invalid_action" }
  | { status: "active_focus_exists" };

export type EndFocusResult =
  | { status: "ended"; focus: schema.FocusSessionRow; action: schema.ActionRow }
  | { status: "not_found" }
  | { status: "invalid_status"; currentStatus: string };

export type CaptureFocusDistractionResult =
  | { status: "captured"; capture: schema.CaptureRow; focus: schema.FocusSessionRow; action: schema.ActionRow }
  | { status: "not_found" }
  | { status: "invalid_status"; currentStatus: string };

export async function startFocusFromNowRecommendation(
  database: DatabaseClient,
  userId: string,
  recommendationId: string,
  startedAt: Date
): Promise<StartFocusResult> {
  return database.db.transaction(async (transaction) => {
    const [activeFocus] = await transaction
      .select()
      .from(schema.focusSessions)
      .where(and(eq(schema.focusSessions.userId, userId), eq(schema.focusSessions.status, "active")))
      .limit(1)
      .for("update");
    if (activeFocus) return { status: "active_focus_exists" };

    const [recommendation] = await transaction
      .select()
      .from(schema.recommendations)
      .where(
        and(
          eq(schema.recommendations.id, recommendationId),
          eq(schema.recommendations.userId, userId),
          eq(schema.recommendations.kind, "next_action")
        )
      )
      .limit(1)
      .for("update");
    if (!recommendation) return { status: "not_found" };
    if (recommendation.status !== "accepted" && recommendation.status !== "edited") {
      return { status: "invalid_status", currentStatus: recommendation.status };
    }

    const actionId = getRecommendationActionId(recommendation);
    if (!actionId) return { status: "invalid_action" };

    const [row] = await transaction
      .select({ action: schema.actions, outcome: schema.outcomes, project: schema.projects })
      .from(schema.actions)
      .innerJoin(
        schema.outcomes,
        and(eq(schema.actions.outcomeId, schema.outcomes.id), eq(schema.outcomes.userId, userId))
      )
      .leftJoin(
        schema.projects,
        and(eq(schema.actions.projectId, schema.projects.id), eq(schema.projects.userId, userId))
      )
      .where(and(eq(schema.actions.id, actionId), eq(schema.actions.userId, userId)))
      .limit(1)
      .for("update");
    if (!row || row.action.status !== "ready" || row.outcome.status !== "active") return { status: "invalid_action" };
    if (row.action.projectId !== null && (!row.project || row.project.status !== "active")) return { status: "invalid_action" };

    const [focus] = await transaction
      .insert(schema.focusSessions)
      .values({
        userId,
        actionId: row.action.id,
        recommendationId: recommendation.id,
        plannedMinutes: row.action.estimatedMinutes,
        status: "active",
        startedAt,
        updatedAt: startedAt
      })
      .returning();
    if (!focus) throw new Error("Failed to start FocusSession");

    await transaction.insert(schema.lifeEvents).values({
      userId,
      type: "focus.started",
      source: "user",
      entityType: "focus_session",
      entityId: focus.id,
      payload: {
        actionId: row.action.id,
        recommendationId: recommendation.id,
        plannedMinutes: focus.plannedMinutes
      },
      occurredAt: startedAt
    });

    return { status: "started", focus, action: row.action, recommendation };
  });
}

export async function endActiveFocus(
  database: DatabaseClient,
  userId: string,
  focusSessionId: string,
  outcome: FocusEndOutcome,
  endedAt: Date
): Promise<EndFocusResult> {
  return database.db.transaction(async (transaction) => {
    const [focus] = await transaction
      .select()
      .from(schema.focusSessions)
      .where(and(eq(schema.focusSessions.id, focusSessionId), eq(schema.focusSessions.userId, userId)))
      .limit(1)
      .for("update");
    if (!focus) return { status: "not_found" };
    if (focus.status !== "active") return { status: "invalid_status", currentStatus: focus.status };

    const [action] = await transaction
      .select()
      .from(schema.actions)
      .where(and(eq(schema.actions.id, focus.actionId), eq(schema.actions.userId, userId)))
      .limit(1)
      .for("update");
    if (!action) return { status: "not_found" };

    const [updatedFocus] = await transaction
      .update(schema.focusSessions)
      .set({ status: outcome, endedAt, updatedAt: endedAt })
      .where(and(eq(schema.focusSessions.id, focus.id), eq(schema.focusSessions.userId, userId)))
      .returning();
    if (!updatedFocus) throw new Error("Failed to end FocusSession");

    await transaction.insert(schema.lifeEvents).values({
      userId,
      type: `focus.${outcome}`,
      source: "user",
      entityType: "focus_session",
      entityId: focus.id,
      payload: { actionId: action.id, recommendationId: focus.recommendationId, outcome },
      occurredAt: endedAt
    });

    return { status: "ended", focus: updatedFocus, action };
  });
}

export async function captureFocusDistraction(
  database: DatabaseClient,
  userId: string,
  focusSessionId: string,
  rawText: string,
  capturedAt: Date
): Promise<CaptureFocusDistractionResult> {
  return database.db.transaction(async (transaction) => {
    const [focus] = await transaction
      .select()
      .from(schema.focusSessions)
      .where(and(eq(schema.focusSessions.id, focusSessionId), eq(schema.focusSessions.userId, userId)))
      .limit(1)
      .for("update");
    if (!focus) return { status: "not_found" };
    if (focus.status !== "active") return { status: "invalid_status", currentStatus: focus.status };

    const [action] = await transaction
      .select()
      .from(schema.actions)
      .where(and(eq(schema.actions.id, focus.actionId), eq(schema.actions.userId, userId)))
      .limit(1)
      .for("update");
    if (!action) return { status: "not_found" };

    const [capture] = await transaction
      .insert(schema.captures)
      .values({ userId, kind: "distraction", rawText, processingStatus: "unprocessed", createdAt: capturedAt })
      .returning();
    if (!capture) throw new Error("Failed to capture distraction");

    await transaction.insert(schema.lifeEvents).values({
      userId,
      type: "distraction.captured",
      source: "user",
      entityType: "capture",
      entityId: capture.id,
      payload: {
        focusSessionId: focus.id,
        actionId: action.id,
        recommendationId: focus.recommendationId,
        kind: "distraction"
      },
      occurredAt: capturedAt
    });

    return { status: "captured", capture, focus, action };
  });
}

export async function readFocusState(database: DatabaseClient, userId: string, generatedAt: Date) {
  const [active] = await database.db
    .select({ focus: schema.focusSessions, action: schema.actions })
    .from(schema.focusSessions)
    .innerJoin(schema.actions, and(eq(schema.focusSessions.actionId, schema.actions.id), eq(schema.actions.userId, userId)))
    .where(and(eq(schema.focusSessions.userId, userId), eq(schema.focusSessions.status, "active")))
    .orderBy(desc(schema.focusSessions.startedAt))
    .limit(1);
  if (active) return { state: "active" as const, generatedAt: generatedAt.toISOString(), focus: toFocusView(active.focus, active.action) };

  const [recent] = await database.db
    .select({ focus: schema.focusSessions, action: schema.actions })
    .from(schema.focusSessions)
    .innerJoin(schema.actions, and(eq(schema.focusSessions.actionId, schema.actions.id), eq(schema.actions.userId, userId)))
    .where(eq(schema.focusSessions.userId, userId))
    .orderBy(desc(schema.focusSessions.startedAt))
    .limit(1);
  if (recent) return { state: "recent" as const, generatedAt: generatedAt.toISOString(), focus: toFocusView(recent.focus, recent.action) };

  return { state: "none" as const, generatedAt: generatedAt.toISOString() };
}

export function toFocusView(focus: schema.FocusSessionRow, action: schema.ActionRow) {
  return {
    id: focus.id,
    actionId: focus.actionId,
    ...(focus.recommendationId === null ? {} : { recommendationId: focus.recommendationId }),
    status: focus.status,
    ...(focus.plannedMinutes === null ? {} : { plannedMinutes: focus.plannedMinutes }),
    startedAt: focus.startedAt.toISOString(),
    ...(focus.endedAt === null ? {} : { endedAt: focus.endedAt.toISOString() }),
    action: {
      id: action.id,
      title: action.title,
      ...(action.doneCondition === null ? {} : { doneCondition: action.doneCondition })
    }
  };
}

function getRecommendationActionId(recommendation: schema.RecommendationRow): string | null {
  if (recommendation.proposedEntityType !== "action" || !isRecord(recommendation.proposedEntityPayload)) return null;
  const payload = recommendation.proposedEntityPayload;
  if (payload.contract !== NEXT_ACTION_CONTRACT || typeof payload.actionId !== "string") return null;
  return payload.actionId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
