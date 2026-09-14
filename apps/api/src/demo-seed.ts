import { seedDemoData, type DatabaseClient, type DemoSeedSummary } from "@lifeos/db";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

type DemoErrorView = { error: "unavailable" | "unauthenticated"; message: string };

/**
 * A first-run helper: fills the acting user's own account with a labelled demo week so the
 * screens can be explored before any real data exists. It never touches another user's rows
 * and refuses to run twice, so a real account is never overwritten.
 */
export function registerDemoSeedRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.post("/v1/demo/seed", async (request, reply): Promise<DemoSeedSummary | DemoErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "Demo storage is unavailable" };
    }

    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }

    return seedDemoData(database, userId);
  });
}
