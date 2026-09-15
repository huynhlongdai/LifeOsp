import { readMeOverview, type DatabaseClient } from "@lifeos/db";
import type { MeOverviewView } from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

export type MeErrorView = {
  error: "unavailable" | "unauthenticated";
  message: string;
};

// ME overview (spec §14.1) — V0 ships only "Current personal context" with
// real data; the rest of §14 (Operating Preferences, Pattern Candidates,
// Personalization status) is named in unavailableSections instead of
// fabricated.
export function registerMeRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.get("/v1/me", async (request, reply): Promise<MeOverviewView | MeErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "Personal context storage is unavailable" };
    }

    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }

    return readMeOverview(database, userId);
  });
}
