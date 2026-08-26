import {
  generateNextActionRecommendation,
  readNowView,
  resolveNowRecommendation,
  type DatabaseClient
} from "@lifeos/db";
import type { NowView, ResolveNowRecommendationInput } from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TITLE_LENGTH = 500;
const MAX_DONE_CONDITION_LENGTH = 1_000;
const MAX_ESTIMATED_MINUTES = 480;

export type NowErrorView = {
  error: "unavailable" | "unauthenticated" | "invalid_request" | "not_found" | "invalid_status" | "invalid_action";
  message: string;
  currentStatus?: string;
};

export function registerNowRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.get("/v1/now", async (request, reply): Promise<NowView | NowErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "NOW storage is unavailable" };
    }

    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }

    return readNowView(database, userId, new Date());
  });

  app.post("/v1/now/refresh", async (request, reply): Promise<NowView | NowErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "NOW storage is unavailable" };
    }

    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }

    const now = new Date();
    await generateNextActionRecommendation(database, userId, now);
    return readNowView(database, userId, now);
  });

  app.post<{ Params: { recommendationId: string } }>(
    "/v1/now/recommendations/:recommendationId/resolve",
    async (request, reply): Promise<NowView | NowErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "NOW storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }
      if (!UUID_PATTERN.test(request.params.recommendationId)) {
        reply.code(400);
        return { error: "invalid_request", message: "recommendationId must be a UUID" };
      }

      const input = parseResolveInput(request.body);
      if (!input) {
        reply.code(400);
        return { error: "invalid_request", message: "NOW recommendation resolution does not match the B3 contract" };
      }

      const now = new Date();
      const result = await resolveNowRecommendation(
        database,
        userId,
        request.params.recommendationId,
        input,
        now
      );

      if (result.status === "not_found") {
        reply.code(404);
        return { error: "not_found", message: "NOW recommendation was not found" };
      }
      if (result.status === "invalid_status") {
        reply.code(409);
        return {
          error: "invalid_status",
          message: "NOW recommendation cannot be resolved from its current state",
          currentStatus: result.currentStatus
        };
      }
      if (result.status === "invalid_action") {
        reply.code(409);
        return { error: "invalid_action", message: "Recommendation no longer points to a valid owned Action" };
      }

      return readNowView(database, userId, now);
    }
  );
}

function parseResolveInput(value: unknown): ResolveNowRecommendationInput | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => key !== "resolution" && key !== "action")) return null;
  if (
    value.resolution !== "accepted" &&
    value.resolution !== "edited" &&
    value.resolution !== "not_now" &&
    value.resolution !== "wrong_assumption"
  ) {
    return null;
  }

  if (value.resolution !== "edited") {
    if (value.action !== undefined) return null;
    return { resolution: value.resolution };
  }

  if (!isRecord(value.action)) return null;
  if (Object.keys(value.action).some((key) => !["title", "doneCondition", "estimatedMinutes"].includes(key))) {
    return null;
  }
  if (Object.keys(value.action).length === 0) return null;

  const action: NonNullable<ResolveNowRecommendationInput["action"]> = {};
  if (value.action.title !== undefined) {
    if (!isRequiredText(value.action.title, MAX_TITLE_LENGTH)) return null;
    action.title = value.action.title;
  }
  if (value.action.doneCondition !== undefined) {
    if (value.action.doneCondition !== null && !isRequiredText(value.action.doneCondition, MAX_DONE_CONDITION_LENGTH)) {
      return null;
    }
    action.doneCondition = value.action.doneCondition;
  }
  if (value.action.estimatedMinutes !== undefined) {
    if (
      value.action.estimatedMinutes !== null &&
      (!Number.isInteger(value.action.estimatedMinutes) ||
        value.action.estimatedMinutes < 1 ||
        value.action.estimatedMinutes > MAX_ESTIMATED_MINUTES)
    ) {
      return null;
    }
    action.estimatedMinutes = value.action.estimatedMinutes;
  }

  return { resolution: "edited", action };
}

function isRequiredText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
