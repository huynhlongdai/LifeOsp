import { and, desc, eq } from "drizzle-orm";
import type { DatabaseClient } from "./index.js";
import * as schema from "./schema.js";

export type PromotionNotNowItem = {
  text: string;
  kind: "idea" | "project_candidate" | "someday" | "reference";
};

export type CreateClarityPromotionDraftParams = {
  userId: string;
  captureId: string;
  interpretationVersion: number;
  activeText: string;
  maintainTexts: string[];
  notNowItems: PromotionNotNowItem[];
  direction: {
    title: string;
    description?: string;
  };
  season: {
    title: string;
    purpose: string;
    primaryFocusText?: string;
    startsOn?: string;
    targetEndsOn?: string;
  };
};

type PromotionPayload = {
  contract: "clarity-promotion-v1";
  captureId: string;
  interpretationVersion: number;
  directionId: string;
  seasonId: string;
  activeText: string;
  maintainTexts: string[];
  notNowItems: PromotionNotNowItem[];
};

export type CreateClarityPromotionDraftResult =
  | {
      status: "created";
      direction: schema.DirectionRow;
      season: schema.SeasonRow;
      recommendation: schema.RecommendationRow;
    }
  | { status: "capture_not_found" }
  | { status: "interpretation_not_found" }
  | { status: "interpretation_version_conflict"; latestVersion: number }
  | { status: "capture_already_promoted" };

export async function createClarityPromotionDraft(
  database: DatabaseClient,
  params: CreateClarityPromotionDraftParams
): Promise<CreateClarityPromotionDraftResult> {
  return database.db.transaction(async (transaction) => {
    const [capture] = await transaction
      .select({ id: schema.captures.id, processingStatus: schema.captures.processingStatus })
      .from(schema.captures)
      .where(and(eq(schema.captures.id, params.captureId), eq(schema.captures.userId, params.userId)))
      .limit(1)
      .for("update");

    if (!capture) return { status: "capture_not_found" };
    if (capture.processingStatus === "promoted") return { status: "capture_already_promoted" };

    const [latest] = await transaction
      .select({ id: schema.captureInterpretations.id, version: schema.captureInterpretations.version })
      .from(schema.captureInterpretations)
      .where(
        and(
          eq(schema.captureInterpretations.captureId, params.captureId),
          eq(schema.captureInterpretations.userId, params.userId)
        )
      )
      .orderBy(desc(schema.captureInterpretations.version))
      .limit(1);

    if (!latest) return { status: "interpretation_not_found" };
    if (latest.version !== params.interpretationVersion) {
      return { status: "interpretation_version_conflict", latestVersion: latest.version };
    }

    const now = new Date();
    const [direction] = await transaction
      .insert(schema.directions)
      .values({
        userId: params.userId,
        title: params.direction.title,
        ...(params.direction.description === undefined ? {} : { description: params.direction.description }),
        status: "draft",
        sourceCaptureId: params.captureId,
        updatedAt: now
      })
      .returning();
    if (!direction) throw new Error("Failed to create Direction draft");

    const [season] = await transaction
      .insert(schema.seasons)
      .values({
        userId: params.userId,
        directionId: direction.id,
        title: params.season.title,
        purpose: params.season.purpose,
        ...(params.season.primaryFocusText === undefined
          ? {}
          : { primaryFocusText: params.season.primaryFocusText }),
        ...(params.season.startsOn === undefined ? {} : { startsOn: params.season.startsOn }),
        ...(params.season.targetEndsOn === undefined ? {} : { targetEndsOn: params.season.targetEndsOn }),
        status: "draft",
        updatedAt: now
      })
      .returning();
    if (!season) throw new Error("Failed to create Season draft");

    const payload: PromotionPayload = {
      contract: "clarity-promotion-v1",
      captureId: params.captureId,
      interpretationVersion: params.interpretationVersion,
      directionId: direction.id,
      seasonId: season.id,
      activeText: params.activeText,
      maintainTexts: params.maintainTexts,
      notNowItems: params.notNowItems
    };

    const [recommendation] = await transaction
      .insert(schema.recommendations)
      .values({
        userId: params.userId,
        kind: "direction",
        title: params.direction.title,
        rationale: "This draft reflects the trade-off you just reviewed in Clarity Reset.",
        confidenceClass: "direct",
        status: "shown",
        proposedEntityType: "clarity_promotion",
        proposedEntityPayload: payload,
        shownAt: now
      })
      .returning();
    if (!recommendation) throw new Error("Failed to create Clarity promotion recommendation");

    await transaction.insert(schema.recommendationEvidence).values({
      recommendationId: recommendation.id,
      evidenceType: "capture_interpretation",
      entityType: "capture_interpretation",
      entityId: latest.id,
      label: "User-reviewed Clarity interpretation",
      valueJson: {
        captureId: params.captureId,
        interpretationVersion: params.interpretationVersion,
        activeCount: 1,
        maintainCount: params.maintainTexts.length,
        notNowCount: params.notNowItems.length
      },
      strength: "direct"
    });

    await transaction.insert(schema.lifeEvents).values([
      {
        userId: params.userId,
        type: "direction.draft.created",
        source: "user",
        entityType: "direction",
        entityId: direction.id,
        payload: { sourceCaptureId: params.captureId, status: "draft" }
      },
      {
        userId: params.userId,
        type: "season.draft.created",
        source: "user",
        entityType: "season",
        entityId: season.id,
        payload: { directionId: direction.id, status: "draft" }
      },
      {
        userId: params.userId,
        type: "recommendation.shown",
        source: "system",
        entityType: "recommendation",
        entityId: recommendation.id,
        payload: {
          kind: "direction",
          sourceCaptureId: params.captureId,
          interpretationVersion: params.interpretationVersion,
          confidenceClass: "direct"
        }
      }
    ]);

    return { status: "created", direction, season, recommendation };
  });
}

export type FinalizeClarityPromotionParams = {
  userId: string;
  recommendationId: string;
  direction: {
    title: string;
    description?: string;
  };
  season: {
    title: string;
    purpose: string;
    primaryFocusText?: string;
    startsOn?: string;
    targetEndsOn?: string;
  };
};

export type FinalizeClarityPromotionResult =
  | {
      status: "confirmed";
      direction: schema.DirectionRow;
      season: schema.SeasonRow;
      incubatorItems: schema.IncubatorItemRow[];
    }
  | { status: "not_found" }
  | { status: "state_conflict" }
  | { status: "invalid_payload" }
  | { status: "active_season_conflict" };

export async function confirmClarityPromotion(
  database: DatabaseClient,
  params: FinalizeClarityPromotionParams
): Promise<FinalizeClarityPromotionResult> {
  return database.db.transaction(async (transaction) => {
    await transaction
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, params.userId))
      .limit(1)
      .for("update");

    const [recommendation] = await transaction
      .select()
      .from(schema.recommendations)
      .where(
        and(
          eq(schema.recommendations.id, params.recommendationId),
          eq(schema.recommendations.userId, params.userId)
        )
      )
      .limit(1)
      .for("update");

    if (!recommendation) return { status: "not_found" };
    if (recommendation.status !== "shown") return { status: "state_conflict" };

    const payload = parsePromotionPayload(recommendation.proposedEntityPayload);
    if (!payload) return { status: "invalid_payload" };

    const [activeSeason] = await transaction
      .select({ id: schema.seasons.id })
      .from(schema.seasons)
      .where(and(eq(schema.seasons.userId, params.userId), eq(schema.seasons.status, "active")))
      .limit(1);
    if (activeSeason) return { status: "active_season_conflict" };

    const now = new Date();
    const [direction] = await transaction
      .update(schema.directions)
      .set({
        title: params.direction.title,
        description: params.direction.description ?? null,
        status: "active",
        confirmedAt: now,
        updatedAt: now
      })
      .where(and(eq(schema.directions.id, payload.directionId), eq(schema.directions.userId, params.userId)))
      .returning();
    if (!direction) return { status: "invalid_payload" };

    const [season] = await transaction
      .update(schema.seasons)
      .set({
        title: params.season.title,
        purpose: params.season.purpose,
        primaryFocusText: params.season.primaryFocusText ?? null,
        startsOn: params.season.startsOn ?? null,
        targetEndsOn: params.season.targetEndsOn ?? null,
        status: "active",
        updatedAt: now
      })
      .where(and(eq(schema.seasons.id, payload.seasonId), eq(schema.seasons.userId, params.userId)))
      .returning();
    if (!season) return { status: "invalid_payload" };

    const incubatorItems = payload.notNowItems.length
      ? await transaction
          .insert(schema.incubatorItems)
          .values(
            payload.notNowItems.map((item) => ({
              userId: params.userId,
              sourceCaptureId: payload.captureId,
              title: item.text,
              kind: item.kind,
              status: "incubated" as const,
              updatedAt: now
            }))
          )
          .returning()
      : [];

    await transaction
      .update(schema.captures)
      .set({ processingStatus: "promoted" })
      .where(and(eq(schema.captures.id, payload.captureId), eq(schema.captures.userId, params.userId)));

    await transaction
      .update(schema.recommendations)
      .set({
        status: "accepted",
        title: params.direction.title,
        proposedEntityPayload: {
          ...payload,
          notNowItems: payload.notNowItems,
          finalDirectionTitle: params.direction.title,
          finalSeasonTitle: params.season.title
        },
        resolvedAt: now
      })
      .where(eq(schema.recommendations.id, recommendation.id));

    const events: schema.NewLifeEventRow[] = [
      {
        userId: params.userId,
        type: "direction.confirmed",
        source: "user",
        entityType: "direction",
        entityId: direction.id,
        payload: { sourceCaptureId: payload.captureId, status: "active" }
      },
      {
        userId: params.userId,
        type: "season.started",
        source: "user",
        entityType: "season",
        entityId: season.id,
        payload: { directionId: direction.id, status: "active" }
      },
      {
        userId: params.userId,
        type: "capture.promoted",
        source: "user",
        entityType: "capture",
        entityId: payload.captureId,
        payload: {
          directionId: direction.id,
          seasonId: season.id,
          incubatorItemCount: incubatorItems.length
        }
      },
      {
        userId: params.userId,
        type: "recommendation.accepted",
        source: "user",
        entityType: "recommendation",
        entityId: recommendation.id,
        payload: { kind: "direction", directionId: direction.id, seasonId: season.id }
      }
    ];

    for (const item of incubatorItems) {
      events.push({
        userId: params.userId,
        type: "incubator.item.created",
        source: "user",
        entityType: "incubator_item",
        entityId: item.id,
        payload: { sourceCaptureId: payload.captureId, kind: item.kind, status: "incubated" }
      });
    }
    await transaction.insert(schema.lifeEvents).values(events);

    return { status: "confirmed", direction, season, incubatorItems };
  });
}

export type ResolveClarityPromotionResult =
  | { status: "resolved"; incubatorItem?: schema.IncubatorItemRow }
  | { status: "not_found" }
  | { status: "state_conflict" }
  | { status: "invalid_payload" };

export async function resolveClarityPromotion(
  database: DatabaseClient,
  userId: string,
  recommendationId: string,
  resolution: "rejected" | "not_now"
): Promise<ResolveClarityPromotionResult> {
  return database.db.transaction(async (transaction) => {
    const [recommendation] = await transaction
      .select()
      .from(schema.recommendations)
      .where(and(eq(schema.recommendations.id, recommendationId), eq(schema.recommendations.userId, userId)))
      .limit(1)
      .for("update");

    if (!recommendation) return { status: "not_found" };
    if (recommendation.status !== "shown") return { status: "state_conflict" };
    const payload = parsePromotionPayload(recommendation.proposedEntityPayload);
    if (!payload) return { status: "invalid_payload" };

    const now = new Date();
    let incubatorItem: schema.IncubatorItemRow | undefined;
    if (resolution === "not_now") {
      [incubatorItem] = await transaction
        .insert(schema.incubatorItems)
        .values({
          userId,
          sourceCaptureId: payload.captureId,
          title: recommendation.title,
          notes: "Deferred from a user-reviewed Clarity Direction draft.",
          kind: "someday",
          status: "incubated",
          updatedAt: now
        })
        .returning();
      if (!incubatorItem) throw new Error("Failed to incubate deferred Clarity draft");

      await transaction
        .update(schema.captures)
        .set({ processingStatus: "promoted" })
        .where(and(eq(schema.captures.id, payload.captureId), eq(schema.captures.userId, userId)));
    }

    await transaction
      .delete(schema.seasons)
      .where(and(eq(schema.seasons.id, payload.seasonId), eq(schema.seasons.userId, userId), eq(schema.seasons.status, "draft")));
    await transaction
      .delete(schema.directions)
      .where(
        and(eq(schema.directions.id, payload.directionId), eq(schema.directions.userId, userId), eq(schema.directions.status, "draft"))
      );

    await transaction
      .update(schema.recommendations)
      .set({ status: resolution, resolvedAt: now })
      .where(eq(schema.recommendations.id, recommendation.id));

    const events: schema.NewLifeEventRow[] = [
      {
        userId,
        type: resolution === "not_now" ? "recommendation.not_now" : "recommendation.rejected",
        source: "user",
        entityType: "recommendation",
        entityId: recommendation.id,
        payload: { kind: "direction", sourceCaptureId: payload.captureId }
      }
    ];
    if (incubatorItem) {
      events.push(
        {
          userId,
          type: "incubator.item.created",
          source: "user",
          entityType: "incubator_item",
          entityId: incubatorItem.id,
          payload: { sourceCaptureId: payload.captureId, kind: "someday", status: "incubated" }
        },
        {
          userId,
          type: "capture.promoted",
          source: "user",
          entityType: "capture",
          entityId: payload.captureId,
          payload: { incubatorItemId: incubatorItem.id }
        }
      );
    }
    await transaction.insert(schema.lifeEvents).values(events);

    return incubatorItem ? { status: "resolved", incubatorItem } : { status: "resolved" };
  });
}

export async function findCurrentDirection(
  database: DatabaseClient,
  userId: string
): Promise<{ direction: schema.DirectionRow; season: schema.SeasonRow } | null> {
  const [season] = await database.db
    .select()
    .from(schema.seasons)
    .where(and(eq(schema.seasons.userId, userId), eq(schema.seasons.status, "active")))
    .limit(1);
  if (!season?.directionId) return null;

  const [direction] = await database.db
    .select()
    .from(schema.directions)
    .where(and(eq(schema.directions.id, season.directionId), eq(schema.directions.userId, userId), eq(schema.directions.status, "active")))
    .limit(1);
  if (!direction) return null;

  return { direction, season };
}

function parsePromotionPayload(value: unknown): PromotionPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    record.contract !== "clarity-promotion-v1" ||
    typeof record.captureId !== "string" ||
    !Number.isInteger(record.interpretationVersion) ||
    typeof record.directionId !== "string" ||
    typeof record.seasonId !== "string" ||
    typeof record.activeText !== "string" ||
    !Array.isArray(record.maintainTexts) ||
    !record.maintainTexts.every((item) => typeof item === "string") ||
    !Array.isArray(record.notNowItems)
  ) {
    return null;
  }

  const notNowItems: PromotionNotNowItem[] = [];
  for (const item of record.notNowItems) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.text !== "string" || !isIncubatorKind(candidate.kind)) return null;
    notNowItems.push({ text: candidate.text, kind: candidate.kind });
  }

  return {
    contract: "clarity-promotion-v1",
    captureId: record.captureId,
    interpretationVersion: record.interpretationVersion as number,
    directionId: record.directionId,
    seasonId: record.seasonId,
    activeText: record.activeText,
    maintainTexts: record.maintainTexts as string[],
    notNowItems
  };
}

function isIncubatorKind(value: unknown): value is PromotionNotNowItem["kind"] {
  return (
    value === "idea" ||
    value === "project_candidate" ||
    value === "someday" ||
    value === "reference"
  );
}
