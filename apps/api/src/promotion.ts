import {
  confirmClarityPromotion,
  createClarityPromotionDraft,
  findCurrentDirection,
  findLatestCaptureInterpretation,
  resolveClarityPromotion,
  type DatabaseClient,
  type DirectionRow,
  type IncubatorItemRow,
  type PromotionNotNowItem,
  type SeasonRow
} from "@lifeos/db";
import {
  INCUBATOR_KINDS,
  type CaptureInterpretationContentV1,
  type ClarityPromotionDraftInput,
  type ClarityPromotionDraftView,
  type CurrentDirectionView,
  type DirectionId,
  type DirectionView,
  type IncubatorItemId,
  type IncubatorItemView,
  type RecommendationId,
  type SeasonId,
  type SeasonView
} from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TEXT = 2_000;
const MAX_TRADE_OFF_ITEMS = 50;

type PromotionErrorView = {
  error:
    | "unavailable"
    | "unauthenticated"
    | "invalid_id"
    | "invalid_promotion"
    | "not_found"
    | "interpretation_version_conflict"
    | "state_conflict"
    | "active_season_conflict"
    | "capture_already_promoted";
  message: string;
  latestVersion?: number;
};

type PromotionConfirmedView = CurrentDirectionView & {
  incubatorItems: IncubatorItemView[];
};

type PromotionResolutionView = {
  status: "rejected" | "not_now";
  incubatorItem?: IncubatorItemView;
};

export function registerPromotionRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.post<{ Params: { captureId: string } }>(
    "/v1/captures/:captureId/promotion/prepare",
    async (request, reply): Promise<ClarityPromotionDraftView | PromotionErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Clarity promotion storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const captureId = request.params.captureId;
      if (!UUID_PATTERN.test(captureId)) {
        reply.code(400);
        return { error: "invalid_id", message: "captureId must be a UUID" };
      }

      const parsed = parsePromotionDraftInput(request.body);
      if (!parsed) {
        reply.code(400);
        return { error: "invalid_promotion", message: "Promotion draft does not match the A4 contract" };
      }

      const latest = await findLatestCaptureInterpretation(database, userId, captureId);
      if (!latest) {
        reply.code(404);
        return { error: "not_found", message: "Capture has no interpretation to promote" };
      }
      if (latest.version !== parsed.interpretationVersion) {
        reply.code(409);
        return {
          error: "interpretation_version_conflict",
          message: "Interpretation changed; reload before making the trade-off",
          latestVersion: latest.version
        };
      }

      if (!tradeOffComesFromInterpretation(latest.content as CaptureInterpretationContentV1, parsed)) {
        reply.code(400);
        return {
          error: "invalid_promotion",
          message: "Active, Maintain and Not Now items must come from the interpretation being reviewed"
        };
      }

      const result = await createClarityPromotionDraft(database, {
        userId,
        captureId,
        interpretationVersion: parsed.interpretationVersion,
        activeText: parsed.activeText,
        maintainTexts: parsed.maintainTexts,
        notNowItems: parsed.notNowItems,
        direction: parsed.direction,
        season: parsed.season
      });

      if (result.status === "capture_not_found" || result.status === "interpretation_not_found") {
        reply.code(404);
        return { error: "not_found", message: "Capture or interpretation not found" };
      }
      if (result.status === "interpretation_version_conflict") {
        reply.code(409);
        return {
          error: "interpretation_version_conflict",
          message: "Interpretation changed before the draft was stored",
          latestVersion: result.latestVersion
        };
      }
      if (result.status === "capture_already_promoted") {
        reply.code(409);
        return { error: "capture_already_promoted", message: "This Capture has already been promoted" };
      }

      reply.code(201);
      return {
        recommendationId: result.recommendation.id as RecommendationId,
        captureId: captureId as ClarityPromotionDraftView["captureId"],
        interpretationVersion: parsed.interpretationVersion,
        direction: toDirectionView(result.direction),
        season: toSeasonView(result.season),
        activeText: parsed.activeText,
        maintainTexts: parsed.maintainTexts,
        notNowItems: parsed.notNowItems,
        recommendationStatus: "shown"
      };
    }
  );

  app.post<{ Params: { recommendationId: string } }>(
    "/v1/clarity-promotions/:recommendationId/confirm",
    async (request, reply): Promise<PromotionConfirmedView | PromotionErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Clarity promotion storage is unavailable" };
      }
      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }
      const recommendationId = request.params.recommendationId;
      if (!UUID_PATTERN.test(recommendationId)) {
        reply.code(400);
        return { error: "invalid_id", message: "recommendationId must be a UUID" };
      }

      const parsed = parseFinalPromotionInput(request.body);
      if (!parsed) {
        reply.code(400);
        return { error: "invalid_promotion", message: "Final Direction/Season does not match the A4 contract" };
      }

      const result = await confirmClarityPromotion(database, {
        userId,
        recommendationId,
        direction: parsed.direction,
        season: parsed.season
      });

      if (result.status === "not_found") {
        reply.code(404);
        return { error: "not_found", message: "Clarity promotion not found" };
      }
      if (result.status === "state_conflict" || result.status === "invalid_payload") {
        reply.code(409);
        return { error: "state_conflict", message: "This Clarity promotion is no longer confirmable" };
      }
      if (result.status === "active_season_conflict") {
        reply.code(409);
        return {
          error: "active_season_conflict",
          message: "An active Current Season already exists; change it intentionally before activating another"
        };
      }

      return {
        direction: toDirectionView(result.direction),
        season: toSeasonView(result.season),
        incubatorItems: result.incubatorItems.map(toIncubatorView)
      };
    }
  );

  for (const resolution of ["reject", "not-now"] as const) {
    app.post<{ Params: { recommendationId: string } }>(
      `/v1/clarity-promotions/:recommendationId/${resolution}`,
      async (request, reply): Promise<PromotionResolutionView | PromotionErrorView> => {
        reply.header("cache-control", "no-store");
        if (!database) {
          reply.code(503);
          return { error: "unavailable", message: "Clarity promotion storage is unavailable" };
        }
        const userId = await resolveActorUserId(request, database);
        if (!userId) {
          reply.code(401);
          return { error: "unauthenticated", message: "An active LifeOS session is required" };
        }
        const recommendationId = request.params.recommendationId;
        if (!UUID_PATTERN.test(recommendationId)) {
          reply.code(400);
          return { error: "invalid_id", message: "recommendationId must be a UUID" };
        }

        const result = await resolveClarityPromotion(
          database,
          userId,
          recommendationId,
          resolution === "reject" ? "rejected" : "not_now"
        );
        if (result.status === "not_found") {
          reply.code(404);
          return { error: "not_found", message: "Clarity promotion not found" };
        }
        if (result.status === "state_conflict" || result.status === "invalid_payload") {
          reply.code(409);
          return { error: "state_conflict", message: "This Clarity promotion has already been resolved" };
        }

        return result.incubatorItem
          ? { status: "not_now", incubatorItem: toIncubatorView(result.incubatorItem) }
          : { status: "rejected" };
      }
    );
  }

  app.get(
    "/v1/direction/current",
    async (request, reply): Promise<CurrentDirectionView | PromotionErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Direction storage is unavailable" };
      }
      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const current = await findCurrentDirection(database, userId);
      if (!current) {
        reply.code(404);
        return { error: "not_found", message: "No active Direction/Season exists" };
      }
      return { direction: toDirectionView(current.direction), season: toSeasonView(current.season) };
    }
  );
}

type FinalPromotionInput = Pick<ClarityPromotionDraftInput, "direction" | "season">;

function parsePromotionDraftInput(value: unknown): ClarityPromotionDraftInput | null {
  if (!isRecord(value)) return null;
  const allowed = ["interpretationVersion", "activeText", "maintainTexts", "notNowItems", "direction", "season"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) return null;
  if (!Number.isInteger(value.interpretationVersion) || (value.interpretationVersion as number) < 1) return null;
  if (!isText(value.activeText)) return null;
  if (!isStringArray(value.maintainTexts)) return null;
  const notNowItems = parseNotNowItems(value.notNowItems);
  if (!notNowItems) return null;
  const direction = parseDirection(value.direction);
  const season = parseSeason(value.season);
  if (!direction || !season) return null;
  if (value.maintainTexts.length + notNowItems.length > MAX_TRADE_OFF_ITEMS) return null;

  return {
    interpretationVersion: value.interpretationVersion as number,
    activeText: value.activeText as string,
    maintainTexts: value.maintainTexts as string[],
    notNowItems,
    direction,
    season
  };
}

function parseFinalPromotionInput(value: unknown): FinalPromotionInput | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => key !== "direction" && key !== "season")) return null;
  const direction = parseDirection(value.direction);
  const season = parseSeason(value.season);
  if (!direction || !season) return null;
  return { direction, season };
}

function parseDirection(value: unknown): ClarityPromotionDraftInput["direction"] | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => key !== "title" && key !== "description")) return null;
  if (!isText(value.title)) return null;
  if (value.description !== undefined && !isText(value.description, true)) return null;
  return value.description === undefined
    ? { title: value.title as string }
    : { title: value.title as string, description: value.description as string };
}

function parseSeason(value: unknown): ClarityPromotionDraftInput["season"] | null {
  if (!isRecord(value)) return null;
  const allowed = ["title", "purpose", "primaryFocusText", "startsOn", "targetEndsOn"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) return null;
  if (!isText(value.title) || !isText(value.purpose)) return null;
  if (value.primaryFocusText !== undefined && !isText(value.primaryFocusText, true)) return null;
  if (value.startsOn !== undefined && !isDate(value.startsOn)) return null;
  if (value.targetEndsOn !== undefined && !isDate(value.targetEndsOn)) return null;
  if (
    typeof value.startsOn === "string" &&
    typeof value.targetEndsOn === "string" &&
    value.targetEndsOn < value.startsOn
  ) return null;

  return {
    title: value.title as string,
    purpose: value.purpose as string,
    ...(value.primaryFocusText === undefined ? {} : { primaryFocusText: value.primaryFocusText as string }),
    ...(value.startsOn === undefined ? {} : { startsOn: value.startsOn as string }),
    ...(value.targetEndsOn === undefined ? {} : { targetEndsOn: value.targetEndsOn as string })
  };
}

function parseNotNowItems(value: unknown): PromotionNotNowItem[] | null {
  if (!Array.isArray(value) || value.length > MAX_TRADE_OFF_ITEMS) return null;
  const result: PromotionNotNowItem[] = [];
  for (const item of value) {
    if (!isRecord(item) || Object.keys(item).some((key) => key !== "text" && key !== "kind")) return null;
    if (!isText(item.text) || typeof item.kind !== "string" || !(INCUBATOR_KINDS as readonly string[]).includes(item.kind)) {
      return null;
    }
    result.push({ text: item.text as string, kind: item.kind as PromotionNotNowItem["kind"] });
  }
  return result;
}

function tradeOffComesFromInterpretation(
  content: CaptureInterpretationContentV1,
  draft: ClarityPromotionDraftInput
): boolean {
  const sourceItems = new Set(
    Object.values(content)
      .flat()
      .map((item) => item.text)
  );
  const selected = [draft.activeText, ...draft.maintainTexts, ...draft.notNowItems.map((item) => item.text)];
  if (new Set(selected).size !== selected.length) return false;
  return selected.every((text) => sourceItems.has(text));
}

function toDirectionView(row: DirectionRow): DirectionView {
  return {
    id: row.id as DirectionId,
    title: row.title,
    status: row.status as DirectionView["status"],
    ...(row.description === null ? {} : { description: row.description }),
    ...(row.sourceCaptureId === null ? {} : { sourceCaptureId: row.sourceCaptureId as NonNullable<DirectionView["sourceCaptureId"]> }),
    ...(row.confirmedAt === null ? {} : { confirmedAt: row.confirmedAt.toISOString() }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toSeasonView(row: SeasonRow): SeasonView {
  return {
    id: row.id as SeasonId,
    title: row.title,
    purpose: row.purpose,
    status: row.status as SeasonView["status"],
    ...(row.directionId === null ? {} : { directionId: row.directionId as DirectionId }),
    ...(row.startsOn === null ? {} : { startsOn: row.startsOn }),
    ...(row.targetEndsOn === null ? {} : { targetEndsOn: row.targetEndsOn }),
    ...(row.primaryFocusText === null ? {} : { primaryFocusText: row.primaryFocusText }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toIncubatorView(row: IncubatorItemRow): IncubatorItemView {
  return {
    id: row.id as IncubatorItemId,
    title: row.title,
    kind: row.kind as IncubatorItemView["kind"],
    status: row.status as IncubatorItemView["status"],
    ...(row.sourceCaptureId === null ? {} : { sourceCaptureId: row.sourceCaptureId as NonNullable<IncubatorItemView["sourceCaptureId"]> }),
    ...(row.notes === null ? {} : { notes: row.notes }),
    ...(row.revisitOn === null ? {} : { revisitOn: row.revisitOn }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown, allowBlank = false): value is string {
  return (
    typeof value === "string" &&
    value.length <= MAX_TEXT &&
    (allowBlank || value.trim().length > 0)
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= MAX_TRADE_OFF_ITEMS && value.every((item) => isText(item));
}

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
