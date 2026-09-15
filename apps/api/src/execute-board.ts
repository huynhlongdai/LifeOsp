import { readExecuteBoard, type DatabaseClient } from "@lifeos/db";
import type { ExecuteBoardView } from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

export type ExecuteBoardErrorView = {
  error: "unavailable" | "unauthenticated";
  message: string;
};

// Execute landing (spec §7.1): inspect execution structure without competing
// with NOW. Read-only — every write here already has its own owning route
// (confirm candidate via B1, result/blocked via B5, Get Unstuck for revive).
export function registerExecuteBoardRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.get("/v1/execute", async (request, reply): Promise<ExecuteBoardView | ExecuteBoardErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "Execute board storage is unavailable" };
    }

    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }

    return readExecuteBoard(database, userId);
  });
}
