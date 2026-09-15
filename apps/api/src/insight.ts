import { listInsightCandidates, resolveInsight, type DatabaseClient } from "@lifeos/db";
import { INSIGHT_RESOLUTIONS, type InsightListView, type InsightResolution, type InsightView } from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

export type InsightErrorView = {
  error: "unavailable" | "unauthenticated" | "invalid_request" | "not_found" | "already_resolved" | "invalid_edited_value";
  message: string;
};

// Insight = "Pattern Candidate" (spec §13.4/§14.3, DOMAIN_MODEL_V1.md §16).
// Candidates are detected with deterministic threshold rules on read (no AI
// provider) and persisted so a rejection is never regenerated.
export function registerInsightRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.get("/v1/insights", async (request, reply): Promise<InsightListView | InsightErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "Insight storage is unavailable" };
    }

    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }

    const generatedAt = new Date();
    const candidates = await listInsightCandidates(database, userId, generatedAt);
    return { generatedAt: generatedAt.toISOString(), candidates };
  });

  app.post<{ Params: { insightId: string }; Body: { resolution?: string; editedValue?: number } }>(
    "/v1/insights/:insightId/resolve",
    async (request, reply): Promise<InsightView | InsightErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Insight storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const { resolution, editedValue } = request.body ?? {};
      if (typeof resolution !== "string" || !(INSIGHT_RESOLUTIONS as readonly string[]).includes(resolution)) {
        reply.code(400);
        return { error: "invalid_request", message: `resolution must be one of ${INSIGHT_RESOLUTIONS.join(", ")}` };
      }
      if (editedValue !== undefined && (typeof editedValue !== "number" || !Number.isInteger(editedValue))) {
        reply.code(400);
        return { error: "invalid_request", message: "editedValue must be an integer" };
      }

      const outcome = await resolveInsight(
        database,
        userId,
        request.params.insightId,
        { resolution: resolution as InsightResolution, ...(editedValue === undefined ? {} : { editedValue }) },
        new Date()
      );

      if (outcome.status === "not_found") {
        reply.code(404);
        return { error: "not_found", message: "This Insight no longer exists" };
      }
      if (outcome.status === "already_resolved") {
        reply.code(409);
        return { error: "already_resolved", message: "This Insight was already resolved" };
      }
      if (outcome.status === "invalid_edited_value") {
        reply.code(400);
        return { error: "invalid_edited_value", message: "editedValue is out of the allowed range for this preference" };
      }

      return outcome.insight;
    }
  );
}
