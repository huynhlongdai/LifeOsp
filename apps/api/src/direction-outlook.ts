import { findDirectionOutlook, type DatabaseClient } from "@lifeos/db";
import { buildDirectionOutlook, type DirectionOutlookView } from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

type DirectionOutlookErrorView = { error: "unavailable" | "unauthenticated"; message: string };

export function registerDirectionOutlookRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.get("/v1/direction/outlook", async (request, reply): Promise<DirectionOutlookView | DirectionOutlookErrorView> => {
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
    return buildDirectionOutlook(await findDirectionOutlook(database, userId));
  });
}
